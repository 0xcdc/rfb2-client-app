import { Button, Col, ListGroup, Row } from 'react-bootstrap';
import { stubClient, stubHousehold } from './stubs';

import ClientDetailForm from './ClientDetailForm';
import { Component } from 'react';
import HouseholdDetailForm from './HouseholdDetailForm';
import { Link } from 'react-router-dom';
import TrackingObject from './TrackingObject';
import graphQL from './graphQL';
import { withIdleTimer } from 'react-idle-timer';

const IdleTimer = withIdleTimer( function() {});

class EditDetailForm extends Component {
  static isClientInvalid(key, value) {
    switch (key) {
      case 'name':
        if (value.length === 0) return 'Name cannot be blank';
        break;
      default:
        // ignore other keys for now
        break;
    }
    return false;
  }

  static newClientTO(client) {
    return new TrackingObject(
      client,
      EditDetailForm.isClientInvalid,
      'updateClient',
      'client',
    );
  }

  static clientVariant(trackingObject) {
    if (trackingObject.isInvalid()) {
      return 'danger';
    }
    if (trackingObject.hasChanges()) {
      return 'success';
    }
    return '';
  }

  constructor(props) {
    super(props);
    this.id = props.id;
    this.handleClientChange = this.handleClientChange.bind(this);
    this.handleClientDelete = this.handleClientDelete.bind(this);
    this.handleHouseholdChange = this.handleHouseholdChange.bind(this);
    this.handleNewClient = this.handleNewClient.bind(this);
    this.handleSave = this.handleSave.bind(this);
    this.handleTabSelect = this.handleTabSelect.bind(this);

    this.state = {
      isSaving: false,
      key: 'household',
      dataReady: false,
      firstSave: true,
    };
  }

  componentDidMount() {
    const householdQuery =
     `{household(id: ${this.id}) {
         id
         address1
         address2
         cityId
         zip
         incomeLevelId
         note
         clients {
           id
           name
           householdId
           genderId
           disabled
           refugeeImmigrantStatus
           ethnicityId
           raceId
           speaksEnglish
           militaryStatusId
           birthYear
         }
       }}`;

    const lookupQueries = [
      '{cities{id value:name}}',
      '{incomeLevels{id value}}',
      '{races{id value}}',
      '{genders{id value}}',
      '{militaryStatuses{id value}}',
      '{ethnicities{id value}}',
      '{yesNos{id value}}',
    ];

    const queries = lookupQueries;
    if (this.id !== -1) {
      lookupQueries.push(householdQuery);
    }

    const jsonCalls = queries.map(url => graphQL(url));

    Promise.all(jsonCalls).then(jsons => {
      let newState = { dataReady: true };
      jsons.forEach(json => {
        newState = { ...newState, ...json.data };
      });

      if (this.id === -1) {
        newState.household = stubHousehold();
      }

      const clients = newState.household.clients.map(c => {
        return { ...c };
      });
      const household = { ...newState.household };

      delete household.clients;

      this.householdTO = new TrackingObject(
        household,
        null,
        'updateHousehold',
        'household',
      );

      this.clientTOs = clients.map(c => {
        return EditDetailForm.newClientTO(c);
      });

      newState.household = this.householdTO.value;
      newState.clients = this.clientTOs.map(clientTO => {
        return clientTO.value;
      });

      this.allTOs = [this.householdTO].concat(this.clientTOs);

      this.setState(newState);
    });
  }

  getSaveState() {
    if (this.isFormInvalid()) return 'danger';
    if (this.state.isSaving) return 'info';
    if (this.hasChanges()) return 'success';
    return 'secondary';
  }

  getSaveString() {
    if (this.isFormInvalid()) return this.isFormInvalid();
    if (this.state.isSaving) return 'Saving Changes...';
    if (this.hasChanges()) return 'Save Changes';
    return 'Saved';
  }

  canSave() {
    return this.getSaveState() === 'success';
  }

  hasChanges() {
    return this.state.dataReady && this.allTOs.some(o => {
      return o.hasChanges();
    });
  }

  handleNewClient() {
    const newClient = stubClient(this.householdTO.value.id);
    const newTO = EditDetailForm.newClientTO(newClient);
    this.clientTOs.push(newTO);
    this.allTOs.push(newTO);
    this.setState({
      clients: this.clientTOs.map(clientTO => {
        return clientTO.value;
      }),
      key: newClient.id,
    });
  }

  handleHouseholdChange(obj, prop, value) {
    this.householdTO.value[prop] = value;
    this.setState({
      household: { ...this.householdTO.value },
    });
  }

  handleClientChange(obj, prop, value) {
    const i = this.clientTOs.findIndex(c => {
      return c.value.id === obj.id;
    });
    const c = this.clientTOs[i];
    c.value[prop] = value;
    this.clientTOs[i].value = { ...c.value };
    this.setState({
      clients: this.clientTOs.map(clientTO => {
        return clientTO.value;
      }),
    });
  }

  handleClientDelete(obj) {
    const i = this.clientTOs.findIndex(c => {
      return c.value.id === obj.id;
    });
    const deleteFinished = graphQL(`
      mutation{
        deleteClient(id:${obj.id}) {id}
      }`);
    deleteFinished.then(() => {
      this.clientTOs.splice(i, 1);
      this.setState({
        clients: this.clientTOs.map(clientTO => {
          return clientTO.value;
        }),
        key: 'household',
      });
    });
  }

  saveClients(household) {
    const householdID = household.id;
    this.householdTO.value = household;
    const clientSaves = this.clientTOs
      .filter(to => {
        return to.hasChanges();
      })
      .map(to => {
        const clientTO = to;
        clientTO.value.householdId = householdID;
        let clientSave = clientTO.saveChanges(graphQL, true);
        clientSave = clientSave.then(client => {
          clientTO.value = client;
        });
        return clientSave;
      });
    return Promise.all(clientSaves);
  }

  saveChanges() {
    let { key, firstSave } = this.state;
    const selectedClientTO = this.clientTOs.find(to => to.value.id === key);
    const isNewClient = this.householdTO.value.id === -1;

    let netOp = null;
    if (this.householdTO.hasChanges() || isNewClient || firstSave) {
      netOp = this.householdTO.saveChanges(graphQL, !firstSave);
      firstSave = false;
    } else {
      netOp = Promise.resolve(this.state.household);
    }

    if (isNewClient) {
      netOp = netOp.then( household => graphQL(`
          mutation{recordVisit(
            householdId: ${household.id}){date}}
        `).then( () => household));
    }

    netOp = netOp.then(household => {
      return this.saveClients(household);
    });

    netOp.finally(() => {
      // if we saved a new client we need to update the selected key to match it's new id
      if (selectedClientTO) {
        key = selectedClientTO.value.id;
      }

      const newState = {
        household: this.householdTO.value,
        isSaving: false,
        key,
        clients: this.clientTOs.map(clientTO => {
          return clientTO.value;
        }),
        firstSave,
      };

      this.setState(newState);
    });
  }

  handleSave() {
    // set the isSaving flag to true before anything
    if (this.hasChanges() && !this.isFormInvalid()) {
      this.setState({ isSaving: true }, this.saveChanges);
    }
  }

  handleTabSelect(key) {
    this.setState({
      key,
    });
  }

  isFormInvalid() {
    return this.state.dataReady && (
      this.isHouseholdInvalid() ||
      this.allTOs
        .map(o => {
          return o.isInvalid();
        })
        .find(v => v !== false) ||
      false
    );
  }

  isHouseholdInvalid() {
    if (this.state.dataReady && this.clientTOs.length === 0) {
      return 'You must have at least one client';
    }
    return false;
  }

  householdVariant() {
    if (!this.state.dataReady) {
      return '';
    }
    if (this.isHouseholdInvalid() || this.householdTO.isInvalid()) {
      return 'danger';
    }
    if (this.householdTO.hasChanges()) {
      return 'success';
    }
    return '';
  }

  render() {
    if (!this.state.dataReady) {
      return (<span/>);
    }
    const activeKey = this.state.key;
    const headerInfo = (
      <>
        <h1>
          <Link to="/">
            <i class="bi bi-house-door-fill"></i>
          </Link>
          <span className='title'>Review Household Information</span>
        </h1>
        <div className='text-end'>
          <Button
            variant={this.getSaveState()}
            onClick={this.handleSave}
            disabled={!this.canSave()}
          >
            {this.getSaveString()}
          </Button>
        </div>
      </>
    );
    const selectionColumn = (
      <ListGroup variant="flush" activeKey={activeKey}>
        <ListGroup.Item
          key="household"
          eventKey="household"
          action
          onClick={() => {
            this.handleTabSelect('household');
          }}
          variant={this.householdVariant()}
        >
          Household
        </ListGroup.Item>
        {this.clientTOs.map(to => {
          const c = to.value;
          let label = c.name;
          if (label.length < 1) label = 'Unnamed Client';
          return (
            <ListGroup.Item
              action
              key={c.id}
              eventKey={c.id}
              onClick={() => {
                this.handleTabSelect(c.id);
              }}
              variant={EditDetailForm.clientVariant(to)}
            >
              {label}
            </ListGroup.Item>
          );
        })}
        <ListGroup.Item
          action
          variant="secondary"
          onClick={this.handleNewClient}
          key="new client button"
          disabled={this.state.clients.some(c => {
            return c.id === -1;
          })}
        >
          Add a new client  <i class="bi bi-plus-lg"></i>
        </ListGroup.Item>
      </ListGroup>
    );

    let mainPane = null;

    if (activeKey === 'household') {
      mainPane = (
        <HouseholdDetailForm
          household={this.state.household}
          onChange={this.handleHouseholdChange}
          getValidationState={key => {
            return this.householdTO.getValidationState(key);
          }}
          cities={this.state.cities}
          incomeLevels={this.state.incomeLevels}
        />
      );
    } else {
      const clientTO = this.clientTOs.find(to => {
        return to.value.id === activeKey;
      });
      const client = clientTO.value;

      mainPane = (
        <ClientDetailForm
          client={client}
          onChange={this.handleClientChange}
          onDelete={this.handleClientDelete}
          getValidationState={key => {
            return clientTO.getValidationState(key);
          }}
          races={this.state.races}
          genders={this.state.genders}
          militaryStatuses={this.state.militaryStatuses}
          ethnicities={this.state.ethnicities}
          yesNos={this.state.yesNos}
        />
      );
    }

    return (
      <div>
        <IdleTimer timeout={1000} onIdle={this.handleSave}/>
        {headerInfo}
        <Row>
          <Col sm="2">{selectionColumn}</Col>
          <Col sm="10">{mainPane}</Col>
        </Row>
      </div>
    );
  }
}

export default EditDetailForm;
