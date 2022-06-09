import { Badge, OverlayTrigger, Table, Tooltip } from 'react-bootstrap';
import { faChevronRight, faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
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
                    <FontAwesomeIcon icon={faChevronRight} />
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
                    <Badge variant="secondary">note</Badge>
                  </OverlayTrigger>
                ) : (
                  ''
                )}
                <Badge
                  className="float-right"
                  pill
                  style={{
                    backgroundColor: client.cardColor,
                    color: client.cardColor === 'yellow' ? 'black' : 'white',
                  }}
                >
                  {client.householdSize}
                </Badge>
              </td>
              <td className='editIcon'>
                <Link to={`/households/${client.householdId}`}>
                  <FontAwesomeIcon
                    className='editIcon'
                    icon={faPencilAlt}
                  />
                </Link>
              </td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}
