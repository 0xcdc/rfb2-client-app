import graphQL from "../src/graphQL.js";

let map, heatmap;

export async function initMap() {
  const foodbankLocation = {
    lat: 47.627714616397895,
    lng: -122.13934521724865,
  };

  const { Map } = await window.google.maps.importLibrary("maps");
  map = new Map(document.getElementById("map"), {
    mapId: '589e2a0c6caa913a',
    zoom: 13,
    center: foodbankLocation,
  });

  const { AdvancedMarkerElement } = await window.google.maps.importLibrary("marker");

  const pinElement = document.createElement("i");
  pinElement.className = "bi-bank foodbank-icon";


  new AdvancedMarkerElement({
    position: foodbankLocation,
    map,
    title: "Renewal Food Bank",
    content: pinElement,
  });


  const { LatLng } = await window.google.maps.importLibrary("core");
  //coordinates too far away cause it to not work
  let data = (await getCoordinates())
    .filter( c => Math.abs(c.lat - foodbankLocation.lat) < 1)
    .filter( c => Math.abs(c.lng - foodbankLocation.lng) < 1)
    .map( c => new LatLng(c.lat, c.lng));

  const { HeatmapLayer } = await window.google.maps.importLibrary("visualization");
  heatmap = new HeatmapLayer({
    data,
    dissipating: true,
    radius: 30,
    map,
    opacity: 0.8,
  });

  document
    .getElementById("toggle-heatmap")
    .addEventListener("click", toggleHeatmap);
  document
    .getElementById("change-gradient")
    .addEventListener("click", changeGradient);
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
}

function toggleDissipating() {
  let dissipating = heatmap.get("dissipating") ?? true;
  heatmap.set("dissipating",  dissipating ^ true);
}

function toggleHeatmap() {
  heatmap.setMap(heatmap.getMap() ? null : map);
}

function changeGradient() {
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

  heatmap.set("gradient", heatmap.get("gradient") ? null : gradient);
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

async function getCoordinates() {
  const query = `{households(ids: []) { latlng }}`;

  const json = await graphQL(query, 'households');
  let { households } = json.data;
  let coordinates = households
    .map( h => h.latlng)
    .filter( c => c && true)
    .map( c => JSON.parse(c));
  return coordinates;
}
