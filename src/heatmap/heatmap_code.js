import { foodbankLocation, bellevueLocation, redmondLocation } from '../foodbankLocation';

function getLatLngForHouseholds(households) {
  const { LatLng } = window.libraries.core;

  // coordinates too far away cause it to not work
  const data = households
    .map( ({ latlng }) => latlng)
    .filter( c => Math.abs(c.lat - foodbankLocation.lat) < 1)
    .filter( c => Math.abs(c.lng - foodbankLocation.lng) < 1)
    .map( c => new LatLng(c.lat, c.lng));

  return data;
}

const colors = ["#D741A7", "#006989", "#EE7B30", "#9DACFF", "blue", "red", "green", "yellow"];
let colorIndex = 0;
const colorMap = {};

export async function initMap() {
  //const { Map, InfoWindow } = window.libraries.maps;
  //const { PinElement } = window.libraries.marker;
  const { Map, InfoWindow } = await google.maps.importLibrary("maps");
  const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary(
    "marker",
  );
  const map = new Map(document.getElementById("map"), {
    mapId: '589e2a0c6caa913a',
    zoom: 13,
    center: foodbankLocation,
  });
  
  const pinElement = document.createElement("i");
  pinElement.className = "bi-bank foodbank-icon";
  
 // const { AdvancedMarkerElement } = window.libraries.marker;
  new AdvancedMarkerElement({
    position: foodbankLocation,
    map,
    title: "Renewal Food Bank",
    content: pinElement,
  });

  const cityCenter = [
  {
    position: bellevueLocation,
    title: "Bellevue Center",
  },
  {
    position: redmondLocation,
    title: "Redmond Center",
  },
  ];
  const infoWindow = new InfoWindow();
  cityCenter.forEach(({ position, title }, i ) => {
  
     const pinElement = document.createElement("i");
     pinElement.className = "bi bi-person-arms-up";
     pinElement.style.fontSize = "35px";
    const marker = new AdvancedMarkerElement({
      position,
      map,
      title: `${title}`,
      content: pinElement,
    
    });
    marker.addListener("click", ({ domEvent, latLng }) => {
      const { target } = domEvent;
      infoWindow.close();
     
      const content = `${title}: 0`;
      infoWindow.setContent(content);
      infoWindow.open(marker.map, marker);
    });
    });
  let oldState = {
    pins: [],
    households: [],
    showPins: false,
    dissipating: true,
    radius: 30,
    opacity: 0.8,
    colorCities: false,
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
    const [showPinsChanged, householdsChanged, colorCitiesChanged] = ["showPins", "households", "colorCities"]
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
          position: h.latlng,
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

    oldState = newState;
  }

  /*
  document
    .getElementById("change-opacity")
    .addEventListener("click", changeOpacity);
  document
    .getElementById("increase-radius")
    .addEventListener("click", () => changeRadius(+5));
  document
    .getElementById("decrease-radius")
    .addEventListener("click", () => changeRadius(-5));
  */
  return { renderHeatMap, state: oldState };
}
