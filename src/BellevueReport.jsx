import { Button, Col, Form, Row, Table } from 'react-bootstrap';
import { Component } from 'preact';
import { DateTime } from 'luxon';
import graphQL from './graphQL.js';


const reportTabs = {
  Age: null,
  Counts: null,
  Disabled: null,
  'Speaks English': null,
  Gender: null,
  Homeless: null,
  Income: null,
  'Military Status': null,
  Race: null,
  Refugee: null,
};

const ageBreaks = [0, 6, 13, 18, 25, 35, 55, 75, 85];

function ageFuncBuilder(accumulator, currentValue, currentIndex) {
  const nextValue = (currentIndex + 1 < ageBreaks.length) ? ageBreaks[currentIndex+1] : -1;
  if (nextValue == -1) {
    accumulator.push( [`> ${currentValue}`, v => v.age && v.age >= currentValue]);
  } else {
    accumulator.push( [`${currentValue} - ${nextValue-1}`, v => v.age && v.age >= currentValue && v.age < nextValue]);
  }
  return accumulator;
}

const ageFuncs = ageBreaks.reduce( ageFuncBuilder, []);
ageFuncs.push( ['Unknown', () => true]);

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
  return (
    <Col xs={6}>
      <Table bordered size="sm">
        <tbody>{renderRows(data)}</tbody>
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
      reportTab: 'Counts',
    };

    this.refreshData = this.refreshData.bind(this);
    this.setReportTab= this.setReportTab.bind(this);
    this.setYear = this.setYear.bind(this);
  }

  componentDidMount() {
    this.loadCities();
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
      this.setState({ cityData });
    });
  }

  async loadData(year) {
    const results = await graphQL(`
      {clientVisitsForYear(year: ${year}) {cityId date householdId age}}`);

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

  aggregateCounts(clientVisits) {
    const data = [['City', 'Unduplicated Individuals']];

    data.push(...this.state.cityData
      .filter( c => c.break_out == 1)
      .map( c => {
        const count = clientVisits
          .filter( v => v.cityId == c.id)
          .length;
        return [c.name, count];
      }));

    const otherKC = this.state.cityData
      .filter( c => c.id != 0 && c.break_out == 0 && c.in_king_county == 1);
    data.push(['Other King County', clientVisits
      .filter( v => otherKC.some( c => c.id == v.cityId))
      .length]);

    const outsideKC = this.state.cityData
      .filter( c=> c.id != 0 && c.break_out == 0 && c.in_king_county == 0);
    data.push(['Outside King County', clientVisits
      .filter( v => outsideKC.some( c => c.id == v.cityId))
      .length]);

    data.push(['Unknown City', clientVisits.filter(v => v.cityId == 0).length]);

    return data;
  }

  dataCache = {};

  async aggregateData(year) {
    if (! this.dataCache[year] ) {
      this.dataCache[year] = await this.loadData(year);
    }

    const unduplicatedVisits = this.dataCache[year];


    const data = this.aggregateCounts(unduplicatedVisits);


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

    const tabs = arrayToOptions(Object.keys(reportTabs).sort());

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
