import { foodbankLocation } from '../foodbankLocation';
import graphQL from '../graphQL.js';

function getLatLngForHouseholds(households) {
  const { LatLng } = window.libraries.core;

  // coordinates too far away cause it to not work
  const data = households
    .map( h => h.location)
    .filter( c => Math.abs(c.lat - foodbankLocation.lat) < 1)
    .filter( c => Math.abs(c.lng - foodbankLocation.lng) < 1)
    .map( c => new LatLng(c.lat, c.lng));

  return data;
}

const colors = ["#D741A7", "#006989", "#EE7B30", "#9DACFF", "blue", "red", "green", "yellow"];
let colorIndex = 0;
const colorMap = {};

async function getCityCenter() {
  const query = `{ cities { latlng name } }`;
  const json = await graphQL(query, 'cities');
  const { cities } = json.data;
  const cityCenter = [
    {
      position: foodbankLocation,
      title: "Unknown",
    },
    ...cities.map(({ latlng, name }) => ({
      position: latlng ? JSON.parse(latlng) : '',
      title: name,
    })),
  ];
  return cityCenter;
}

export async function initMap() {
  const { Map } = window.libraries.maps;
  const { AdvancedMarkerElement } = window.libraries.marker;

  const map = new Map(document.getElementById("map"), {
    mapId: '589e2a0c6caa913a',
    zoom: 13,
    center: foodbankLocation,
  });
  const cityCenter = await getCityCenter();
  let oldState = {
    pins: [],
    cityPins: [],
    households: [],
    showPins: false,
    dissipating: true,
    radius: 30,
    opacity: 0.8,
    colorCities: false,
    cityCounts: {},
    noAddressActualPins: {},
  };

  const { HeatmapLayer } = window.libraries.visualization;
  const heatmap = new HeatmapLayer({
    data: oldState.households,
    map,
    gradient: [
      "rgba(0, 255, 255, 0)",
      "rgba(0, 255, 255, 1)",
      "rgba(0, 191, 255, 1)",
      "rgba(0, 127, 255, 1)",
      "rgba(0, 63, 255, 1)",
      "rgba(0, 0, 255, 1)",
      "rgba(0, 0, 223, 1)",
      "rgba(0, 0, 191, 1)",
      "rgba(0, 0, 159, 1)",
      "rgba(0, 0, 127, 1)",
      "rgba(63, 0, 91, 1)",
      "rgba(127, 0, 63, 1)",
      "rgba(191, 0, 31, 1)",
      "rgba(255, 0, 0, 1)",
    ],
    opacity: oldState.opacity,
    radius: oldState.radius,
    dissipating: oldState.dissipating,
  });

  function renderHeatMap(newState) {
    // fields that have the same name for us and the heatmap we can handle generically
    const diff = (f, o, n) => (o[f] != n[f]);
    ["dissipating", "opacity", "radius"].map( field => {
      if ( diff(field, oldState, newState) ) {
        heatmap.set(field, newState[field]);
      }
    });
    const [showPinsChanged, householdsChanged, colorCitiesChanged, cityCountsChanged] =
      ["showPins", "households", "colorCities", "cityCounts"]
        .map( field => diff(field, oldState, newState));

    // pins and households are co-dependent
    if ( showPinsChanged || householdsChanged ) {
      // clear out the old pins (if any)
      oldState.pins.map( p => p.map = null);
      oldState.pins = [];

      // create new pins based on new households
      if ( newState.showPins ) {
        newState.pins = newState.households.map( h => new AdvancedMarkerElement({
          map,
          position: h.location,
        }));
      } else {
        newState.pins = [];
      }
    } else {
      // carry the old pins forward
      newState.pins = oldState.pins;
    }

    if ( householdsChanged ) {
      const data = getLatLngForHouseholds(newState.households);
      heatmap.setData(data);
    }

    if ( colorCitiesChanged ) {
      const { FeatureType } = window.libraries.maps;
      const featureLayer = map.getFeatureLayer(FeatureType.LOCALITY);
      if ( newState.colorCities ) {
        featureLayer.style = featureStyleFunctionOptions => {
          if (map.getZoom() < 11) return null;

          const placeFeature = featureStyleFunctionOptions.feature;
          const { placeId } = placeFeature;
          if (!colorMap[placeId]) {
            colorMap[placeId] = colors[colorIndex];
            colorIndex += 1;
            colorIndex %= colors.length;
          }

          const fillColor = colorMap[placeId];

          return {
            fillColor,
            fillOpacity: 0.5,
          };
        }
      } else {
        featureLayer.style = null;
      }
    }

    if (cityCountsChanged) {
      // clear out the old pins (if any)
      oldState.cityPins.map( p => p.map = null);
      // create the new pins
      newState.cityPins = cityCenter.map(({ position, title }) => {
        const icon = title == "Unknown" ? 'bi-bank' : 'bi-person-arms-up';
        const pinElement = document.createElement("i");
        pinElement.className = `bi ${icon} foodbank-icon`;
        const cityCount = newState.cityCounts[title] ?? { noAddress: 0, hasAddress: 0 };
        pinElement.innerText = `${(cityCount.hasAddress)} (+${cityCount.noAddress})`;
        const marker = new AdvancedMarkerElement({
          position,
          map,
          title:
`There are ${cityCount.hasAddress} households with an address and a city of ${title}
There are ${cityCount.noAddress} households with no address and a city of ${title}`,
          content: pinElement,
        });

        return marker;
      });
    } else {
      // carry the internal state forward
      newState.cityPins = oldState.cityPins;
    }

    oldState = newState;
  }

  return { renderHeatMap, state: oldState };
}
