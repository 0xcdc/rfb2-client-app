import graphQL from './graphQL.js';
import { useReducer } from 'preact/hooks';
import { SimpleFormLabel } from './SimpleFormControls.jsx';
import { Form, Col, Row } from 'react-bootstrap';

const English = 0;

const householdStates = [
  { page: 'language',
    jsx: () => (
      <>
        <Row id='self-service-welcome'>
          <Col>
          {window.translations.prompt.welcome[English].value}
          </Col>
        </Row>
        { 
          window.translations.prompt.language.map( e => {
            return <Row><Col><button>{e.value}</button></Col></Row>;
          })
        }
      </>
      )
    ,
  },
  ];

const clientStates = [
  'name',
  'gender',
  'birthYear',
  'disabled',
  'refugee',
  'ethnicity',
  'race',
  'speaksEnglish',
  'militaryStatus',
  'phonenumber',
];

const reducer = (state, action) => {
  return state;
}

export default function SelfService(props) {
  const [state, dispatch] = useReducer(reducer, {step: 0});
  return (
    <Form id='self-service' >
      {householdStates[state.step].jsx()}
    </Form>
  );
}
