import { Button, Col, Row, Table } from 'react-bootstrap';
import { utils, writeFileXLSX } from "xlsx";
import { Component } from 'preact';
import { DateTime } from 'luxon';
import graphQL from './graphQL.js';

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


class Data extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: null,
      cityData: null,
      cityLookup: null,
    };
  }

  componentDidMount() {
    this.loadCities();
  }

  loadCities() {
    const query = `{cities {id name break_out in_king_county}}`;
    graphQL(query).then(json => {
      const cityData = json.data.cities;
      const cityLookup = Object.fromEntries(cityData.map( c => [c.id, c]));
      this.setState({ cityData, cityLookup });
    });
  }

  async loadData() {
    const queries = [
      `{allVisits { date householdId }}`,
      `{historicalHouseholds {
          cityId startDate endDate id clients {
            id 
          }
        }
       }`
    ];
    const requests = queries.map( q => graphQL(q));
    const results = await Promise.all(requests);

    const visits = results[0].data.allVisits;
    const households = results[1].data.historicalHouseholds;
    const householdMap = {};
    households.forEach( h => {
      householdMap[h.id] ??= [];
      householdMap[h.id].push(h);
    });

    // we want to augment the each visit with the associated household data
    const householdVisits = visits.map( v => {
      const { date, householdId } = v;
      const { year } = DateTime.fromISO(date);
      const household = householdMap[householdId].find( h => date >= h.startDate && date < h.endDate);
      const { id, endDate, startDate, clients, ...householdData } = household;
      return {
        year,
        householdId,
        clientCount: clients.length,
        ...householdData,
      };
    });


    // we want to group by year, cityId, & householdId and
    // sum up # of visits and total # of clients the visits represent
    const groupBy = (acc, { year, cityId, householdId, clientCount }) => {
      acc[year] ??= {};
      acc[year][cityId] ??= {};
      acc[year][cityId][householdId] ??= {
        visits: 0,
        clientVisits: 0,
      };
      acc[year][cityId][householdId].visits += 1;
      acc[year][cityId][householdId].clientVisits += clientCount;
      return acc;
    };
    const aggregatedData = householdVisits.reduce( groupBy, {})

    const years = Object.keys(aggregatedData).sort();
    const cities = this.state.cityData
      .map( ({ id, name }) => ({ id, name }))
      .sort( (a, b) => a.name.localeCompare(b.name));

    const data = [['year', 'city', 'householdId', 'visits', 'clientVisits']];
    years.forEach( year => {
      cities.forEach( city => {
        const households = Object.keys(aggregatedData?.[year]?.[city.id] ?? {});
        households.forEach( h => {
          const { visits, clientVisits } = aggregatedData[year][city.id][h];
          data.push([year, city.name, h, visits, clientVisits]);
        });
      });
    });

    return data;
  }

  dataCache = null;

  refreshData = async () => {
    if (this.dataCache == null) {
      this.dataCache = await this.loadData();
    }

    const data = this.dataCache;
    this.setState({ data });
  }

  saveWorksheet = async () => {
    if (this.dataCache == null) {
      this.dataCache = await this.loadData();
    }

    const data = this.dataCache;

    const workbook = utils.book_new();
    const worksheet = utils.aoa_to_sheet(data);
    utils.book_append_sheet(workbook, worksheet, 'data');

    writeFileXLSX(workbook, "data.xlsx", { compression: true });
  }

  render() {
    return (
      <div>
        <Button onClick={this.refreshData}>Refresh</Button>
        <Button onClick={this.saveWorksheet}>Save Worksheet</Button>
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

export default Data;
