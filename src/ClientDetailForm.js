import { Button, Form } from 'react-bootstrap';
import React, { Component } from 'react';
import {
  SimpleFormGroupRadio,
  SimpleFormGroupSelect,
  SimpleFormGroupText,
} from './SimpleFormControls';

export default class ClientDetailForm extends Component {
  constructor(props) {
    super(props);

    this.name = React.createRef();
  }

  componentDidMount() {
    this.focus();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.client.id !== this.props.client.id) {
      this.focus();
    }
  }

  focus() {
    this.name.current.focus();
  }

  render() {
    return (
      <Form>
        <SimpleFormGroupText
          ref={this.name}
          group="name"
          label="Name"
          {...this.props}
        />
        <SimpleFormGroupRadio
          choices={this.props.genders}
          group="genderId"
          label="Gender"
          normalized
          {...this.props}
        />
        <SimpleFormGroupRadio
          choices={this.props.yesNos}
          group="disabled"
          normalized
          {...this.props}
        />
        <SimpleFormGroupText
          group="birthYear"
          label="Birth Year"
          {...this.props}
        />
        <SimpleFormGroupRadio
          choices={this.props.yesNos}
          group="refugeeImmigrantStatus"
          label="Refugee or Immigrant"
          normalized
          {...this.props}
        />
        <SimpleFormGroupRadio
          choices={this.props.ethnicities}
          group="ethnicityId"
          label="Ethnicity"
          normalized
          {...this.props}
        />
        <SimpleFormGroupSelect
          choices={this.props.races}
          group="raceId"
          label="Race"
          normalized
          {...this.props}
        />
        <SimpleFormGroupRadio
          choices={this.props.yesNos}
          group="speaksEnglish"
          label="Speaks English"
          normalized
          {...this.props}
        />
        <SimpleFormGroupRadio
          choices={this.props.militaryStatuses}
          group="militaryStatusId"
          label="Military Status"
          normalized
          {...this.props}
        />
        <Button
          variant="link"
          className='xButton'
          size="sm"
          onClick={() => {
            this.props.onDelete(this.props.client);
          }}
        >
          Delete this Client
        </Button>
      </Form>
    );
  }
}
