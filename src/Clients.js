import { Badge, OverlayTrigger, Table, Tooltip } from 'react-bootstrap';
import { Link } from 'react-router-dom';

export default function Clients(props) {
  return (
    <Table hover striped size="sm">
      <tbody>
        {props.clients.map((client, index) => {
          const selectedRow =
            props.showSelection &&
            client.id === props.selectedClientId;
          return (
            <tr key={client.id} className={selectedRow ? 'info' : ''}>
              {props.showSelection && (
                <td className='selectionColumn'>
                  {selectedRow ? (
                    <i className="bi bi-chevron-right"></i>
                  ) : (
                    ''
                  )}
                </td>
              )}
              <td
                onClick={() => {
                  if (props.onClientSelect) props.onClientSelect(client, index);
                }}
              >
                {`${client.name} `}
                {client.note ? (
                  <OverlayTrigger overlay={(<Tooltip>{client.note}</Tooltip>)}>
                    <Badge bg="secondary">note</Badge>
                  </OverlayTrigger>
                ) : (
                  ''
                )}
                <Badge
                  className={'float-end'}
                  pill
                  bg={'card-'+client.cardColor}
                >
                  {client.householdSize}
                </Badge>
              </td>
              <td className='editIcon'>
                <Link to={`/households/${client.householdId}`}>
                  <i class="bi bi-pencil-fill"></i>
                </Link>
              </td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}
