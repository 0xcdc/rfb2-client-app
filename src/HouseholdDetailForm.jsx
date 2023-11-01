import {
  SimpleFormGroupRadio,
  SimpleFormGroupSelect,
  SimpleFormGroupText,
} from './SimpleFormControls.jsx';
import { useEffect, useRef } from 'preact/hooks';
import { Form } from 'react-bootstrap';
import { foodbankLocation } from './foodbankLocation.js';

const { Autocomplete } = window.libraries.places;
const { LatLngBounds } = window.libraries.core;

export default function HouseholdDetailForm(props) {
  const address1 = useRef(null);

  useEffect(() => {
    // Create the autocomplete object, restricting the search predictions to
    // addresses in the US and Canada.

    const [sw, ne] = [[-1, -1], [1, 1]].map( vec => ({
      lat: foodbankLocation.lat + vec[0],
      lng: foodbankLocation.lng + vec[1],
    }));

    const autocomplete = new Autocomplete(
      address1.current, {
        componentRestrictions: { country: ["us", "ca"] },
        fields: ["address_components", "geometry"],
        types: ["address"],
        bounds: new LatLngBounds(sw, ne),
      }
    );

    function fillInAddress() {
      const place = autocomplete.getPlace();

      let addressline = "";
      let addressline2 = "";
      let locality = "";
      let postcode = "";

      // Get each component of the address from the place details,
      // and then fill-in the corresponding field on the form.
      // place.address_components are google.maps.GeocoderAddressComponent objects
      // which are documented at http://goo.gle/3l5i5Mr

      if (!place.address_components) {
        console.log("unexpected missing address components");
        console.log(place)
      }

      if (place.address_components) {
        for (let i=0; i < place.address_components.length; i++) {
          const component = place.address_components[i];
          const [componentType] = component.types;

          switch (componentType) {
            case "street_number": {
              addressline = `${component.long_name} ${addressline}`;
              break;
            }

            case "route": {
              addressline += component.short_name;
              break;
            }

            case "postal_code": {
              postcode = `${component.long_name}${postcode}`;
              break;
            }

            case "postal_code_suffix": {
              postcode = `${postcode}-${component.long_name}`;
              break;
            }

            case "subpremise": {
              addressline2 = component.long_name;
              break;
            }

            case "locality":
              locality = component.long_name;
              break;
          }
        }

        const city = props.cities.find( c => c.value == locality);
        if (city) {
          props.onChange(props.household, "cityId", city.id);
        } else {
          props.onChange(props.household, "cityId", 0);
        }

        props.onChange(props.household, "address1", addressline);
        if (addressline2) props.onChange(props.household, "address2", addressline2);
        props.onChange(props.household, "zip", postcode);
      }
    }


    autocomplete.addListener("place_changed", fillInAddress);
  });

  return (
    <Form>
      <SimpleFormGroupText
        ref={address1}
        group="address1"
        label="Address 1"
        {...props}
        autocomplete="off"
      />
      <SimpleFormGroupText
        group="address2"
        label="Address 2"
        {...props}
        autocomplete="off"
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
