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
        {...props}
      />
      <SimpleFormGroupRadio
        choices={window.translations.gender}
        group="genderId"
        label="gender"
        normalized
        {...props}
      />
      <SimpleFormGroupText
        group="birthYear"
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
        label="refugee"
        normalized
        {...props}
      />
      <SimpleFormGroupRadio
        choices={window.translations.ethnicity}
        group="ethnicityId"
        label="ethnicity"
        normalized
        {...props}
      />
      <SimpleFormGroupSelect
        choices={window.translations.race}
        group="raceId"
        label="race"
        sortOrder={[0, 5, 1, 2, 6, 4, 3, 7, 8]}
        normalized
        {...props}
      />
      <SimpleFormGroupRadio
        choices={window.translations.yes_no}
        group="speaksEnglish"
        normalized
        {...props}
      />
      <SimpleFormGroupRadio
        choices={window.translations.militaryStatus}
        group="militaryStatusId"
        label="militaryStatus"
        normalized
        {...props}
      />
      <SimpleFormGroupText
        group="phoneNumber"
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
