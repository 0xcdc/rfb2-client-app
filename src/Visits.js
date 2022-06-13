import { Button, Table } from 'react-bootstrap';
import { DateTime } from 'luxon';

export default function Visits(props) {
  const numberOfVisitsToShow = 8;

  const visitsToShow = props.visits
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
                    props.onDeleteVisit(visit.id);
                  }}
                >
                  <i class="bi bi-x-circle-fill xIcon"></i>
                </Button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}

