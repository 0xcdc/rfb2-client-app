import { Button, Form } from 'react-bootstrap';
import {
  SimpleFormGroupRadio,
  SimpleFormGroupSelect,
  SimpleFormGroupText,
} from './SimpleFormControls.jsx';
import { useEffect, useRef } from 'preact/hooks';

export default function ClientDetailForm(props) {
  const name = useRef(null);

  useEffect(
    () => name.current.focus(),
    [props.client.id]
  );

  return (
    <Form>
      <SimpleFormGroupText
        ref={name}
        group="name"
        label="Name"
        {...props}
      />
      <SimpleFormGroupRadio
        choices={window.translations.gender}
        group="genderId"
        label="Gender"
        normalized
        {...props}
      />
      <SimpleFormGroupText
        group="birthYear"
        label="Birth Year"
        {...props}
      />
      <SimpleFormGroupRadio
        choices={window.translations.yes_no}
        group="disabled"
        normalized
        {...props}
      />
      <SimpleFormGroupRadio
        choices={window.translations.yes_no}
        group="refugeeImmigrantStatus"
        label="Refugee or Immigrant"
        normalized
        {...props}
      />
      <SimpleFormGroupRadio
        choices={window.translations.ethnicity}
        group="ethnicityId"
        label="Ethnicity"
        normalized
        {...props}
      />
      <SimpleFormGroupSelect
        choices={window.translations.race}
        group="raceId"
        label="Race"
        sortOrder={[0, 5, 1, 2, 6, 4, 3, 7, 8]}
        normalized
        {...props}
      />
      <SimpleFormGroupRadio
        choices={window.translations.yes_no}
        group="speaksEnglish"
        label="Speaks English"
        normalized
        {...props}
      />
      <SimpleFormGroupRadio
        choices={window.translations.militaryStatus}
        group="militaryStatusId"
        label="Military Status"
        normalized
        {...props}
      />
      <SimpleFormGroupText
        group="phoneNumber"
        label="Phone Number"
        {...props}
      />
      <Button
        variant="link"
        className='xButton'
        size="sm"
        onClick={() => {
          props.onDelete(props.client);
        }}
      >
        Delete this Client
      </Button>
    </Form>
  );
}
