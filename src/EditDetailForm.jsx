import { Button, CloseButton, Col, ListGroup, OverlayTrigger, Row, Tooltip } from 'react-bootstrap';
import { stubClient, stubHousehold } from './stubs.js';

import ClientDetailForm from './ClientDetailForm.jsx';
import { Component } from 'preact';
import HouseholdDetailForm from './HouseholdDetailForm.jsx';
import { Link } from 'react-router-dom';
import TrackingObject from './TrackingObject.js';
import graphQL from './graphQL.js';
import { withIdleTimer } from 'react-idle-timer';

const IdleTimer = withIdleTimer( () => {});

function LinkWithDisabled(props) {
  const { children, disabled, ...rest } = props;
  return disabled ?
    children :
    <Link {...rest} >
      { children }
    </Link>;
}

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
      needGeocode: false,
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
         latlng
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

  canLeave() {
    return this.getSaveState() === 'secondary';
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
    // if any of the address fields that affect location have changed then
    //   we need to recalulate latLng
    let { needGeocode } = this.state;
    switch (prop) {
      case 'latlng':
        needGeocode = false;
        break;
      case 'address1':
      case 'cityId':
      case 'zip':
        needGeocode = true;
        break;
    }

    this.setState({
      needGeocode,
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

  lookupLocation() {
    const values = Object.fromEntries(
      ['address1', 'cityId', 'zip'].map( prop => [
        prop, this.householdTO.value[prop]
      ]));

    // no address1, no geocode
    if ( !values.address1 ) {
      return Promise.resolve('');
    }

    if (values.cityId != 0) {
      const city = this.state.cities.find( city => city.id == values.cityId);
      values.cityName = city.value;
    } else {
      values.cityName = '';
    }

    const address = `${values.address1} ${values.cityName} ${values.zip}`;

    const request = {
      address,
      region: 'US',
    }

    console.log(`looking up ${address}`);
    const { Geocoder } = window.libraries.geocoding;
    const geocoder = new Geocoder();
    return geocoder
      .geocode( request )
      .then( result => {
        const { results } = result;
        const [firstResult] = results;

        if ( firstResult.partial_match ) {
          console.log('Partial match, ignoring');
          return '';
        }

        const { location } = firstResult.geometry;
        const latlng = JSON.stringify({
          lat: location.lat(),
          lng: location.lng(),
        });
        return latlng;
      })
      .catch( e => {
        console.log(`geocode failed with ${e}`);
        return '';
      });
  }

  saveChanges() {
    let { key, firstSave, needGeocode } = this.state;
    const selectedClientTO = this.clientTOs.find(to => to.value.id === key);
    const isNewClient = this.householdTO.value.id === -1;

    let netOp = Promise.resolve();
    if (this.householdTO.hasChanges() || isNewClient || firstSave) {
      if (needGeocode) {
        netOp = this.lookupLocation().then( latlng => {
          this.householdTO.value['latlng'] = latlng;
        });
        needGeocode = false;
      }

      netOp = netOp.then( () => this.householdTO.saveChanges(graphQL, !firstSave));
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
        needGeocode,
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
      return (<span />);
    }

    const activeKey = this.state.key;
    const headerInfo = (
      <>
        <Link to="/">
          <Button>
            Home <i className="bi bi-house-door-fill" />
          </Button>
        </Link>
        <div className='text-end'>
          <LinkWithDisabled disabled={!this.canLeave()} reloadDocument to="/households/-1">
            <OverlayTrigger delay={250} placement="auto" overlay={<Tooltip>Add a new Household</Tooltip>}>
              <Button variant={this.canLeave() ? "primary" : "secondary"}>
                <i class="bi bi-house-add" />
              </Button>
            </OverlayTrigger>
          </LinkWithDisabled>
          <Button
            variant={this.getSaveState()}
            onClick={this.handleSave}
            disabled={!this.canSave()}
          >
            {this.getSaveString()}
          </Button>
          <LinkWithDisabled disabled={!this.canLeave()} to="/">
            <CloseButton disabled={!this.canLeave()} />
          </LinkWithDisabled>
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
          <OverlayTrigger delay={250} position="auto" overlay={<Tooltip>Add a household member</Tooltip>}>
            <i class="bi bi-person-plus-fill" />
          </OverlayTrigger>
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
        <IdleTimer timeout={3000} onIdle={this.handleSave} />
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
