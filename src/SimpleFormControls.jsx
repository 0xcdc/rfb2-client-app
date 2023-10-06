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

export const SimpleFormGroupText = forwardRef((props, ref) => {
  const obj = { ...props.household, ...props.client };
  const style = {};
  if (props.getValidationState(props.group) === 'error') {
    style.boxShadow = '0 0 0 0.2rem red';
  } else if (props.getValidationState(props.group) === 'success') {
    style.boxShadow = '0 0 0 0.2rem green';
  }

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

function getSortedChoices(props) {
  let choices = props.choices
    .map(({ id, value }) => ({
      id,
      value: props.normalized ? id : value,
      display: value }));

  if ( !props.sortOrder ) {
    choices.sort( ( a, b ) => {
      // we always want unknown to be first
      if (a.display === b.display) return 0;
      if (a.display === 'Unknown') return -1;
      if (b.display === 'Unknown') return 1;
      return a.display.localeCompare(b.display);
    });
  } else if ( props.sortOrder === 'id' ) {
    choices.sort( (a, b) => a.id - b.id);
  } else {
    console.assert(choices.length === props.sortOrder.length,
      'sortOrder does not match number of options');
    choices = props.sortOrder.map( i => choices[i]);
  }

  return choices;
}


export function SimpleFormGroupRadio(props) {
  const obj = { ...props.household, ...props.client };
  // render inline if the total length of the values is < 45
  const inline =
    props.choices.reduce((accumulator, currentValue) => {
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

  const style = {};
  if (props.getValidationState(props.group) === 'error') {
    style.color = 'red';
  } else if (props.getValidationState(props.group) === 'success') {
    style.color = 'green';
  }

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
      >
        {getSortedChoices(props)
          .map( ({ id, value, display }) => {
            const isSelected = obj[props.group] === value;
            return (
              <option
                id={`${props.group}-${value}-${id}`}
                key={`${props.group}-${value}-${id}`}
                name={`${props.group}-${id}`}
                style={isSelected ? style : {}}
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
