import { Col, Form, Row, Table } from 'react-bootstrap';
import { useEffect, useState } from 'preact/hooks';
import graphQL from './graphQL.js';

export default function Translate() {
  const [languages, setLanguages] = useState([]);
  const [languageId, setLanguageId] = useState(0);
  const [translations, setTranslations] = useState([]);
  const [translationSet, setTranslationSet] = useState('');
  const [translationSets, setTranslationSets] = useState([]);

  useEffect( () => {
    graphQL('{languages { id, name, code}}').then( json => {
      const { languages } = json.data;
      setLanguages( languages);
    });
    graphQL('{translationSets}').then( json => {
      const { translationSets } = json.data;
      setTranslationSets(translationSets);
      setTranslationSet(translationSets[0]);
    });
    graphQL('{translations { set, id, languageId, value }}').then( json => {
      const { translations } = json.data;
      setTranslations(translations);
    });
  }, []);

  const language = languages.find( l => l.id == languageId)?.name ?? 'Value';
  const isEnglish = languageId == 0;
  const english = translations.filter( t => t.set == translationSet && t.languageId == 0 );
  const data = translations.filter( t => t.set == translationSet && t.languageId == languageId );

  return (
    <Form>
      <Row>
        <Form.Label column sm={2}>Language</Form.Label>
        <Col>
          <Form.Select value={languageId} onChange={e => setLanguageId(e.target.value)}>
            { languages.map( l => <option value={l.id} key={l.id}>{l.name}</option>) }
          </Form.Select>
        </Col>
        <Form.Label column sm={2}>Translation Set</Form.Label>
        <Col>
          <Form.Select value={translationSet} onChange={e => setTranslationSet(e.target.value)}>
            { translationSets.map( t => <option value={t} key={t}>{t}</option>) }
          </Form.Select>
        </Col>
      </Row>
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Id</th>
            { !isEnglish ? <th>English</th> : <></> }
            <th>{language}</th>
          </tr>
        </thead>
        <tbody>
          {
            english.map( row => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{row.value}</td>
                { !isEnglish ?
                  <td>{data.find( d => d.id == row.id)?.value ?? '(None)'}</td> :
                  <></>
                }
              </tr>
            ))
          }
        </tbody>
      </Table>
    </Form>
  );
}
