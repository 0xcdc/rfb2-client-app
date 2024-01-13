import { Button, Col, Form, Row, Table } from 'react-bootstrap';
import { useEffect, useRef, useState } from 'preact/hooks';
import graphQL from './graphQL.js';


export default function Translate() {
  const [languages, setLanguages] = useState([]);
  const [languageId, setLanguageId] = useState(0);
  const [translations, setTranslations] = useState([]);
  const [translationSet, setTranslationSet] = useState('');
  const [translationSets, setTranslationSets] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const input = useRef(null);

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

  useEffect( () => {
    if (input && input.current) {
      input.current.focus();
      input.current.select();
    }
  }, [editingId]);

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

  function getArgString(values) {
    return Object
      .keys(values)
      .map( k => `${k}: ${JSON.stringify(values[k])}`)
      .join(', ');
  }

  function translate(id) {
    const { value } = translations.find( t =>
      t.languageId == 0 &&
      t.id == id &&
      t.set == translationSet);

    const { code } = languages.find( l => l.id == languageId);

    const query = `{googleTranslate(${getArgString({ code, value })})}`;
    graphQL(query).then( json => {
      const translation = json.data.googleTranslate;
      updateTranslation(id, translation);
      setEditingId(id);
    });
  }

  function hasChanges() {
    return translations.some( row => row.newValue && ((row.newValue ?? '') != (row.value ?? '')));
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
      const query = `mutation{ updateTranslation(${getArgString(args)}) { ${Object.keys(args).join(' ')} }}`;

      const json = await graphQL(query);
      const { errors } = json;
      if (errors) {
        alert(errors.map(e => e.message).join("\n"));
      }
    }

    const updated = [... translations.filter(t => t.value != '')];
    setTranslations(updated);
  }

  return (
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
