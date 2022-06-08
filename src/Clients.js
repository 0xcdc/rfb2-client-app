import { Badge, OverlayTrigger, Table, Tooltip } from 'react-bootstrap';
import { faChevronRight, faPencilAlt } from '@fortawesome/free-solid-svg-icons';
import { Component } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link } from 'react-router-dom';

class Clients extends Component {
  render() {
    function tooltip(note) {
      return <Tooltip id="tooltip">{note}</Tooltip>;
    }

    return (
      <Table hover striped size="sm">
        <tbody>
          {this.props.clients.map((client, index) => {
            const selectedRow =
              this.props.showSelection &&
              client.id === this.props.selectedClientId;
            return (
              <tr key={client.id} className={selectedRow ? 'info' : ''}>
                {this.props.showSelection && (
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
                    if (this.props.onClientSelect) this.props.onClientSelect(client, index);
                  }}
                >
                  {`${client.name} `}
                  {client.note ? (
                    <OverlayTrigger overlay={tooltip(client.note)}>
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
}

export default Clients;
