import graphQL from "../src/graphQL.js";

const foodbankLocation = {
  lat: 47.627714616397895,
  lng: -122.13934521724865,
};

async function loadHouseholds() {
  const query = `{households(ids: []) { latlng lastVisit }}`;

  const json = await graphQL(query, 'households');
  let { households } = json.data;
  households = households
    .filter( ({ latlng }) => latlng != '')
    .map( ({ lastVisit, latlng }) => ({
      lastVisit,
      latlng: JSON.parse(latlng),
    }));

  return households;
}

export async function initMap() {
  const libraryNames = ['maps', 'core', 'marker', 'visualization'];
  const loadedLibraries = await Promise.all(
    libraryNames.map( lib => window.google.maps.importLibrary(lib) )
  );
  const libraries = Object.fromEntries(libraryNames.map( (name, index) => [name, loadedLibraries[index]]));

  const { Map } = libraries.maps;
  const { LatLng } = libraries.core;
  const { AdvancedMarkerElement } = libraries.marker;
  const { HeatmapLayer } = libraries.visualization;

  const map = new Map(document.getElementById("map"), {
    mapId: '589e2a0c6caa913a',
    zoom: 13,
    center: foodbankLocation,
  });


  const allHouseholds = await loadHouseholds();
  let households = allHouseholds;

  function getLatLngForHouseholds(households) {
    // coordinates too far away cause it to not work
    const data = households
      .map( ({ latlng }) => latlng)
      .filter( c => Math.abs(c.lat - foodbankLocation.lat) < 1)
      .filter( c => Math.abs(c.lng - foodbankLocation.lng) < 1)
      .map( c => new LatLng(c.lat, c.lng));

    return data;
  }


  const pinElement = document.createElement("i");
  pinElement.className = "bi-bank foodbank-icon";

  new AdvancedMarkerElement({
    position: foodbankLocation,
    map,
    title: "Renewal Food Bank",
    content: pinElement,
  });

  const data = getLatLngForHouseholds(households);

  const gradient = [
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
  ];

  const heatmap = new HeatmapLayer({
    data,
    dissipating: true,
    radius: 30,
    map,
    opacity: 0.8,
    gradient,
  });

  function toggleDissipating() {
    const dissipating = heatmap.get("dissipating") ?? true;
    heatmap.set("dissipating", dissipating ^ true);
  }

  let pins = null;

  function togglePins() {
    if ( pins ) {
      // clear out the old pins
      pins.map( p => p.map = null);
      pins = null;
    } else {
      pins = households.map( h => new AdvancedMarkerElement({
        map,
        position: h.latlng,
      }));
    }
  }

  function changeRadius(delta) {
    const radius = heatmap.get("radius") ?? 30;
    heatmap.set("radius", radius + delta);
  }

  function changeOpacity() {
    let opacity = heatmap.get("opacity") ?? 0.8;
    opacity = 1-opacity;
    heatmap.set("opacity", opacity);
  }

  function visitThisYear(e) {
    // This is my ideas of the visitedThisYear event handler code
    /*
       const checkbox = doccument.getElementById("visitedThisYear");
       const isChecked = checkbox.checked;
       if(isChecked){
       const currentYear = new Date().getFullYear();
       const filteredData = data.filter((visit) => {
       const visitYear = new Data(visit.date).getFullYear();
       return visitYear === currentYear;
       });

       heatmap.setData(filteredData);
       } else {
       heatmap.setData(data);
       }*/
    console.log(e);
    if (households == allHouseholds) {
      households = allHouseholds.filter(h => h.lastVisit > '2023');
    } else {
      households = allHouseholds;
    }
    const data = getLatLngForHouseholds(households);
    heatmap.setData(data);
  }

  document
    .getElementById("toggle-pins")
    .addEventListener("click", togglePins);
  document
    .getElementById("change-opacity")
    .addEventListener("click", changeOpacity);
  document
    .getElementById("increase-radius")
    .addEventListener("click", () => changeRadius(5));
  document
    .getElementById("decrease-radius")
    .addEventListener("click", () => changeRadius(-5));
  document
    .getElementById("change-dissipating")
    .addEventListener("click", toggleDissipating);
  document
    .getElementById("filter-visited-this-year")
    .addEventListener("change", visitThisYear)
}
