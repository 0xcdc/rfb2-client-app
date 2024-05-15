import { Button, Card, Col, Container, ProgressBar, Row } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import graphQL from './graphQL.js';
import { useState } from 'preact/hooks';

function cancelPopup(e) {
  e.preventDefault();
}

const English = 0;

function getPrompt(tag) {
  return window.translations.prompt[tag][English].value;
}

function getTranslation(set, value) {
  const translations = window.translations[set][English];
  return translations.find( t => t.id == value).value;
}

function renderString(tag, string) {
  return (
    <Row>
      <Col>{getPrompt(tag)}</Col>
      <Col>{string}</Col>
    </Row>
  );
}

function renderId(tag, set, id) {
  return renderString(tag, getTranslation(set, id));
}

function delayPromise(time) {
  const p = new Promise( resolve => {
    setTimeout(() => {
      resolve(true);
    }, time);
  });

  return p;
}

export default function SelfServiceSummary() {
  const location = useLocation();
  const navigate = useNavigate();
  const { household } = location.state;
  console.log({ household });
  const [cities, setCities] = useState(null);
  const [progress, setProgress] = useState(0);
  const [heading, setHeading] = useState("");

  if (cities == null) {
    graphQL('{cities{id value:name}}')
      .then(json => {
        setCities(json.data.cities.filter(c => c.id != 0));
      });
    return <div />;
  }


  function getAddressString() {
    if (household == null) return "";
    const cityName = cities.find( c=> c.id == household.cityId)?.value ?? "";
    if (household.address1 == "") return cityName;
    const newAddress = `${household.address1} ${household.address2}, ${cityName} ${household.zip}`;
    return newAddress;
  }

  async function saveHousehold(newTab) {
    setHeading('Saving...');
    const householdInput = { ...household };
    householdInput.clients = household.clients.map( c => (
      {
        ...c,
        birthYear: c.birthYear.toString(),
        phoneNumber: c.phoneNumber ?? "",
      }));
    let query = `
mutation saveHouseholdChanges($household: HouseholdInput!){
  household:updateHousehold(household: $household) { id }
}`;

    try {
      await Promise.all([
        graphQL(query, { household: householdInput }),
        delayPromise(1000),
      ]);
    } catch (e) {
      alert(`unable to save client - please ask the client to fill out paperwork\n ${e}`);
      return;
    }

    setProgress(50);
    setHeading('Checking in...');

    query = `
mutation{recordVisit(
  householdId: ${householdInput.id}) {
    date
  }
}`;

    try {
      await Promise.all([
        graphQL(query),
        delayPromise(1000),
      ]);
    } catch (e) {
      alert(`unable to check in client - please check the client in manually`);
      return;
    }


    setProgress(100);
    setHeading('Done!');
    await delayPromise(1000);

    if (newTab) {
      window.open(`/households/${household.id}`, "_blank");
    }

    navigate('/selfservice');
  }

  if (heading != '') {
    return (
      <Container id='VolunteerReviewLayout' onContextMenu={cancelPopup}>
        <h1>{heading}</h1>
        <ProgressBar now={progress} />
      </Container>
    );
  }

  return (
    <Container id='VolunteerReviewLayout' onContextMenu={cancelPopup}>
      <br />
      <Card>
        { renderString('address1', getAddressString(household)) }
        { renderId('income', 'income_level', household.incomeLevelId) }
      </Card>
      {
        household.clients.map( c => (
          <span key={c.id}>
            <br />
            <Card>
              { renderString('name', c.name) }
              { renderString('birthYear', c.birthYear) }
              { renderId('gender', 'gender', c.genderId) }
              { renderId('disabled', 'yes_no', c.disabled) }
              { renderId('ethnicity', 'ethnicity', c.ethnicityId) }
              { renderId('race', 'race', c.raceId) }
              { renderId('militaryStatus', 'militaryStatus', c.militaryStatusId) }
              { renderId('refugee', 'yes_no', c.refugeeImmigrantStatus) }
              { renderId('speaksEnglish', 'yes_no', c.speaksEnglish) }
              { renderString('phoneNumber', c.phoneNumber) }
            </Card>
          </span>
        ))
      }
      <br />
      <Row>
        <Col>
          <Button onClick={() => saveHousehold(false)}>Save Household</Button>
          <Button onClick={() => saveHousehold(true)}>Save Household & Open New Tab to Edit</Button>
        </Col>
      </Row>
    </Container>
  );
}
