import React from 'react';
import { Col, Form } from 'react-bootstrap';

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
    <Form.Group controlId={`formHorizontal_${props.group}`}>
      <Form.Row>
        <Form.Label column sm={2} style={style}>
          {props.label || capitalize(props.group)}
        </Form.Label>
        <Col>{props.children}</Col>
      </Form.Row>
    </Form.Group>
  );
}

export const SimpleFormGroupText = React.forwardRef((props, ref) => {
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

export function SimpleFormGroupRadio(props) {
  const obj = { ...props.household, ...props.client };
  // render inline if the total length of the values is < 45
  const inline =
    props.choices.reduce((accumulator, currentValue) => {
      const { value } = currentValue;
      return accumulator + value.length + 5;
    }, 0) < 45;
  const style = {};
  if (props.getValidationState(props.group) === 'error') {
    style.color = 'red';
  } else if (props.getValidationState(props.group) === 'success') {
    style.color = 'green';
  }

  return (
    <SimpleFormGroup {...props}>
      {props.choices.map(({ id, value }) => {
        const v = props.normalized ? id : value;
        const isChecked = obj[props.group] === v;
        return (
          <Form.Check
            checked={isChecked}
            custom
            id={`${props.group}-${id}-${obj.id}`}
            inline={inline}
            key={`${props.group}-${value}-${obj.id}`}
            label={value}
            name={`${props.group}-${obj.id}`}
            onChange={() => {
              props.onChange(obj, props.group, v);
            }}
            style={isChecked ? style : {}}
            type="radio"
            value={v}
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
      <Form.Control
        as="select"
        custom
        onChange={e => {
          let { value } = e.target;
          if (props.normalized) {
            value = parseInt(value, 10);
          }
          props.onChange(obj, props.group, value);
        }}
        value={obj[props.group]}
      >
        {props.choices.map(({ id, value }) => {
          const v = props.normalized ? id : value;
          const isSelected = obj[props.group] === v;
          return (
            <option
              id={`${props.group}-${value}-${obj.id}`}
              key={`${props.group}-${value}-${obj.id}`}
              name={`${props.group}-${obj.id}`}
              style={isSelected ? style : {}}
              value={v}
            >
              {value}
            </option>
          );
        })}
      </Form.Control>
    </SimpleFormGroup>
  );
}
