import { Button, Col, Form, Row, Table } from 'react-bootstrap';
import { Component } from 'preact';
import { DateTime } from 'luxon';
import ExcelJS from 'exceljs';
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
      `{clientVisitsForYear(year: ${year}) {
         age cityId date disabled genderId householdId militaryStatusId raceId refugeeImmigrantStatus speaksEnglish
       }}`,
      `{householdVisitsForYear(year: ${year}) {
         cityId date homeless householdId incomeLevelId
       }}`,
    ];

    const results = await Promise.all(queries.map( q => graphQL(q)));

    const names = ['clientVisitsForYear', 'householdVisitsForYear'];
    const [clientVisits, householdVisits] = names.map( (name, i) => {
      const visits = results[i].data[name];

      // build an object that maps householdId => first date the household visited
      const firstVisitAccumulator = (acc, cur) => {
        if (! acc[cur.householdId]) {
          acc[cur.householdId] = cur.date;
        }
        return acc;
      };
      const firstVisitForHousehold = visits.reduce( firstVisitAccumulator, {} );

      // create a second list of the first visit for each household ("unduplicated")
      const unduplicatedVisits = visits.filter( v => v.date == firstVisitForHousehold[v.householdId]);

      return unduplicatedVisits;
    });

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

  downloadToFile = (content, filename, contentType) => {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });

    a.href= URL.createObjectURL(file);
    a.download = filename;
    a.click();

    URL.revokeObjectURL(a.href);
  }

  saveWorksheet = async () => {
    const { year } = this.state;
    if (! this.dataCache[year] ) {
      this.dataCache[year] = await this.loadData(year);
    }

    const unduplicatedVisits = this.dataCache[year];

    const workbook = new ExcelJS.Workbook();
    Object.entries(this.reportTabs).forEach( ([label, aggFunc]) => {
      const worksheet = workbook.addWorksheet(label);
      const data = aggFunc(unduplicatedVisits);

      data.forEach( row => {
        worksheet.addRow(row);
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    this.downloadToFile(
      buffer,
      'Bellevue-EOY-Report.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
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
