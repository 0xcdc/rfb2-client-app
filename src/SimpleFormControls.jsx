import { Col, Form, Row } from 'react-bootstrap';
import { forwardRef } from 'preact/compat';

function capitalize(v) {
  return v.charAt(0).toUpperCase() + v.substring(1);
}

export function SimpleFormGroup(props) {
  const style = {};
  if (props.getValidationState(props.group) === 'error') {
    style.color = 'red';
  } else if (props.getValidationState(props.group) === 'success') {
    style.color = 'green';
  }

  return (
    <Form.Group as={Row} className="mb-3" controlId={`formHorizontal_${props.group}`}>
      <Form.Label column sm={2} style={style}>
        {props.label || capitalize(props.group)}
      </Form.Label>
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
          props.placeholder || `Enter ${props.label || capitalize(props.group)}`
        }
        value={obj[props.group] || ''}
        onChange={e => {
          props.onChange(obj, props.group, e.target.value);
        }}
      />
    </SimpleFormGroup>
  );
});

function getChoicesForLanguage({ languageId, choices }) {
  // choices will either be
  //   an object with a key of languageId followed by the set of choices for that language
  // or
  //  a flat array of choices (ex. cities)
  if (Array.isArray(choices)) return choices;
  const englishChoices = choices['0'];

  // non-english translations might be sparse
  // therefore we iterate over the english ones and return
  // the translation if it exists and fall back to english
  // if it does not
  return ( languageId == 0 ) ?
    englishChoices :
    englishChoices.map( englishChoice =>
      choices[languageId]?.find( c => c.id == englishChoice.id) ||
      englishChoice);
}

function getSortedChoices(props) {
  let choices = getChoicesForLanguage(props)
    .map(({ id, value }) => ({
      id,
      value: props.normalized ? id : value,
      display: value }));

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
        .map( ({ id, value, display }) => {
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
