import {
  SimpleFormGroupRadio,
  SimpleFormGroupSelect,
  SimpleFormGroupText,
} from './SimpleFormControls.jsx';
import { useEffect, useRef } from 'preact/hooks';
import { Form } from 'react-bootstrap';
import { addGoogleAddressAutoComplete } from './GoogleAddress.js';

export default function HouseholdDetailForm(props) {
  const address1 = useRef(null);

  const { cities, household, onChange } = props;

  useEffect(() => {
    addGoogleAddressAutoComplete(
      address1,
      cities,
      changes => onChange(household, 'addressAutoComplete', changes))
  }, [cities, onChange, household]);

  return (
    <Form>
      <SimpleFormGroupText
        ref={address1}
        group="address1"
        {...props}
        autocomplete="off"
      />
      <SimpleFormGroupText
        group="address2"
        {...props}
        autocomplete="off"
      />
      <SimpleFormGroupSelect
        group="cityId"
        label="city"
        normalized
        choices={props.cities}
        {...props}
      />
      <SimpleFormGroupText group="zip" {...props} />
      <SimpleFormGroupRadio
        group="incomeLevelId"
        label="income"
        normalized
        choices={window.translations.income_level}
        sortOrder="id"
        {...props}
      />
      <SimpleFormGroupText group="note" {...props} />
    </Form>
  );
}
