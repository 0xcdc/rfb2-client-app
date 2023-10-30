import { DateTime } from 'luxon';
import { render } from 'preact'
import { useState } from 'preact/hooks'

function HeatMapControls({ allHouseholds, mapApi }) {
  const { renderHeatMap } = mapApi;

  function getSelectedHouseholds(timeLimit) {
    if (timeLimit === "all") {
      return allHouseholds;
    }

    const now = DateTime.now();
    const delta = {};
    delta[timeLimit] = 1;
    const startDate = now.minus(delta);
    return allHouseholds.filter(h => h.lastVisit >= startDate.toISODate());
  }

  const [colorCities, setColorCities] = useState(mapApi.state.colorCities);
  const [dissipating, setDissipating] = useState(mapApi.state.dissipating);
  const [households, setHouseholds] = useState(getSelectedHouseholds("year"));
  const [opacity, setOpacity] = useState(mapApi.state.opacity);
  const [radius, setRadius] = useState(mapApi.state.radius);
  const [showPins, setShowPins] = useState(mapApi.state.showPins);
  const [timeLimit, setTimeLimit] = useState("year");

  renderHeatMap({
    dissipating,
    opacity,
    radius,
    households,
    showPins,
    colorCities,
  });

  return (
    <div id="floating-panel">
      <button id="toggle-pins" onclick={() => setShowPins(!showPins) }>Toggle Pins</button>
      <button id="decrease-radius" onClick={() => setRadius(radius - 5) }>Decrease radius</button>
      <button id="increase-radius" onClick={() => setRadius(radius + 5) }>Increase radius</button>
      <button id="change-opacity" onClick={() => setOpacity(1- opacity) }>Change opacity</button>
      <button id="change-dissipating" onClick={() => setDissipating(!dissipating) }>Change dissipating</button>
      <button id="change-show-cities" onClick={() => setColorCities(!colorCities) }>Fill City Boundaries</button>
      <label>
        <span style={{ padding: "15px" }}>Households visited in the last:</span>
        <select id="timeLimitSelect"
          onChange={e => {
            setTimeLimit(e.target.value);
            setHouseholds(getSelectedHouseholds(e.target.value));
          }}
          value={timeLimit}>
          <option value="week">Last Week</option>
          <option value="month">Last Month</option>
          <option value="quarter">Last Quarter</option>
          <option value="year">Last year</option>
          <option value="all">All Time</option>
        </select>
      </label>
    </div>);
}

export function initHeatMap(allHouseholds, mapApi) {
  render(
    <HeatMapControls allHouseholds={allHouseholds} mapApi={mapApi} />,
    document.getElementById('heatmap-controls')
  );
}
