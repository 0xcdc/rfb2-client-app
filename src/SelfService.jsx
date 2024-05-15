import { Accordion, Button, Col, Container, Form, FormControl, ProgressBar, Row, Stack } from 'react-bootstrap';
import { useEffect, useRef, useState } from 'preact/hooks';
import { NumberPad } from './NumberPad.jsx';
import { addGoogleAddressAutoComplete } from './GoogleAddress.js';
import graphQL from './graphQL.js';
import { useImmer } from "use-immer";
import { useNavigate } from "react-router-dom";

function cancelPopup(e) {
  e.preventDefault();
}

const English = 0;
const ThisYear = new Date().getFullYear();

export default function SelfService() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState(English);
  const [stepStack, setStepStack] = useState([{ step: 'welcomePage' }]);
  const [cities, setCities] = useState(null);
  const [household, setHousehold] = useImmer(null);
  const [currentClientIndex, setCurrentClientIndex] = useState(-1);
  const addressField = useRef(null);

  const volunterKeyCodeOnChange = value => {
    if (value == '4578') {
      navigate("/volunteer-review", { state: { household } });
    }
  }

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

  function getAddressString() {
    if (household == null) return "";
    if (household.address1 == "") return "";
    const cityName = cities.find( c=> c.id == household.cityId)?.value ?? "";
    const newAddress = `${household.address1} ${household.address2}, ${cityName} ${household.zip}`;
    return newAddress;
  }

  function setHouseholdAttribute(keyPair) {
    setHousehold(draft => {
      Object.keys(keyPair).forEach( key => {
        draft[key] = keyPair[key];
      });
    });
  }

  useEffect(() => {
    if (addressField.current != null && cities != null) {
      addGoogleAddressAutoComplete(addressField, cities, changes => setHouseholdAttribute(changes));
    }
  });

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

  const setClientAttribute = keyPair => {
    setHousehold( draft => {
      const client = draft.clients[currentClientIndex];
      Object.keys(keyPair).forEach( key => {
        client[key] = keyPair[key];
      });
    });
  }

  const yesNos = getTranslations(['yes_no']).filter(c => c.id != -1);

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
            autofocus
            autocomplete="off"
            value={getAddressString()}
          />
          <Button
            onClick={() => {
              dispatch();
            }}
            disabled={household.address1 == ""}>
            { getPrompt('continue') }
          </Button>
        </>
      ),
      onClick: () => {
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
            value={currentClient().name}
            autocomplete="off"
          />
          <Button
            onClick={() => dispatch(currentClient().name) }
            disabled={ currentClient().name == '' }>
            { getPrompt('continue') }
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
              <Col sm={2}>
                <Button size="sm" onClick={() => setBirthYear(birthYear + 25)}>
                  <div class="yearPlusMinus"><i class="bi bi-plus-square-fill" /> 25</div>
                </Button>
              </Col>
              <Col sm={2}>
                <Button size="sm" onClick={() => setBirthYear(birthYear + 10)}>
                  <div class="yearPlusMinus"><i class="bi bi-plus-square-fill" /> 10</div>
                </Button>
              </Col>
              <Col sm={2}>
                <Button size="sm" onClick={() => setBirthYear(birthYear + 1)}>
                  <div class="yearPlusMinus"><i class="bi bi-plus-square-fill" /> 1</div>
                </Button>
              </Col>
            </Row>
            <Row >
              { Array.from(birthYear.toString()).map( (d, i) => (
                <Col key={i} sm={2}>
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
              <Col sm={2}>
                <Button size="sm" onClick={() => setBirthYear(birthYear - 25)}>
                  <div class="yearPlusMinus"><i class="bi bi-dash-square-fill" /> 25</div>
                </Button>
              </Col>
              <Col sm={2}>
                <Button size="sm" onClick={() => setBirthYear(birthYear - 10)}>
                  <div class="yearPlusMinus"><i class="bi bi-dash-square-fill" /> 10</div>
                </Button>
              </Col>
              <Col sm={2}>
                <Button size="sm" onClick={() => setBirthYear(birthYear - 1)}>
                  <div class="yearPlusMinus"><i class="bi bi-dash-square-fill" /> 1</div>
                </Button>
              </Col>
            </Row>
            <Row>
              <Col sm={9} />
              <Col sm={3}>
                <Button onClick={() => {
                  dispatch(currentClient().birthYear);
                }}>
                  { getPrompt('continue') }
                </Button>
              </Col>
            </Row>
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
            onChange={e => setClientAttribute({ phoneNumber: e.target.value })}
            autofocus
            autocomplete="off"
            value={currentClient().phoneNumber} />
          <Button
            onClick={() => {
              dispatch(currentClient().phoneNumber)
            }}>
            { getPrompt('continue') }
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
      jsx: () => {
        return (
          <>
            <Accordion>
              <Accordion.Item eventKey="1">
                <Accordion.Header>
                  Volunteer press to open
                </Accordion.Header>
                <Accordion.Body>
                  <NumberPad onChange={volunterKeyCodeOnChange} />
                </Accordion.Body>
              </Accordion.Item>
            </Accordion>
          </>
        );
      },
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
    const rows = Array.from({ length: Math.ceil(choices.length / nColumns) }, (v, i) => i);


    return (
      <Stack gap={3} direction="horizontal" className="mx-auto">
        {
          columns.map( c => {
            return (
              <Stack key={c} gap={3} >
                {
                  rows.map( r => {
                    const index = c * nRows + r;
                    const choice = index < choices.length ? choices[index] : null;
                    const choiceButton = choice ?
                      <Button
                        className='selfServiceButton'
                        onClick={() => dispatch(choice.id)}
                        variant={ selectedId == choice.id ? "info" : "primary" }
                      >
                        {choice.value}
                      </Button> :
                      <></>;
                    return choiceButton;
                  })
                }
              </Stack>
            );
          })
        }
      </Stack>
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
