import { Button, Col, Form, Row, Table } from 'react-bootstrap';
import { useEffect, useRef, useState } from 'preact/hooks';
import graphQL from './graphQL.js';
import { useSearchParams } from "react-router-dom";

export default function Translate() {
  const [searchParams] = useSearchParams();
  const defaultLanguageId = searchParams.get('languageId') ?? 0;
  const defaultTranslationSet = searchParams.get('set') ?? '';
  const defaultEditingId = searchParams.get('id') ?? null;

  const [dataReady, setDataReady] = useState(false);
  const [languages, setLanguages] = useState([]);
  const [languageId, setLanguageId] = useState(defaultLanguageId);
  const [translations, setTranslations] = useState([]);
  const [translationSet, setTranslationSet] = useState(defaultTranslationSet);
  const [translationSets, setTranslationSets] = useState([]);
  const [editingId, setEditingId] = useState(defaultEditingId);
  const input = useRef(null);

  if ((translations.length > 0) &&
      (languages.length > 0) &&
      (translationSets.length > 0)) {
    if (translationSet == '') setTranslationSet(translationSets[0]);
    setDataReady(true);
  }

  useEffect( () => {
    graphQL('{languages { id, name, code}}').then( json => {
      const { languages } = json.data;
      setLanguages( languages);
    });
    graphQL('{translationSets}').then( json => {
      const { translationSets } = json.data;
      setTranslationSets(translationSets);
    });
    graphQL('{translations { set, id, languageId, value }}').then( json => {
      const { translations } = json.data;
      setTranslations(translations);
    });
  }, []);

  useEffect( () => {
    if (dataReady && input && input.current) {
      input.current.focus();
      input.current.select();
    }
  }, [editingId, dataReady]);

  const language = languages.find( l => l.id == languageId)?.name ?? 'Value';
  const isEnglish = languageId == 0;
  const english = translations.filter( t => t.set == translationSet && t.languageId == 0 );
  const data = translations.filter( t => t.set == translationSet && t.languageId == languageId );

  function updateTranslation(id, newValue) {
    const translation = translations.find( t =>
      t.id == id &&
      t.languageId == languageId &&
      t.set == translationSet);
    if (translation) {
      translation.newValue = newValue;
    } else {
      translations.push({ set: translationSet, id, languageId, newValue });
    }
    const updated = [...translations];
    setTranslations(updated);
  }

  function translate(id) {
    const { value } = translations.find( t =>
      t.languageId == 0 &&
      t.id == id &&
      t.set == translationSet);

    const { code } = languages.find( l => l.id == languageId);

    const query = `query translate($code:String!, $value: String!){googleTranslate(code: $code, value: $value)}`;
    graphQL(query, { code, value }).then( json => {
      const translation = json.data.googleTranslate;
      updateTranslation(id, translation);
      setEditingId(id);
    });
  }

  function hasChanges() {
    return translations.some( row => row.newValue != null && ((row.newValue ?? '') != (row.value ?? '')));
  }

  function isInvalid() {
    // we must have an english translation
    return translations.some( row => row.newValue == '' && row.languageId == 0);
  }

  function saveButtonVariant() {
    return isInvalid() ? "danger" :
      hasChanges() ? 'primary' : 'secondary';
  }

  function saveButtonText() {
    return isInvalid() ? "English required" :
      hasChanges() ? 'Save' : 'Saved';
  }

  function getTranslation(id) {
    const row = data.find( d => d.id == id)
    if (!row) return null;
    if (row.newValue != null) return row.newValue == '' ? null : row.newValue;
    return row.value;
  }

  function saveRow() {
    if (input?.current == null) return;
    if (editingId == null) return;
    const { value } = input.current;
    updateTranslation(editingId, value);
  }

  async function saveToServer() {
    let changedRow = translations.find(row => row.newValue != null && row.newValue != row.value);
    while (changedRow) {
      const { id, languageId, set, newValue: value } = changedRow;
      changedRow.value = value;
      changedRow.newValue = null;
      changedRow = translations.find(row => row.newValue != null && row.newValue != row.value);

      const args = { id, languageId, set, value };
      const query = `mutation updateTranslation($newTranslation: UpdateTranslationInput!)
        { updateTranslation(translation: $newTranslation) {id} }`;

      const json = await graphQL(query, { newTranslation: args });
      const { errors } = json;
      if (errors) {
        alert(errors.map(e => e.message).join("\n"));
      }
    }

    const updated = [... translations.filter(t => t.value != '')];
    setTranslations(updated);
  }

  return (
    !dataReady ?
      <></> :
      <Form>
        <Row>
          <Form.Label column sm={2}>Translation Set</Form.Label>
          <Col>
            <Form.Select value={translationSet} onChange={e => setTranslationSet(e.target.value)}>
              { translationSets.map( t => <option value={t} key={t}>{t}</option>) }
            </Form.Select>
          </Col>
          <Form.Label column sm={2}>Language</Form.Label>
          <Col>
            <Form.Select value={languageId} onChange={e => setLanguageId(parseInt(e.target.value, 10))}>
              { languages.map( l => <option value={l.id} key={l.id}>{`${l.name}-${l.id}`}</option>) }
            </Form.Select>
          </Col>
          <Col sm={2}>
            <Button
              variant={saveButtonVariant()}
              onClick={() => saveToServer()}
              disabled={isInvalid() || !hasChanges()}
            >
              {saveButtonText()}
            </Button>
          </Col>
        </Row>
        <Table striped bordered hover>
          <thead>
            <tr>
              <th style={{ width: '20px' }}>Id</th>
              { !isEnglish ? <th style={{ width: '400px' }}>English</th> : <></> }
              <th style={{ width: '400px' }}>{language}</th>
              { !isEnglish ?
                <>
                  <th style={{ width: '20px' }} />
                </>:
                <></>
              }
            </tr>
          </thead>
          <tbody>
            {
              english.map( row => (
                <tr
                  key={row.id}
                  onClick={e => {
                    saveRow();
                    setEditingId(row.id);
                    e.stopPropagation();
                  }}>
                  <td>{row.id}</td>
                  { !isEnglish ?
                    <td>{row.newValue ?? row.value}</td> :
                    <></>
                  }
                  <td>
                    {row.id == editingId ?
                      <Form.Control
                        ref={input}
                        type='text'
                        onChange={() => saveRow()}
                        onBlur={ () => setEditingId(null)}
                        value={getTranslation(row.id) ?? ''} /> :
                      getTranslation(row.id) ?? '(None)'
                    }
                  </td>
                  { !isEnglish ?
                    <>
                      <td className='editIcon'>
                        <Button className='xButton' variant="link" onClick={ () => translate(row.id)}>
                          <i class="bi bi-translate" />
                        </Button>
                      </td>
                    </> :
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
