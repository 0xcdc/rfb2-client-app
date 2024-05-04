import { foodbankLocation } from './foodbankLocation.js';

export function addGoogleAddressAutoComplete(ref, cities, onChange) {
  const { Autocomplete } = window.libraries.places;
  const { LatLngBounds } = window.libraries.core;

  // Create the autocomplete object, restricting the search predictions to
  // addresses in the US and Canada.

  const [sw, ne] = [[-1, -1], [1, 1]].map( vec => ({
    lat: foodbankLocation.lat + vec[0],
    lng: foodbankLocation.lng + vec[1],
  }));

  const autocomplete = new Autocomplete(
    ref.current, {
      componentRestrictions: { country: ["us"] },
      fields: ["address_components", "geometry"],
      types: ["address"],
      bounds: new LatLngBounds(sw, ne),
    }
  );

  function fillInAddress() {
    const place = autocomplete.getPlace();

    let address1= "";
    let address2 = "";
    let locality = "";
    let zip = "";

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
            address1 = `${component.long_name} ${address1}`;
            break;
          }

          case "route": {
            address1 += component.short_name;
            break;
          }

          case "postal_code": {
            zip = `${component.long_name}${zip}`;
            break;
          }

          case "postal_code_suffix": {
            zip = `${zip}-${component.long_name}`;
            break;
          }

          case "subpremise": {
            address2 = component.long_name;
            break;
          }

          case "locality":
            locality = component.long_name;
            break;
        }
      }

      const cityId = cities.find( c => c.value == locality)?.id ?? 0;
      const { location } = place.geometry;
      const changes = {
        address1,
        cityId,
        location,
        zip,
      };

      if (address2) {
        changes.address2 = address2;
      }

      onChange(changes);
    }
  }

  autocomplete.addListener("place_changed", fillInAddress);
}
