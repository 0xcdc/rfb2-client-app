import { Button, CloseButton, Col, Dropdown, DropdownButton, ListGroup, OverlayTrigger, Row, Tooltip }
  from 'react-bootstrap';
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
        if (value.deleted) return false;
        if (value.name.length === 0) return 'Name cannot be blank';
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
    );
  }

  constructor(props) {
    super(props);

    this.state = {
      isSaving: false,
      key: 'household',
      dataReady: false,
      needGeocode: false,
      languageId: 0,
      languages: [{ name: 'English', id: 0 }],
      household: null,
      clients: [],
    };
  }

  componentDidMount() {
    const householdOperation = this.props.id == -1 ?
      'mutation { household:createNewHousehold' :
      `query { household(id: ${this.props.id})`;
    const queries = [
      `${householdOperation} {
         id
         address1
         address2
         cityId
         zip
         incomeLevelId
         location {
           lat
           lng
         }
         note
         clients {
           id
           name
           genderId
           disabled
           refugeeImmigrantStatus
           ethnicityId
           raceId
           speaksEnglish
           militaryStatusId
           birthYear
           phoneNumber
         }
       }}`,
      '{cities{id value:name}}',
      '{languages{id name}}',
    ];

    const jsonCalls = queries.map(url => graphQL(url));

    Promise.all(jsonCalls).then(jsons => {
      let newState = { dataReady: true };
      jsons.forEach(json => {
        newState = { ...newState, ...json.data };
      });

      const clients = newState.household.clients.map(c => {
        return { ...c };
      });
      const household = { ...newState.household };

      delete household.clients;

      this.householdTO = new TrackingObject(
        household,
        this.isHouseholdInvalid,
      );

      this.clientTOs = clients.map(c => EditDetailForm.newClientTO(c));

      newState.household = this.householdTO.value;
      newState.clients = this.clientTOs.map(clientTO => clientTO.value);

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
    return this.state.dataReady && this.allTOs.some(o => o.hasChanges());
  }

  handleNewClient = async () => {
    const query = `
mutation {
  client:createNewClient {
    id
    name
    genderId
    disabled
    refugeeImmigrantStatus
    ethnicityId
    raceId
    speaksEnglish
    militaryStatusId
    birthYear
    phoneNumber
  }
}`;

    const response = await graphQL(query);
    const newClient = response.data.client;
    const newTO = EditDetailForm.newClientTO(newClient);
    this.clientTOs.push(newTO);
    this.allTOs.push(newTO);
    this.setState({
      clients: this.clientTOs.map(clientTO => clientTO.value),
      key: newClient.id,
    });
  }

  handleHouseholdChange = (obj, prop, value) => {
    let { needGeocode } = this.state;
    if (prop == "addressAutoComplete") {
      Object.keys(value).forEach( key => {
        this.householdTO.value[key] = value[key];
      });
      needGeocode = false;
    } else {
      this.householdTO.value[prop] = value;
      // if any of the address fields that affect location have changed then
      //   we need to recalulate location
      switch (prop) {
        case 'location':
          needGeocode = false;
          break;
        case 'address1':
        case 'cityId':
        case 'zip':
          needGeocode = true;
          break;
      }
    }

    this.setState({
      needGeocode,
      household: { ...this.householdTO.value },
    });
  }

  handleClientChange = (obj, prop, value) => {
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

  handleClientDelete = obj => {
    // mark the object as deleted
    this.clientTOs.find(c => c.value.id === obj.id).value.deleted = true;
    this.setState({ key: 'household' });
  }

  handleClientRestore = obj => {
    // mark the object as deleted
    delete obj.deleted;
    this.setState({ key: obj.id });
  }

  lookupLocation() {
    const values = Object.fromEntries(
      ['address1', 'cityId', 'zip'].map( prop => [prop, this.householdTO.value[prop]])
    );

    // no address1, no geocode
    if ( !values.address1 ) {
      return Promise.resolve(null);
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
          return null;
        }

        const { location } = firstResult.geometry;
        return location;
      })
      .catch( e => {
        console.log(`geocode failed with ${e}`);
        return null;
      });
  }

  async saveChanges() {
    let { needGeocode } = this.state;
    const isNewClient = this.props.id === -1;

    if (needGeocode) {
      this.householdTO.value.location = await this.lookupLocation();
      needGeocode = false;
    }

    const householdInput = { ...this.householdTO.value }
    this.clientTOs = this.clientTOs.filter( to => !to.value.deleted);
    householdInput.clients = this.clientTOs
      .map( cTO => ({ ...cTO.value }))

    const query = `
mutation saveHouseholdChanges($household: HouseholdInput!){
  household:updateHousehold(household: $household) { id }
}`;

    try {
      await graphQL(query, { household: householdInput });
    } catch (e) {
      alert(`unable to save client: ${e}`);
    }

    this.allTOs.forEach( to => to.updateSavedValue());

    if (isNewClient) {
      const query = `
mutation{recordVisit(
  householdId: ${householdInput.id}) {
    date
  }
}`;

      await graphQL(query);
    }

    const newState = {
      isSaving: false,
      needGeocode,
      clients: this.clientTOs.map( to => to.value),
    };

    this.setState(newState);
  }

  handleSave = () => {
    // set the isSaving flag to true before anything
    if (this.hasChanges() && !this.isFormInvalid()) {
      this.setState({ isSaving: true }, this.saveChanges);
    }
  }

  handleTimer = () => {
    if (!this.state.clients.some( c => c.deleted)) {
      this.handleSave();
    }
  }

  handleTabSelect = key => {
    this.setState({
      key,
    });
  }

  isFormInvalid = () => {
    return this.state.dataReady &&
      this.allTOs.reduce( (acc, cur) => acc ? acc : cur.isInvalid(), false);
  }

  isHouseholdInvalid = () => {
    if (this.state.dataReady && this.clientTOs.filter( to => !to.value.deleted).length === 0) {
      return 'You must have at least one client';
    }
    return false;
  }

  variant(trackingObject) {
    if (!this.state.dataReady) {
      return '';
    }
    if (trackingObject.isInvalid()) {
      return 'danger';
    }
    if (trackingObject.hasChanges()) {
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
          <DropdownButton
            as="span"
            title={this.state.languages.find( l => l.id == this.state.languageId).name}
          >
            {
              this.state.languages.map( l => (
                <Dropdown.Item key={l.id} onClick={() => this.setState({ languageId: l.id })} >
                  {l.name}
                </Dropdown.Item>
              ))
            }
          </DropdownButton>
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
          onClick={() => this.handleTabSelect('household') }
          variant={this.variant(this.householdTO)}
        >
          Household
        </ListGroup.Item>
        {this.clientTOs.map(to => {
          const c = to.value;
          let label = c.name;
          if (c.deleted) {
            label = <>Deleted<i class="bi bi-arrow-counterclockwise" /></>;
          }
          if (label.length < 1) label = 'Unnamed Client';
          return (
            <ListGroup.Item
              action
              key={c.id}
              eventKey={c.id}
              onClick={() => c.deleted ? this.handleClientRestore(c) : this.handleTabSelect(c.id) }
              variant={this.variant(to)}
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
          getValidationState={key => this.householdTO.getValidationState(key)}
          cities={this.state.cities}
          languageId={this.state.languageId}
        />
      );
    } else {
      const clientTO = this.clientTOs.find(to => to.value.id === activeKey );
      const client = clientTO.value;

      mainPane = (
        <ClientDetailForm
          client={client}
          onChange={this.handleClientChange}
          onDelete={this.handleClientDelete}
          getValidationState={key => clientTO.getValidationState(key)}
          languageId={this.state.languageId}
        />
      );
    }

    return (
      <div>
        <IdleTimer timeout={3000} onIdle={this.handleTimer} />
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
