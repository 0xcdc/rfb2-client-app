import { Button, Col, Container, FormControl, Row } from 'react-bootstrap';
import { useRef, useState } from 'preact/hooks';
import graphQL from './graphQL.js';

function cancelPopup(e) {
  e.preventDefault();
}

const English = 0;

export default function SelfService() {
  const [state, setState] = useState({ step: 'welcomePage', language: English });
  const [cities, setCities] = useState(null);
  const [address, setAddress] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [household, setHousehold] = useState(null);
  const [currentClientId, setCurrentClientId] = useState(null);
  const addressField = useRef(null);
  const nameField = useRef(null);
  const phoneField = useRef(null);
  const birthYearField = useRef(null);

  const createNewClient = async () => {
    const json = await graphQL(`
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
}`);
    const { client } = json.data;
    household.clients.push(client);
    setCurrentClientId(client.id);
    setName('');
    setPhone('');
    setBirthYear('');
  };

  const getTranslations = choices => {
    let current = window.translations;
    choices.forEach( c => {
      current = current[c];
    });

    if (Array.isArray(current)) {
      return current;
    }
    return current[state.language];
  }

  const getPrompt = key => {
    const translation =
      window.translations.prompt[key][state.language] ??
      window.translations.prompt[key][English];
    return translation.value;
  }

  const setHouseholdAttribute = keyPair => {
    const newHousehold = { ...household, ...keyPair };
    setHousehold(newHousehold);
  }

  const setClientAttribute = keyPair => {
    const currentClient = household.clients.pop();
    const newClient = { ...currentClient, ...keyPair };
    household.clients.push(newClient);
    setHousehold(household);
  }

  const clientName = () => household.clients[household.clients.length-1].name;

  const yesNos = getTranslations(['yes_no']).filter(c => c.id != -1);
  let getChoicesJsx = null;

  const steps = {
    welcomePage: {
      getChoices: () =>
        getTranslations(['prompt', 'language'])
          .map(c => {
            const { value, languageId: id } = c;
            return { id, value };
          }),
      onClick: value => ({ step: 'homelessPage', language: value }),
    },
    homelessPage: {
      getChoices: () => yesNos,
      onClick: value => (value == 0 ? { step: 'cityOnlyPage' } : { step: 'addressPage' }),
    },
    addressPage: {
      jsx: dispatch => (
        <>
          <FormControl
            ref={addressField}
            onChange={e => setAddress(e.target.value)}
            autofocus
            value={address} />
          <Button
            onClick={() => {
              dispatch(addressField.current.value);
            }}
            disabled={addressField.current == null || (addressField.current.value == '')}>
              Continue
          </Button>
        </>
      ),
      onClick: value => {
        setHouseholdAttribute({ address1: value });
        return ({ step: 'incomePage' });
      }
    },
    cityOnlyPage: {
      getChoices: () => cities,
      householdAttribute: 'cityId',
      nextStep: 'incomePage',
    },
    incomePage: {
      getChoices: () => getTranslations(['income_level']).filter(c => c.id != 0),
      householdAttribute: 'incomeLevelId',
      nextStep: 'yourNamePage',
    },
    yourNamePage: {
      jsx: dispatch => (
        <>
          <FormControl
            key='nameControl'
            ref={nameField}
            onChange={e => setName(e.target.value)}
            autofocus
            value={name} />
          <Button
            onClick={() => {
              dispatch(nameField.current.value);
            }}
            disabled={nameField.current == null || (nameField.current.value == '')}>
              Continue
          </Button>
        </>
      ),
      clientAttribute: 'name',
      nextStep: 'birthPage',
    },
    birthPage: {
      jsx: dispatch => (
        <>
          <FormControl
            key='birthYearControl'
            ref={birthYearField}
            onChange={e => setBirthYear(e.target.value)}
            autofocus
            value={birthYear} />
          <Button
            onClick={() => {
              dispatch(birthYearField.current.value);
            }}
            disabled={birthYearField.current == null || (birthYearField.current.value == '')}>
              Continue
          </Button>
        </>
      ),
      clientAttribute: 'birthYear',
      nextStep: 'genderPage',
    },
    genderPage: {
      getChoices: () => getTranslations(['gender']).filter(c => c.id != 0),
      clientAttribute: 'genderId',
      nextStep: 'disabledPage',
    },
    disabledPage: {
      getChoices: () => yesNos,
      clientAttribute: 'disabled',
      nextStep: 'ethnicityPage',
    },
    ethnicityPage: {
      getChoices: () => getTranslations(['ethnicity']).filter(c => c.id != 0),
      clientAttribute: 'ethnicityId',
      nextStep: 'racePage',
    },
    racePage: {
      getChoices: () => getTranslations(['race']).filter(c => c.id != 0),
      clientAttribute: 'raceId',
      nextStep: 'englishPage',
    },
    englishPage: {
      getChoices: () => yesNos,
      clientAttribute: 'speaksEnglish',
      nextStep: 'militaryPage',
    },
    militaryPage: {
      getChoices: () => getTranslations(['militaryStatus']).filter(c => c.id != 0),
      clientAttribute: 'militaryStatusId',
      nextStep: 'refugeePage',
    },
    refugeePage: {
      getChoices: () => yesNos,
      clientAttribute: 'refugeeImmigrantStatus',
      nextStep: 'phonePage',
    },
    phonePage: {
      jsx: dispatch => (
        <>
          <FormControl
            key='phoneControl'
            ref={phoneField}
            onChange={e => setPhone(e.target.value)}
            autofocus
            value={phone} />
          <Button
            onClick={() => {
              dispatch(phoneField.current.value);
            }}
            disabled={phoneField.current == null || (phoneField.current.value == '')}>
              Continue
          </Button>
        </>
      ),
      clientAttribute: 'phoneNumber',
      nextStep: 'moreClientsPage',
    },
    moreClientsPage: {
      jsx: () => (
        <>
          <Row><Col>
            Current household members:
          </Col></Row>
          { household.clients.map( c => (
            <Row key={c.id}><Col>
              {c.name}
            </Col></Row>
          ))}
          { getChoicesJsx(yesNos) }
        </>),
      onClick: async value => {
        if (value == 0) {
          return { step: 'finishedPage' };
        }
        await createNewClient();
        return { step: 'nextNamePage' };
      },
    },
    finishedPage: {
      getChoices: () => [],
      onclick: () => ({}),
    },
  };

  steps.nextNamePage = steps.yourNamePage;

  const step = steps[state.step];

  const dispatch = async value => {
    if (step.householdAttribute) {
      setHouseholdAttribute(Object.fromEntries([[step.householdAttribute, value]]));
      const newState = { ...state };
      newState.step = step.nextStep;
      setState(newState);
    } else if (step.clientAttribute) {
      setClientAttribute(Object.fromEntries([[step.clientAttribute, value]]));
      const newState = { ...state };
      newState.step = step.nextStep;
      setState(newState);
    } else {
      const newState = await step.onClick(value);
      setState({ ...state, ...newState });
    }
  }

  getChoicesJsx = choices => {
    return choices
      .map( c => (
        <Row key={c.id}>
          <Col>
            <Button onClick={() => dispatch(c.id)}>{c.value}</Button>
          </Col>
        </Row>
      ));
  }

  console.log({ state, household });
  let header = getPrompt(state.step);
  if (header.includes('___')) {
    header = header.replace('___', clientName());
  }

  if (cities == null) {
    graphQL('{cities{id value:name}}')
      .then(json => {
        setCities(json.data.cities);
      });
    return <div />;
  }

  if (household == null) {
    graphQL(`
mutation { household:createNewHousehold {
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
 }}`
    ).then( json => {
      setHousehold(json.data.household);
    });
    return <div />;
  }

  if (currentClientId == null) {
    createNewClient();
    return <div />;
  }

  return (
    <Container id='SelfServiceLayout' onContextMenu={cancelPopup}>
      <Row id='self-service-header'>
        <Col>
          {header}
        </Col>
      </Row>
      {
        step.jsx ?
          <Row>
            <Col>
              { step.jsx(dispatch) }
            </Col>
          </Row> :
          getChoicesJsx(step.getChoices())
      }
    </Container>
  );
}
