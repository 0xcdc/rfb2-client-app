import { Button, Table } from 'react-bootstrap';
import { Component } from 'react';
import { DateTime } from 'luxon';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';

const numberOfVisitsToShow = 8;

class Visits extends Component {
  render() {
    const visitsToShow = this.props.visits
      .map(visit => ({
        id: visit.id,
        date: DateTime.fromISO(visit.date),
      }))
      .sort((l, r) => r.date - l.date)
      .slice(0, numberOfVisitsToShow);

    return (
      <Table hover striped size="sm">
        <thead>
          <tr>
            <th colSpan="2">Visits</th>
          </tr>
        </thead>
        <tbody>
          {visitsToShow.map(visit => {
            return (
              <tr key={`visit-${visit.id}`}>
                <td>
                  {visit.date.toISODate()}
                </td>
                <td className='IconColumn'>
                  <Button
                    variant="link"
                    className='xButton'
                    size="sm"
                    onClick={() => {
                      this.props.onDeleteVisit(visit.id);
                    }}
                  >
                    <FontAwesomeIcon className='xIcon' icon={faTimesCircle} />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    );
  }
}

export default Visits;
