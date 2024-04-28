import { Button, Col, Container, Form, FormControl, ProgressBar, Row } from 'react-bootstrap';
import { useEffect, useRef, useState } from 'preact/hooks';
import graphQL from './graphQL.js';
import { useImmer } from "use-immer";

function cancelPopup(e) {
  e.preventDefault();
}

const English = 0;
const ThisYear = new Date().getFullYear();

export default function SelfService() {
  const [language, setLanguage] = useState(English);
  const [stepStack, setStepStack] = useState([{ step: 'welcomePage' }]);
  const [cities, setCities] = useState(null);
  const [address, setAddress] = useState('');
  const [household, setHousehold] = useImmer(null);
  const [currentClientIndex, setCurrentClientIndex] = useState(-1);
  const addressField = useRef(null);

  let getChoicesJsx = null;

  const alertUser = e => {
    e.preventDefault();
    e.returnValue = true;
    return true;
  }

  useEffect(() => {
    window.addEventListener('beforeunload', alertUser);
    return () => {
      window.removeEventListener('beforeunload', alertUser);
    }
  }, []);

  function currentClient() {
    return household.clients[currentClientIndex];
  }

  const setBirthYear = year => {
    const age = ThisYear - year;
    if (age < 0) {
      year = ThisYear;
    }
    if (age >= 100) {
      year = ThisYear-99;
    }
    setHousehold( draft => {
      draft.clients[currentClientIndex].birthYear = year;
    });
  }

  function pushStep(step, undo) {
    const newStepStack= Array.from(stepStack);
    newStepStack.push({ step, undo });
    setStepStack(newStepStack);
  }

  function popStep() {
    const newStepStack = Array.from(stepStack);
    const { undo } = newStepStack.pop();
    if (undo) {
      undo();
    }
    setStepStack(newStepStack);
  }

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

    setHousehold( draft => {
      const { client } = json.data;
      client.birthYear = ThisYear;
      draft.clients.push(client);
    });
    setCurrentClientIndex(currentClientIndex + 1);
  };

  const removeClient = index => {
    setHousehold( draft => {
      draft.clients.splice(index, 1);
    });
  }

  const getTranslations = choices => {
    let current = window.translations;
    choices.forEach( c => {
      current = current[c];
    });

    if (Array.isArray(current)) {
      return current;
    }
    return current[language];
  }

  const getPrompt = key => {
    const translation =
      window.translations.prompt[key][language] ??
      window.translations.prompt[key][English];
    return translation.value;
  }

  const setHouseholdAttribute = keyPair => {
    setHousehold(draft => {
      Object.keys(keyPair).forEach( key => {
        draft[key] = keyPair[key];
      });
    });
  }

  const setClientAttribute = keyPair => {
    setHousehold( draft => {
      const client = draft.clients[currentClientIndex];
      Object.keys(keyPair).forEach( key => {
        client[key] = keyPair[key];
      });
    });
  }

  const yesNos = getTranslations(['yes_no']).filter(c => c.id != -1);

  function yearDigits(year) {
    const retVal = [];
    while (year > 0) {
      const digit = year % 10;
      retVal.push(digit);
      year -= digit;
      year /= 10;
    }
    return retVal.reverse();
  }

  const BackButton = (
    <Button class='backButton'
      onClick={() => {
        popStep();
      }}>
      <i class="bi bi-arrow-left" />
    </Button>
  );

  const steps = {
    welcomePage: {
      getChoices: () =>
        getTranslations(['prompt', 'language'])
          .map(c => {
            const { value, languageId: id } = c;
            return { id, value };
          }),
      onClick: value => {
        setLanguage(value);
        return 'homelessPage';
      },
      undo: () => {
        console.log('setting language back to English'); setLanguage(English);
      },
    },
    homelessPage: {
      getChoices: () => yesNos,
      onClick: value => (value == 0 ? 'cityOnlyPage' : 'addressPage'),
      progress: 25,
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
        return 'incomePage';
      },
      progress: 50,
    },
    cityOnlyPage: {
      getChoices: () => cities,
      householdAttribute: 'cityId',
      nextStep: 'incomePage',
      progress: 50,
    },
    incomePage: {
      getChoices: () => getTranslations(['income_level']).filter(c => c.id != 0),
      householdAttribute: 'incomeLevelId',
      nextStep: 'yourNamePage',
      progress: 75,
    },
    yourNamePage: {
      jsx: dispatch => (
        <>
          <FormControl
            key='nameControl'
            onInput={e => setClientAttribute({ name: e.target.value })}
            autofocus
            value={currentClient().name} />
          <Button
            onClick={() => dispatch(currentClient().name) }
            disabled={ currentClient().name == '' }>
              Continue
          </Button>
        </>
      ),
      clientAttribute: 'name',
      nextStep: 'birthPage',
      progress: 9,
    },
    birthPage: {
      jsx: dispatch => {
        const { birthYear } = currentClient();
        return (
          <div class='yearNumbers'>
            <Row>
              <Col sm={2} />
              <Col sm={1}>
                <i class="yearPlusMinus bi bi-plus-square-fill" onClick={() => setBirthYear(birthYear + 10)} />
              </Col>
              <Col sm={1}>
                <i class="yearPlusMinus bi bi-plus-square-fill" onClick={() => setBirthYear(birthYear + 1)} />
              </Col>
            </Row>
            <Row >
              { yearDigits(birthYear).map( (d, i) => (
                <Col key={i} sm={1}>
                  {d}
                </Col>
              ))
              }
            </Row>
            <Row>
              <Col>
                <Form.Range
                  value={ThisYear - birthYear}
                  onChange={e => setBirthYear(ThisYear - e.target.value)} />
              </Col>
            </Row>
            <Row>
              <Col sm={2} />
              <Col sm={1}>
                <i class="yearPlusMinus bi bi-dash-square-fill" onClick={() => setBirthYear(birthYear - 10)} />
              </Col>
              <Col sm={1}>
                <i class="yearPlusMinus bi bi-dash-square-fill" onClick={() => setBirthYear(birthYear - 1)} />
              </Col>
            </Row>
            <Button onClick={() => {
              dispatch(currentClient().birthYear);
            }}>
              Continue
            </Button>
          </div>
        );
      },
      clientAttribute: 'birthYear',
      nextStep: 'genderPage',
      progress: 18,
    },
    genderPage: {
      getChoices: () => getTranslations(['gender']).filter(c => c.id != 0),
      clientAttribute: 'genderId',
      nextStep: 'disabledPage',
      progress: 27,
    },
    disabledPage: {
      getChoices: () => yesNos,
      clientAttribute: 'disabled',
      nextStep: 'ethnicityPage',
      progress: 36,
    },
    ethnicityPage: {
      getChoices: () => getTranslations(['ethnicity']).filter(c => c.id != 0),
      clientAttribute: 'ethnicityId',
      nextStep: 'racePage',
      progress: 45,
    },
    racePage: {
      getChoices: () => getTranslations(['race']).filter(c => c.id != 0),
      clientAttribute: 'raceId',
      nextStep: 'englishPage',
      progress: 54,
    },
    englishPage: {
      getChoices: () => yesNos,
      clientAttribute: 'speaksEnglish',
      nextStep: 'militaryPage',
      progress: 63,
    },
    militaryPage: {
      getChoices: () => getTranslations(['militaryStatus']).filter(c => c.id != 0),
      clientAttribute: 'militaryStatusId',
      nextStep: 'refugeePage',
      progress: 72,
    },
    refugeePage: {
      getChoices: () => yesNos,
      clientAttribute: 'refugeeImmigrantStatus',
      nextStep: 'phonePage',
      progress: 81,
    },
    phonePage: {
      jsx: dispatch => (
        <>
          <FormControl
            key='phoneControl'
            onChange={e => setClientAttribute({ phone: e.target.value })}
            autofocus
            value={currentClient().phone} />
          <Button
            onClick={() => {
              dispatch(currentClient().phone)
            }}>
              Continue
          </Button>
        </>
      ),
      clientAttribute: 'phoneNumber',
      nextStep: 'moreClientsPage',
      progress: 90,
    },
    moreClientsPage: {
      jsx: () => (
        <>
          <Row><Col>
            {getPrompt('currentClients')}
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
          return 'finishedPage';
        }
        await createNewClient();
        return 'nextNamePage';
      },
      undo: () => {
        const clientIndexToRemove = currentClientIndex + 1;
        console.log(`removing client at index ${ clientIndexToRemove}`);
        removeClient(clientIndexToRemove)
        setCurrentClientIndex(currentClientIndex);
      },
    },
    finishedPage: {
      getChoices: () => [],
      onclick: () => ({}),
    },
  };

  steps.nextNamePage = steps.yourNamePage;

  const currentStep = () => stepStack[stepStack.length -1].step;
  const step = steps[currentStep()];

  const dispatch = async value => {
    let nextStep;
    if (step.householdAttribute) {
      setHouseholdAttribute(Object.fromEntries([[step.householdAttribute, value]]));
      ({ nextStep } = step);
    } else if (step.clientAttribute) {
      setClientAttribute(Object.fromEntries([[step.clientAttribute, value]]));
      ({ nextStep } = step);
    } else {
      nextStep = await step.onClick(value);
    }
    pushStep(nextStep, step.undo);
  }

  const getSelectedId = step => {
    let obj; let attr;
    if (step.householdAttribute) {
      obj = household;
      attr = step.householdAttribute;
    } else if (step.clientAttribute) {
      obj = household.clients[currentClientIndex]
      attr = step.clientAttribute;
    }

    if (obj && attr) {
      return obj[attr];
    }
    return null;
  }

  getChoicesJsx = (choices, selectedId) => {
    const [nColumns, nRows] = choices.length < 20 ?
      [1, choices.length] :
      [3, Math.floor(choices.length / 3) + 1];

    const columns = Array.from({ length: nColumns }, (v, i) => i);
    const rows = Array.from({ length: Math.floor(choices.length / nColumns) }, (v, i) => i);

    return (
      <>
        { rows.map( r => (
          <Row key={r}>
            { columns.map( c => {
              const index = c * nRows + r;
              const choice = index < choices.length ? choices[index] : null;
              const choiceButton = choice ?
                <Button
                  onClick={() => dispatch(choice.id)}
                  variant={ selectedId == choice.id ? "info" : "primary" }
                >
                  {choice.value}
                </Button> :
                <></>;

              return (
                <Col key={c}>
                  {choiceButton}
                </Col>
              );
            })}
          </Row>
        ))
        }
      </>
    );
  }

  console.log({ stepStack, household, currentClientIndex });
  let header = getPrompt(currentStep());
  if (header.includes('___')) {
    header = header.replace('___', currentClient().name);
  }

  if (cities == null) {
    graphQL('{cities{id value:name}}')
      .then(json => {
        setCities(json.data.cities.filter(c => c.id != 0));
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

  if (currentClientIndex == -1) {
    createNewClient();
    return <div />;
  }

  return (
    <Container id='SelfServiceLayout' onContextMenu={cancelPopup}>
      { step.progress ?
        <Row>
          <Col>
            <ProgressBar style={{ margin: "10px" }} now={step.progress} />
          </Col>
        </Row> :
        <></>
      }
      <Row>
        <Col sm={1}>
          { (stepStack.length > 1) ? BackButton : <></> }
        </Col>
      </Row>
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
          getChoicesJsx(step.getChoices(), getSelectedId(step))
      }
    </Container>
  );
}
