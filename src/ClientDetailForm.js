import { Button, Form } from 'react-bootstrap';
import React, { useEffect, useRef } from 'react';
import {
  SimpleFormGroupRadio,
  SimpleFormGroupSelect,
  SimpleFormGroupText,
} from './SimpleFormControls';

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
        choices={props.genders}
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
        choices={props.yesNos}
        group="disabled"
        normalized
        {...props}
      />
      <SimpleFormGroupRadio
        choices={props.yesNos}
        group="refugeeImmigrantStatus"
        label="Refugee or Immigrant"
        normalized
        {...props}
      />
      <SimpleFormGroupRadio
        choices={props.ethnicities}
        group="ethnicityId"
        label="Ethnicity"
        normalized
        {...props}
      />
      <SimpleFormGroupSelect
        choices={props.races}
        group="raceId"
        label="Race"
        sortOrder={[0, 5, 1, 2, 6, 4, 3, 7, 8]}
        normalized
        {...props}
      />
      <SimpleFormGroupRadio
        choices={props.yesNos}
        group="speaksEnglish"
        label="Speaks English"
        normalized
        {...props}
      />
      <SimpleFormGroupRadio
        choices={props.militaryStatuses}
        group="militaryStatusId"
        label="Military Status"
        normalized
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
