import { Button, Card, Col, Form, Row, Table } from 'react-bootstrap';
import { DateTime, Duration } from 'luxon';
import { Component } from 'preact';
import graphQL from './graphQL.js';

const dataLabels = ['Duplicated', 'Unduplicated', 'Total'];

const ageFuncs = [
  ['0-2 Years', v => v.age && v.age <=2],
  ['3-18 Years', v => v.age > 2 && v.age <= 18],
  ['19-54 Years', v => v.age > 18 && v.age <= 54],
  ['55 Plus Years', v => v.age > 55],
  ['Unknown Years', () => true],
];

const frequencyCounts = {
  Month: 12,
  Quarter: 4,
  Annual: 1,
};

function arrayToOptions(arr) {
  return arr.map(v => {
    return (
      <option key={v} value={v}>
        {v}
      </option>
    );
  });
}

function getValue(label, values) {
  switch (label) {
    case 'Total':
      return values.total;
    case 'Duplicated':
      return values.total - values.unduplicated;
    case 'Unduplicated':
      return values.unduplicated;
    default:
      throw new Error('unrecognized label');
  }
}

function renderValues(values) {
  return dataLabels.map(k => {
    return (
      <tr key={k}>
        <td>{k}:</td>
        <td className='report_data'>{getValue(k, values)}</td>
      </tr>
    );
  });
}

function renderTable(label, values) {
  return (
    <Col xs={6}>
      <Card>
        <Card.Body>
          <Card.Title>{label}</Card.Title>
          <Table size="sm">
            <tbody>{renderValues(values)}</tbody>
          </Table>
        </Card.Body>
      </Card>
    </Col>
  );
}

class Report extends Component {
  constructor(props) {
    super(props);
    const now = DateTime.now();
    // you typically want the previous month
    const previousMonth = now.minus({ months: 1 });
    const { month, year } = previousMonth;
    this.state = {
      data: null,
      year,
      value: month,
      frequency: 'Month',
      city: 'All',
      cityNames: ['All'],
      cityLookup: [],
    };
  }

  componentDidMount() {
    this.loadCities();
  }

  setCity = e => {
    this.setState({ city: e.target.value });
  }

  setFrequency = e => {
    // set the value to be a reasonable default based on the frequency
    const now = DateTime.now();
    const frequency = e.target.value;
    let value;
    let year;
    if (frequency === 'Annual') {
      // set to the previous year
      const lastYear = now.minus({ years: 1 });
      ({ year } = lastYear);
      value = 1;
    } else if (frequency === 'Quarter') {
      // set to the previous quarter
      const lastQuarter = now.minus({ quarters: 1 });
      ({ year, quarter: value } = lastQuarter);
    } else if (frequency === 'Month') {
      const lastMonth = now.minus({ months: 1 });
      ({ year, month: value } = lastMonth);
    } else {
      throw new Error('unrecongnized frequency');
    }

    this.setState({
      frequency,
      year,
      value,
    });
  }

  setValue = e => {
    this.setState({ value: e.target.value });
  }

  setYear = e => {
    this.setState({ year: e.target.value });
  }

  loadCities() {
    const query = `{cities {id name}}`;
    graphQL(query).then(json => {
      const data = json.data.cities;
      let cityNames = data.map(c => c.name);
      cityNames = ['All', 'Bellevue + Unknown'].concat(cityNames);

      const cityLookup = Object.fromEntries(data.map( c => [c.name, c.id]));
      cityLookup['Unknown'] = 0;

      this.setState({ cityNames, cityLookup });
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

    return [clientVisits, firstVisitForHousehold];
  }

  dataCache = {};

  async aggregateData(value, year, freq) {
    if (! this.dataCache[year] ) {
      this.dataCache[year] = await this.loadData(year);
    }

    let [clientVisits, firstVisitForHousehold] = this.dataCache[year];

    // whacky math to get the first month based on value + frequency
    const freqCount = frequencyCounts[freq];
    const nMonths = 12 / freqCount;
    const firstMonth = (value - 1) * nMonths + 1;

    // get the first date (inclusive) & last date (exclusive)
    let firstDate = DateTime.fromObject({ year, month: firstMonth, day: 1 });
    const duration = Duration.fromObject(Object.fromEntries( [[freq == "Annual" ? "year" : freq, 1]]));
    let lastDate = firstDate.plus(duration);
    [firstDate, lastDate] = [firstDate, lastDate].map( v => v.toISODate());

    // filter the visits down to the selected date range
    clientVisits = clientVisits.filter( v => (v.date >= firstDate && v.date < lastDate));

    // filter the visits down to the selected cities
    if (this.state.city !== 'All') {
      const idsToKeep =
        (this.state.city === 'Bellevue + Unknown') ?
          [
            this.state.cityLookup['Bellevue'],
            this.state.cityLookup['Unknown'],
          ] :
          [this.state.cityLookup[this.state.city]];
      clientVisits = clientVisits.filter( v => idsToKeep.includes( v.cityId ));
    }

    // create a second list of the vist visit for each household ("unduplicated")
    const unduplicatedVisits = clientVisits.filter( v => v.date == firstVisitForHousehold[v.householdId]);

    // stub out the various age ranges
    const ageRanges = {};
    ageFuncs.forEach( ([label]) => {
      ageRanges[label] = {
        total: 0,
        unduplicated: 0
      };
    });


    const individuals = {};
    const households = { total: {}, unduplicated: {} };
    {
      const iterateOver = { unduplicated: unduplicatedVisits, total: clientVisits };
      Object.entries(iterateOver).forEach( ( [visitLabel, visits] ) => {
        visits.forEach(visit => {
          // iterate over the two types of visits and summerize into age ranges
          ageFuncs.some( ( [label, func] ) => {
            if (func(visit) ) {
              ageRanges[label][visitLabel] += 1;
              return true;
            }
          });

          // store each date / householdId under the label so we can count them later
          households[visitLabel][`${visit.date} ${visit.householdId}`] = 1;
        });

        // store the count of individuals under the label
        individuals[visitLabel] = visits.length;
      });
    }

    // count the unique date / householdIds
    Object.keys(households).forEach( k => {
      households[k] = Object.keys(households[k]).length;
    });

    const data = {
      households,
      individuals,
      ageRanges,
    };

    this.setState({ data });
  }

  refreshData = () => {
    this.aggregateData(this.state.value, this.state.year, this.state.frequency);
  }

  render() {
    const values = Array(frequencyCounts[this.state.frequency])
      .fill()
      .map((_, i) => {
        const m = i + 1;
        return (
          <option key={m} value={m}>
            {m}
          </option>
        );
      });

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

    const frequencies = arrayToOptions(Object.keys(frequencyCounts).sort());

    return (
      <div>
        <Form>
          <Row>
            <Col>
              <Form.Label>Report:</Form.Label>
            </Col>
            <Col>
              <Form.Select
                value={this.state.frequency}
                onChange={this.setFrequency}
              >
                {frequencies}
              </Form.Select>
            </Col>
            <Col>
              {this.state.frequency !== 'Annual' ? (
                <Form.Select
                  value={this.state.value}
                  onChange={this.setValue}
                >
                  {values}
                </Form.Select>
              ) : (
                ' '
              )}
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
              <Form.Select
                value={this.state.city}
                onChange={this.setCity}
              >
                { arrayToOptions(this.state.cityNames) }
              </Form.Select>
              {' '}
            </Col>
            <Col>
              <Button onClick={this.refreshData}>Refresh</Button>
            </Col>
          </Row>
        </Form>
        <br />
        {this.state.data && (
          <Card>
            <Row>
              {renderTable('Households Served:', this.state.data.households)}
              {renderTable('Clients Served:', this.state.data.individuals)}
            </Row>
            <Card>
              <Card.Body>
                <Card.Title>Age Ranges</Card.Title>
                {Object.keys(this.state.data.ageRanges).map(ar => {
                  return (
                    <Row key={ar}>
                      {renderTable(`${ar}:`, this.state.data.ageRanges[ar])}
                    </Row>
                  );
                })}
              </Card.Body>
            </Card>
          </Card>
        )}
      </div>
    );
  }
}

export default Report;
