import { render } from 'preact'
import { useState } from 'preact/hooks'

function HeatMapControls({ allHouseholds, mapApi }) {
  const { renderHeatMap } = mapApi;

  const [dissipating, setDissipating] = useState(mapApi.state.dissipating);
  const [opacity, setOpacity] = useState(mapApi.state.opacity);
  const [radius, setRadius] = useState(mapApi.state.radius);
  const [households, setHouseholds] = useState(allHouseholds);
  const [showPins, setShowPins] = useState(mapApi.state.showPins);
  const [timeLimit, setTimeLimit] = useState(null);
  const [colorCities, setColorCities] = useState(mapApi.state.colorCities);

  renderHeatMap({
    dissipating,
    opacity,
    radius,
    households,
    showPins,
    colorCities,
  });

  function toggleVisitedThisYear() {
    if (timeLimit) {
      setTimeLimit(null);
      setHouseholds(allHouseholds);
    } else {
      setTimeLimit("thisYear");
      setHouseholds(allHouseholds.filter(h => h.lastVisit > '2023'));
    }
  }


  return (
    <div id="floating-panel">
      <button id="toggle-pins" onclick={() => setShowPins(!showPins) }>Toggle Pins</button>
      <button id="decrease-radius" onClick={() => setRadius(radius - 5) }>Decrease radius</button>
      <button id="increase-radius" onClick={() => setRadius(radius + 5) }>Increase radius</button>
      <button id="change-opacity" onClick={() => setOpacity(1- opacity) }>Change opacity</button>
      <button id="change-dissipating" onClick={() => setDissipating(!dissipating) }>Change dissipating</button>
      <button id="change-show-cities" onClick={() => setColorCities(!colorCities) }>Fill City Boundaries</button>
      <label>
        <input type="checkbox" onClick={ toggleVisitedThisYear } />
        Visited this year
      </label>
    </div>);
}

export function initHeatMap(allHouseholds, mapApi) {
  render(
    <HeatMapControls allHouseholds={allHouseholds} mapApi={mapApi} />,
    document.getElementById('heatmap-controls')
  );
}
