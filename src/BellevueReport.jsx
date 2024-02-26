import { Button, Col, Form, Row, Table } from 'react-bootstrap';
import { utils, writeFileXLSX } from "xlsx";
import { Component } from 'preact';
import { DateTime } from 'luxon';
import graphQL from './graphQL.js';

function arrayToOptions(arr) {
  return arr.map(v => {
    return (
      <option key={v} value={v}>
        {v}
      </option>
    );
  });
}

function renderRows(data) {
  let [r, c] = [0, 0];
  return data.map( row => (<tr key={`row${r++}`}>{row.map( v => (<td key={`cell${c++}`}>{v}</td>))}</tr>));
}

function renderData(data) {
  const [headerRow, ...bodyData] = data;

  return (
    <Col xs={10}>
      <Table bordered striped hover size="sm" >
        <thead><tr>{headerRow.map( h => (<th key={`th-${h}`}>{h}</th>))}</tr></thead>
        <tbody>{renderRows(bodyData)}</tbody>
      </Table>
    </Col>
  );
}

class BellevueReport extends Component {
  constructor(props) {
    super(props);
    const now = DateTime.now();
    this.state = {
      data: null,
      year: now.month == 1 ? now.year -1 : now.year,
      cityData: null,
      cityLookup: null,
      reportTab: 'Counts',
    };
  }

  componentDidMount() {
    this.loadCities();
    this.loadLookups();
  }

  setYear = e => {
    this.setState({ year: e.target.value });
  }

  setReportTab = e => {
    this.setState({ reportTab: e.target.value });
  }

  loadCities() {
    const query = `{cities {id name break_out in_king_county}}`;
    graphQL(query).then(json => {
      const cityData = json.data.cities;
      const cityLookup = Object.fromEntries(cityData.map( c => [c.id, c]));
      this.setState({ cityData, cityLookup });
    });
  }

  async loadLookups() {
    const queries = [
      'genders',
      'incomeLevels',
      'militaryStatuses',
      'races',
      'yesNos',
    ].map( q => `{${q} {id value}}`);

    const requests = queries.map( q => graphQL(q));
    const results = await Promise.all(requests);
    results.forEach( r => {
      const { data } = r;
      const [name] = Object.keys(data);
      const valuePairs = data[name];
      const lookup = Object.fromEntries(valuePairs.map( e => [e.id, e.value]));
      const labels = name == 'yesNos' ? ['Unknown', 'Yes', 'No'] : valuePairs.map( e => e.value );
      // move unknown to the end
      labels.push(labels.shift());
      const stateToStore = Object.fromEntries([[`${name}Lookup`, lookup], [`${name}Labels`, labels]]);
      this.setState(stateToStore);
    });
  }

  async loadData(year) {
    const queries = [
      `{visitsForYear(year: ${year}) { date householdId }}`,
      `{historicalHouseholds {
          cityId startDate endDate id incomeLevelId address1 clients {
            birthYear disabled genderId militaryStatusId raceId refugeeImmigrantStatus speaksEnglish
          }
        }
       }`
    ];
    const requests = queries.map( q => graphQL(q));
    const results = await Promise.all(requests);

    const visits = results[0].data.visitsForYear;
    const households = results[1].data.historicalHouseholds;
    const householdMap = {};
    households.forEach( h => {
      householdMap[h.id] ??= [];
      householdMap[h.id].push(h);
    });

    // we want to augment the each visit with the associated household data
    let householdVisitsForYear = visits.map( v => {
      const { date, householdId } = v;
      const household = householdMap[householdId].find( h => date >= h.startDate && date < h.endDate);
      const { id, endDate, startDate, address1, ...householdData } = household;
      const homeless = address1 == '' ? 1 : 0;
      return {
        date,
        householdId,
        homeless,
        ...householdData,
      };
    });


    // build an object that maps householdId => first date the household visited
    const firstVisitAccumulator = (acc, cur) => {
      if (! acc[cur.householdId]) {
        acc[cur.householdId] = cur.date;
      }
      return acc;
    };
    const firstVisitForHousehold = householdVisitsForYear.reduce( firstVisitAccumulator, {} );

    // first push the household data down into the client visits
    const clientVisitsForYear = householdVisitsForYear
      .flatMap( hv => {
        const { clients, address1, ...householdData } = hv;

        return clients.map( c => {
          // we also need to convert birthYear into age @ visit
          const birthYear = parseInt(c.birthYear, 10);
          const visitYear = DateTime.fromISO(hv.date).year;

          const age =
            isNaN(birthYear) ||
            birthYear < 1900 ||
            birthYear > visitYear ?
              null :
              visitYear - birthYear;

          return {
            ...c,
            ...householdData,
            age,
          };
        });
      });

    // now strip off the clients from the households
    householdVisitsForYear = householdVisitsForYear.map( hv => {
      const { clients, ...householdData } = hv;
      return {
        ...householdData,
      };
    });

    // and then filter by first visit to get "unduplicated"
    const [clientVisits, householdVisits] = [clientVisitsForYear, householdVisitsForYear]
      .map( visits => visits.filter( v => v.date == firstVisitForHousehold[v.householdId]));

    return { clientVisits, householdVisits };
  }

  aggregateByFunction(visits, headers, func) {
    const rollupKeys = [...this.state.cityData
      .filter(c => c.break_out)
      .map(c => c.name),
    'Other King County',
    'Outside King County',
    'Unknown'];

    // stub out a full grid of key + headers with 0 values
    const data = Object.fromEntries(
      rollupKeys.map( rollupKey =>
        [rollupKey, Object.fromEntries( headers.map( h => [h, 0]))]));


    visits.forEach( visit => {
      const city = this.state.cityLookup[visit.cityId];
      const rollupKey = city.id == 0 ? "Unknown" :
        city.break_out ? city.name :
          city.in_king_county ? "Other King County" :
            "Outside King County";

      const value = func(visit);
      Object.keys(value).forEach( valueKey => {
        data[rollupKey][valueKey] += value[valueKey];
      });
    });

    const grid = [['City', ...headers]];
    rollupKeys.forEach( rollupKey => {
      const row = [rollupKey];
      row.push(... headers.map( h => data[rollupKey][h]));
      grid.push(row);
    });

    return grid;
  }

  aggregateAges({ clientVisits }) {
    const ageBreaks = [0, 6, 13, 18, 25, 35, 55, 75, 85];

    function ageFuncBuilder(accumulator, currentValue, currentIndex) {
      const nextValue = (currentIndex + 1 < ageBreaks.length) ? ageBreaks[currentIndex+1] : -1;
      if (nextValue == -1) {
        accumulator.push( [`> ${currentValue}`, v => v.age && v.age >= currentValue]);
      } else {
        accumulator.push(
          [`${currentValue} - ${nextValue-1}`, v => v.age && v.age >= currentValue && v.age < nextValue]
        );
      }
      return accumulator;
    }

    const ageFuncs = ageBreaks.reduce( ageFuncBuilder, []);
    ageFuncs.push( ['Unknown', () => true]);

    const header = ageFuncs.map( f => f[0]);
    const countAgesFunc = visit => Object.fromEntries([
      [ageFuncs.find( f => f[1](visit))[0], 1]
    ]);

    return this.aggregateByFunction(clientVisits, header, countAgesFunc);
  }

  aggregateCounts( visits ) {
    const headers = ['Unduplicated Households', 'Unduplicated Individuals'];
    const input = [visits.householdVisits, visits.clientVisits];

    const data = headers.map( (header, index) => {
      const countVisitsFunc = () => Object.fromEntries([[header, 1]]);
      return this.aggregateByFunction(input[index], headers, countVisitsFunc);
    });

    // combine the results into a single returnDataset
    return data[0].map( (_, rowNum) => {
      const [city, householdCount] = data[0][rowNum];
      const [, , clientCount] = data[1][rowNum];
      return [city, householdCount, clientCount];
    });
  }

  aggregateLookupTables(option, field, visitTag, visits) {
    const countVisitsFunc = visit => Object.fromEntries([[this.state[`${option}Lookup`][visit[field]], 1]]);
    const header = this.state[`${option}Labels`];
    visits = visits[visitTag];
    return this.aggregateByFunction(visits, header, countVisitsFunc);
  }

  reportTabs = {
    Age: this.aggregateAges.bind(this),
    Counts: this.aggregateCounts.bind(this),
    Disabled: this.aggregateLookupTables.bind(this, 'yesNos', 'disabled', 'clientVisits'),
    'Speaks English': this.aggregateLookupTables.bind(this, 'yesNos', 'speaksEnglish', 'clientVisits'),
    Gender: this.aggregateLookupTables.bind(this, 'genders', 'genderId', 'clientVisits'),
    Homeless: this.aggregateLookupTables.bind(this, 'yesNos', 'homeless', 'householdVisits'),
    Income: this.aggregateLookupTables.bind(this, 'incomeLevels', 'incomeLevelId', 'householdVisits'),
    'Military Status': this.aggregateLookupTables.bind(this, 'militaryStatuses', 'militaryStatusId', 'clientVisits'),
    Race: this.aggregateLookupTables.bind(this, 'races', 'raceId', 'clientVisits'),
    Refugee: this.aggregateLookupTables.bind(this, 'yesNos', 'refugeeImmigrantStatus', 'clientVisits'),
  };


  dataCache = {};

  async aggregateData(year) {
    if (! this.dataCache[year] ) {
      this.dataCache[year] = await this.loadData(year);
    }

    const unduplicatedVisits = this.dataCache[year];

    const aggFunc = this.reportTabs[this.state.reportTab];

    const data = aggFunc(unduplicatedVisits);


    this.setState({ data });
  }

  refreshData = () => {
    this.aggregateData(this.state.year);
  }

  saveWorksheet = async () => {
    const { year } = this.state;
    if (! this.dataCache[year] ) {
      this.dataCache[year] = await this.loadData(year);
    }
    const unduplicatedVisits = this.dataCache[year];

    const workbook = utils.book_new();
    Object.entries(this.reportTabs).forEach( ([label, aggFunc]) => {
      const data = aggFunc(unduplicatedVisits);
      const worksheet = utils.aoa_to_sheet(data);
      utils.book_append_sheet(workbook, worksheet, label);
    });

    writeFileXLSX(workbook, "Bellevue-EOY-Report.xlsx", { compression: true });
  }

  render() {
    const now = new Date();
    const years = Array(3)
      .fill()
      .map((_, i) => {
        const y = now.getFullYear() - i;
        return (
          <option key={y} value={y}>
            {y}
          </option>
        );
      });

    const tabs = arrayToOptions(Object.keys(this.reportTabs).sort());

    return (
      <div>
        <Form>
          <Row>
            <Col>
              <Form.Label>Report:</Form.Label>
            </Col>
            <Col>
              <Form.Select
                value={this.state.reportTab}
                onChange={this.setReportTab}
              >
                {tabs}
              </Form.Select>
            </Col>
            <Col>
              <Form.Select
                value={this.state.year}
                onChange={this.setYear}
              >
                {years}
              </Form.Select>
            </Col>
            <Col>
              <Button onClick={this.refreshData}>Refresh</Button>
              <Button onClick={this.saveWorksheet}>Save Worksheet</Button>
            </Col>
          </Row>
        </Form>
        <br />
        {this.state.data && (
          <Row>
            {renderData(this.state.data)}
          </Row>
        )}
      </div>
    );
  }
}

export default BellevueReport;
