import React, { Component } from 'react';
import {
  SimpleFormGroupRadio,
  SimpleFormGroupSelect,
  SimpleFormGroupText,
} from './SimpleFormControls';
import { Form } from 'react-bootstrap';

export default class HouseholdDetailForm extends Component {
  constructor(props) {
    super(props);

    this.address1 = React.createRef();
  }

  componentDidMount() {
    this.focus();
  }

  focus() {
    this.address1.current.focus();
  }

  render() {
    return (
      <div>
        <Form>
          <SimpleFormGroupText
            ref={this.address1}
            group="address1"
            label="Address 1"
            {...this.props}
          />

          <SimpleFormGroupText
            group="address2"
            label="Address 2"
            {...this.props}
          />
          <SimpleFormGroupSelect
            group="cityId"
            label="City"
            normalized
            choices={this.props.cities}
            {...this.props}
          />
          <SimpleFormGroupText group="zip" {...this.props} />
          <SimpleFormGroupRadio
            group="incomeLevelId"
            label="Income"
            normalized
            choices={this.props.incomeLevels}
            {...this.props}
          />
          <SimpleFormGroupText group="note" {...this.props} />
        </Form>
      </div>
    );
  }
}
