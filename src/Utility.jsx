import { useEffect, useState } from 'preact/hooks'
import graphQL from './graphQL.js';

function getCorrectedAddress(place, cities) {
  console.log(place);
  let addressline = "";
  let addressline2 = "";
  let locality = "";
  let postcode = "";

  // Get each component of the address from the place details,
  // and then fill-in the corresponding field on the form.
  // place.address_components are google.maps.GeocoderAddressComponent objects
  // which are documented at http://goo.gle/3l5i5Mr

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

  const cityId = cities.find( c => c.value == locality)?.id??0;

  const { location } = place.geometry;
  const latlng = JSON.stringify({
    lat: location.lat(),
    lng: location.lng(),
  });

  return {
    address1: addressline,
    address2: addressline2,
    zip: postcode,
    cityId,
    latlng,
  };
}

function lookupLocation(household, cities) {
  // no address1, no geocode
  if ( !household.address1 ) {
    return Promise.resolve('');
  }

  if (household.cityId != 0) {
    const city = cities.find( city => city.id == household.cityId);
    household.cityName = city.value;
  } else {
    household.cityName = '';
  }

  const address = `${household.address1} ${household.address2} ${household.cityName} ${household.zip}`;

  const request = {
    address,
    region: 'US',
  }

  console.log(`looking up ${address}`);
  const { Geocoder } = window.libraries.geocoding;
  const geocoder = new Geocoder();
  return geocoder
    .geocode( request )
    .then( result => {
      const { results } = result;
      const [firstResult] = results;

      if ( firstResult.partial_match ) {
        console.log('Partial match, ignoring');
        return null;
      }
      return getCorrectedAddress(firstResult, cities);
    })
    .catch( e => {
      console.log(`geocode failed with ${e}`);
      return null;
    });
}

async function resolveAddresses(households, cities) {
  const result = [];
  for (const household of households) {
    const resolvedHousehold = await lookupLocation(household, cities);
    if (!resolvedHousehold) {
      result.push(`${household.id}: not resolved`);
    } else {
      console.log(household);
      console.log(resolvedHousehold);
      const changedKeys = Object.keys(resolvedHousehold).filter( k =>
        resolvedHousehold[k] != household[k]
      );
      const allEqual = changedKeys.length == 0;
      if (allEqual) {
        result.push(`${household.id}: no changes needed`);
      } else {
        const changes = changedKeys.map( k =>
          `${k}: ${household[k]} => ${resolvedHousehold[k]}`
        ).join('\n');
        result.push(`${household.id}: ${changes}`);
      }
    }
  }
  return result;
}

export default function Utility() {
  const [allHouseholds, setAllHouseholds] = useState([]);
  const [cities, setCities] = useState([]);

  useEffect( () => {
    if (cities.length == 0) {
      const query = '{cities{id value:name}}';

      graphQL(query, 'cities').then( json => {
        const { cities } = json.data;
        setCities(cities);
      });
    } else if (allHouseholds.length == 0) {
      const query = `{households(ids: []) { id latlng address1 address2 zip cityId }}`;

      graphQL(query).then( json => {
        let { households } = json.data;
        households = households.slice(0, 100);

        resolveAddresses(households, cities).then( households => {
          setAllHouseholds(households);
        });
      });
    }
  });

  let counter = 0;
  return (
    <>
      { allHouseholds
        .map( h => <div key={counter++}>{h}</div> )
      }
    </>
  );
}
