import { Button, Card, Col, Form, Row, Table } from 'react-bootstrap';
import { Component } from 'preact';
import { DateTime } from 'luxon';
import graphQL from './graphQL.js';

const ageBrackets = [2, 18, 54, 110];
function ageIndex(age) {
  // 1 past the ages array is a sentinal for unknown
  if (!Number.isInteger(age)) return ageBrackets.length;
  for (let i = 0; i < ageBrackets.length; i += 1) {
    if (age <= ageBrackets[i]) return i;
  }

  return ageBrackets.length;
}

const dataLabels = ['Duplicated', 'Unduplicated', 'Total'];
const ageLabels = [
  '0-2 Years',
  '3-18 Years',
  '19-54 Years',
  '55 Plus Years',
  'Unknown Years',
];
const frequencyLabels = ['Month', 'Quarter', 'Annual'];
const frequencyCounts = {
  Month: 12,
  Quarter: 4,
  Annual: 1,
};

function addArray(lhs, rhs) {
  const res = new Array(Math.max(lhs.length, rhs.length)).fill(0);
  [rhs, lhs].forEach(a => {
    a.forEach((v, i) => {
      res[i] += v;
    });
  });
  return res;
}

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

function joinHouseholdData(householdData, visits) {
  return visits
    .map(v => {
      const h = householdData.get(`${v.householdId}-${v.householdVersion}`);

      return h ? h.ageArray : [];
    })
    .reduce((acc, v) => {
      return addArray(acc, v);
    }, new Array(ageBrackets.length + 1).fill(0));
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

function sumArray(a) {
  return a.reduce((acc, v) => {
    return acc + v;
  }, 0);
}

function summarizeHousehold(household) {
  const clientBirthYears = household.clients.map(c => {
    return c.birthYear;
  });
  const thisYear = DateTime.now().year;
  const clientAges = clientBirthYears.map(birthYear => {
    const nBirthYear = Number.parseInt(birthYear, 10);
    return Number.isInteger(nBirthYear) ? thisYear - nBirthYear : null;
  });

  const ageArray = new Array(ageBrackets.length + 1).fill(0);

  clientAges.forEach(age => {
    const index = ageIndex(age);
    ageArray[index] += 1;
  });

  const retval = household;
  retval.ageArray = ageArray;
  return retval;
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
      cities: ['All'],
    };

    this.refreshData = this.refreshData.bind(this);
    this.setCity = this.setCity.bind(this);
    this.setFrequency = this.setFrequency.bind(this);
    this.setValue = this.setValue.bind(this);
    this.setYear = this.setYear.bind(this);
  }

  componentDidMount() {
    this.loadCities();
  }

  setCity(e) {
    this.setState({ city: e.target.value });
  }

  setFrequency(e) {
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

  setValue(e) {
    this.setState({ value: e.target.value });
  }

  setYear(e) {
    this.setState({ year: e.target.value });
  }

  loadCities() {
    const query = `{cities {name}}`;
    graphQL(query).then(json => {
      let cities = json.data.cities.map(c => c.name);

      cities = ['All', 'Bellevue + Unknown'].concat(cities);

      this.setState({ cities });
    });
  }

  loadData(value, year, freq) {
    const query = [`{firstVisitsForYear(year: ${year}) { householdId, date }}`];
    const freqCount = frequencyCounts[freq];
    const nMonths = 12 / freqCount;
    const firstMonth = (value - 1) * nMonths + 1;
    for (let i = 0; i < nMonths; i += 1) {
      query.push(`
{visitsForMonth(month: ${firstMonth + i}, year: ${year} )
  { householdId, householdVersion, date }
}
`);
    }

    const dataAvailable = query.map(q => {
      return graphQL(q);
    });
    Promise.all(dataAvailable).then(results => {
      const firstVisit = new Map(
        results.shift().data.firstVisitsForYear.map(v => {
          return [v.householdId, v.date];
        }),
      );
      let visits = results.reduce((acc, cv) => {
        return acc.concat(cv.data.visitsForMonth);
      }, []);
      const uniqueHouseholds = Object.fromEntries(
        visits.map(v => [`${v.householdId}-${v.householdVersion}`, 1]),
      );

      const householdQueries = Object.keys(uniqueHouseholds).map(key => {
        const [id, version] = key.split('-');
        return `{
          household(id: ${id}, version: ${version}) {
            id version city {name} clients { birthYear}
          }
        }`;
      });

      const householdsAvailable = householdQueries.map(q => {
        return graphQL(q);
      });

      Promise.all(householdsAvailable).then(values => {
        let householdData = values.map(result => {
          const { household } = result.data;
          return {
            id: household.id,
            version: household.version,
            city: household.city.name,
            clients: household.clients,
          };
        });

        // cut the households down to the specified cities
        if (this.state.city !== 'All') {
          const { city } = this.state;

          householdData = householdData.filter(h => {
            if (city === 'Bellevue + Unknown') {
              return h.city === 'Bellevue' || h.city === 'Unknown';
            }

            return h.city === city;
          });
        }

        householdData = new Map(
          householdData.map(v => {
            return [`${v.id}-${v.version}`, summarizeHousehold(v)];
          }),
        );

        if (this.state.city !== 'All') {
          // need to filter out the visits to the remaining households
          visits = visits.filter(v => {
            return householdData.has(`${v.householdId}-${v.householdVersion}`);
          });
        }

        const unduplicatedVisits = visits.filter(v => {
          return firstVisit.get(v.householdId) === v.date;
        });

        const unduplicatedHouseholdData = joinHouseholdData(
          householdData,
          unduplicatedVisits,
        );
        const allHouseholdData = joinHouseholdData(householdData, visits);

        const unduplicatedIndividuals = sumArray(unduplicatedHouseholdData);
        const totalIndividuals = sumArray(allHouseholdData);

        const ageRanges = {};
        ageLabels.forEach((v, i) => {
          ageRanges[v] = {};
          ageRanges[v].total = allHouseholdData[i];
          ageRanges[v].unduplicated = unduplicatedHouseholdData[i];
        });

        const data = {
          households: {
            unduplicated: unduplicatedVisits.length,
            total: visits.length,
          },
          individuals: {
            unduplicated: unduplicatedIndividuals,
            total: totalIndividuals,
          },
          ageRanges,
        };

        this.setState({ data });
      });
    });
  }

  refreshData() {
    this.loadData(this.state.value, this.state.year, this.state.frequency);
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

    const frequencies = arrayToOptions(frequencyLabels);

    const cities = arrayToOptions(this.state.cities);

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
                {cities}
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
