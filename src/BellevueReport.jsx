import { Button, Col, Form, Row, Table } from 'react-bootstrap';
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

    this.refreshData = this.refreshData.bind(this);
    this.setReportTab= this.setReportTab.bind(this);
    this.setYear = this.setYear.bind(this);
  }

  componentDidMount() {
    this.loadCities();
    this.loadLookups();
  }

  setYear(e) {
    this.setState({ year: e.target.value });
  }

  setReportTab(e) {
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
      'yesNos',
      'incomeLevels',
      'genders',
      'militaryStatuses',
      'races',
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
    const results = await graphQL(`
      {clientVisitsForYear(year: ${year}) {
        age cityId date disabled genderId householdId militaryStatusId raceId refugeeImmigrantStatus speaksEnglish
      }}`);

    const { clientVisitsForYear: clientVisits } = results.data;

    const firstVisitAccumulator = (acc, cur) => {
      if (! acc[cur.householdId]) {
        acc[cur.householdId] = cur.date;
      }
      return acc;
    };

    // build an object that maps householdId => first date the household visited
    const firstVisitForHousehold = clientVisits.reduce( firstVisitAccumulator, {} );

    // create a second list of the vist visit for each household ("unduplicated")
    const unduplicatedVisits = clientVisits.filter( v => v.date == firstVisitForHousehold[v.householdId]);

    return unduplicatedVisits;
  }

  aggregateByFunction(clientVisits, headers, func) {
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


    clientVisits.forEach( visit => {
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

  aggregateAges(clientVisits) {
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

  aggregateCounts(clientVisits) {
    const header= ['Unduplicated Individuals'];
    const countVisitsFunc = () => ({ 'Unduplicated Individuals': 1 });

    return this.aggregateByFunction(clientVisits, header, countVisitsFunc);
  }

  aggregateLookupTables(option, field, clientVisits) {
    const countVisitsFunc = visit => Object.fromEntries([[this.state[`${option}Lookup`][visit[field]], 1]]);
    const header = this.state[`${option}Labels`];
    return this.aggregateByFunction(clientVisits, header, countVisitsFunc);
  }

  reportTabs = {
    Age: this.aggregateAges.bind(this),
    Counts: this.aggregateCounts.bind(this),
    Disabled: this.aggregateLookupTables.bind(this, 'yesNos', 'disabled'),
    'Speaks English': this.aggregateLookupTables.bind(this, 'yesNos', 'speaksEnglish'),
    Gender: this.aggregateLookupTables.bind(this, 'genders', 'genderId'),
    Homeless: null, // this.aggregateLookupTables.bind(this, 'yesNos', 'homeless'),
    Income: null, // this.aggregateLookupTables.bind(this, 'incomeLevels', 'incomeLevelId'),
    'Military Status': this.aggregateLookupTables.bind(this, 'militaryStatuses', 'militaryStatusId'),
    Race: this.aggregateLookupTables.bind(this, 'races', 'raceId'),
    Refugee: this.aggregateLookupTables.bind(this, 'yesNos', 'refugeeImmigrantStatus'),
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

  refreshData() {
    this.aggregateData(this.state.year);
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
