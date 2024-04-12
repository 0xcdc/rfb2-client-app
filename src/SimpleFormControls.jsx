import { Col, Form, Row } from 'react-bootstrap';
import { forwardRef } from 'preact/compat';
import { useNavigate } from "react-router-dom";

const English = 0;

function getTag(props) {
  return props.label ?? props.group;
}

function getLabel(props) {
  const tag = getTag(props);
  const { languageId } = props;
  console.assert(languageId >= 0);
  const promptTranslations = window.translations.prompt[tag];
  const translation = promptTranslations[languageId] ?? promptTranslations[English];
  return translation.value;
}

export function SimpleFormLabel(props) {
  const navigate = useNavigate();
  return (
    <Form.Label
      column sm={2}
      style={props.style}
      onClick={e => {
        if (e.ctrlKey) {
          const tag = getTag(props);
          const { languageId } = props;
          const { id } = window.translations.prompt[tag][English];
          const set='prompt';

          const url = `/translate?set=${set}&id=${id}&languageId=${languageId}`;
          navigate(url);
        }
      }}
    >
      {getLabel(props)}
    </Form.Label>
  );
}

export function SimpleFormGroup(props) {
  const style = {};
  if (props.getValidationState(props.group) === 'error') {
    style.color = 'red';
  } else if (props.getValidationState(props.group) === 'success') {
    style.color = 'green';
  }

  return (
    <Form.Group as={Row} className="mb-3" controlId={`formHorizontal_${props.group}`} >
      <SimpleFormLabel {...props} style={style} />
      <Col sm={10}>
        {props.children}
      </Col>
    </Form.Group>
  );
}

function getValidationStyle(state) {
  const style = {};
  if (state === 'error') {
    style.boxShadow = '0 0 0 0.2rem red';
  } else if (state === 'success') {
    style.boxShadow = '0 0 0 0.2rem green';
  }
  return style;
}

export const SimpleFormGroupText = forwardRef((props, ref) => {
  const obj = { ...props.household, ...props.client };
  const style = getValidationStyle(props.getValidationState(props.group));

  return (
    <SimpleFormGroup {...props}>
      <Form.Control
        ref={ref}
        style={style}
        type="text"
        placeholder={
          props.placeholder || `Enter ${getLabel(props)}`
        }
        value={obj[props.group] || ''}
        onChange={e => {
          props.onChange(obj, props.group, e.target.value);
        }}
      />
    </SimpleFormGroup>
  );
});

function areChoicesTranslated(choices) {
  // choices will either be
  //   an object with a key of languageId followed by the set of choices for that language
  // or
  //  a flat array of choices (ex. cities)
  return !Array.isArray(choices);
}

function getChoicesForLanguage({ languageId, choices }) {
  if (!areChoicesTranslated(choices)) return choices;
  const englishChoices = choices[English];

  // non-english translations might be sparse
  // therefore we iterate over the english ones and return
  // the translation if it exists and fall back to english
  // if it does not
  return ( languageId == English ) ?
    englishChoices :
    englishChoices.map( englishChoice =>
      choices[languageId]?.find( c => c.id == englishChoice.id) ||
      englishChoice);
}

function getSortedChoices(props) {
  let choices = getChoicesForLanguage(props)
    .map(({ id, value, set }) => ({
      id,
      value: props.normalized ? id : value,
      display: value,
      set,
    }));

  if ( !props.sortOrder ) {
    choices.sort( ( a, b ) => {
      // we always want unknown to be first
      // unknown can be either -1 or 0 with -1 having the higher precedence
      if (a.display === b.display) return 0;
      if (a.id === -1) return -1;
      if (b.id === -1) return 1;
      if (a.id === 0) return -1;
      if (b.id === 0) return 1;
      return a.display.localeCompare(b.display);
    });
  } else if ( props.sortOrder === 'id' ) {
    choices.sort( (a, b) => a.id - b.id);
  } else {
    console.assert(choices.length === props.sortOrder.length,
      'sortOrder count does not match number of options');
    console.assert((new Set(props.sortOrder)).size === props.sortOrder.length,
      'sortOrder contains duplicates');

    const { sortOrderChoices, badSortOrders } = props.sortOrder.reduce( (accumulator, so) => {
      const foundChoice = choices.find( c => c.id == so);
      if (foundChoice) {
        accumulator.sortOrderChoices.push(foundChoice);
      } else {
        accumulator.badSortOrders.push(so);
      }
      return accumulator;
    }, { sortOrderChoices: [], badSortOrders: [] });
    console.assert(badSortOrders.length == 0,
      'sortOrder contains ids which are not in the choices');

    // then concat any choices that weren't specified in the sort order
    const leftOverChoices = choices.filter( (_, i) => !props.sortOrder.includes(i))
    choices = sortOrderChoices.concat(leftOverChoices);
  }

  return choices;
}


export function SimpleFormGroupRadio(props) {
  const navigate = useNavigate();
  const obj = { ...props.household, ...props.client };
  // render inline if the total length of the values is < 45
  const choices = getChoicesForLanguage(props);
  const inline =
    choices.reduce((accumulator, currentValue) => {
      const { value } = currentValue;
      return accumulator + value.length + 5;
    }, 0) < 65;
  const style = {};
  if (props.getValidationState(props.group) === 'error') {
    style.color = 'red';
  } else if (props.getValidationState(props.group) === 'success') {
    style.color = 'green';
  }

  return (
    <SimpleFormGroup {...props}>
      {getSortedChoices( props )
        .map( ({ id, value, set, display }) => {
          const isChecked = obj[props.group] === value;
          return (
            <Form.Check
              checked={isChecked}
              id={`${props.group}-${id}-${obj.id}`}
              inline={inline}
              key={`${props.group}-${value}-${obj.id}`}
              label={display}
              name={`${props.group}-${obj.id}`}
              onChange={() => {
                props.onChange(obj, props.group, value);
              }}
              onClick={e => {
                if (areChoicesTranslated(props.choices) && e.ctrlKey) {
                  const { languageId } = props;
                  const url = `/translate?set=${set}&id=${id}&languageId=${languageId}`;
                  navigate(url);
                }
              }}
              style={isChecked ? style : {}}
              type="radio"
              value={value}
            />
          );
        })}
    </SimpleFormGroup>
  );
}

export function SimpleFormGroupSelect(props) {
  const navigate = useNavigate();
  const obj = { ...props.household, ...props.client };

  const style = getValidationStyle(props.getValidationState(props.group));

  return (
    <SimpleFormGroup {...props}>
      <Form.Select
        onChange={e => {
          let { value } = e.target;
          if (props.normalized) {
            value = parseInt(value, 10);
          }
          props.onChange(obj, props.group, value);
        }}
        onMouseDown={e => {
          if (areChoicesTranslated(props.choices) && e.ctrlKey) {
            const { languageId } = props;
            // grab the set name from the first English choice
            const [{ set }] = props.choices[English];
            const url = `/translate?set=${set}&languageId=${languageId}`;
            navigate(url);
          }
        }}
        value={obj[props.group]}
        style={style}
      >
        {getSortedChoices(props)
          .map( ({ id, value, display }) => {
            return (
              <option
                id={`${props.group}-${value}-${id}`}
                key={`${props.group}-${value}-${id}`}
                name={`${props.group}-${id}`}
                value={value}
              >
                {display}
              </option>
            );
          })}
      </Form.Select>
    </SimpleFormGroup>
  );
}
