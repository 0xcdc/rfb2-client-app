import { Button, Table } from 'react-bootstrap';
import React, { Component } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle } from '@fortawesome/free-solid-svg-icons';

const numberOfVisitsToShow = 8;

class Visits extends Component {
  render() {
    const visitsToShow = this.props.visits
      .map(visit => {
        const dateparts = visit.date.split('-');
        // month is 0 based
        dateparts[1] -= 1;
        const date = new Date(...dateparts);
        return {
          id: visit.id,
          date,
        };
      })
      .sort((l, r) => {
        const cmp = r.date - l.date;
        return cmp;
      })
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
                  {visit.date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
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
