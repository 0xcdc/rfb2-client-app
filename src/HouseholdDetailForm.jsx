import {
  SimpleFormGroupRadio,
  SimpleFormGroupSelect,
  SimpleFormGroupText,
} from './SimpleFormControls.jsx';
import { useEffect, useRef } from 'preact/hooks';
import { Form } from 'react-bootstrap';

export default function HouseholdDetailForm(props) {
  const address1 = useRef(null);

  useEffect(() => {
    address1.current.focus();
  }, []);

  return (
    <Form>
      <SimpleFormGroupText
        ref={address1}
        group="address1"
        label="Address 1"
        {...props}
      />
      <SimpleFormGroupText
        group="address2"
        label="Address 2"
        {...props}
      />
      <SimpleFormGroupSelect
        group="cityId"
        label="City"
        normalized
        choices={props.cities}
        {...props}
      />
      <SimpleFormGroupText group="zip" {...props} />
      <SimpleFormGroupRadio
        group="incomeLevelId"
        label="Income"
        normalized
        choices={props.incomeLevels}
        sortOrder="id"
        {...props}
      />
      <SimpleFormGroupText group="note" {...props} />
    </Form>
  );
}
