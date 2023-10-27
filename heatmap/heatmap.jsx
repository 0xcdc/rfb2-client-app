import { DateTime } from 'luxon';
import { render } from 'preact'
import { useState } from 'preact/hooks'

function HeatMapControls({ allHouseholds, mapApi }) {
  const { renderHeatMap } = mapApi;

  const [dissipating, setDissipating] = useState(mapApi.state.dissipating);
  const [opacity, setOpacity] = useState(mapApi.state.opacity);
  const [radius, setRadius] = useState(mapApi.state.radius);
  const [households, setHouseholds] = useState(allHouseholds);
  const [showPins, setShowPins] = useState(mapApi.state.showPins);
  const [timeLimit, setTimeLimit] = useState("thisYear");
  const [colorCities, setColorCities] = useState(mapApi.state.colorCities);

  renderHeatMap({
    dissipating,
    opacity,
    radius,
    households,
    showPins,
    colorCities,
  });

  /* function toggleVisitedThisYear() {
    if (timeLimit) {
      setTimeLimit(null);
      setHouseholds(allHouseholds);
    } else {
      setTimeLimit("thisYear");
      setHouseholds(allHouseholds.filter(h => h.lastVisit > '2023'));
    }
  } */
  function selectHouseholds(timeLimit) {
    if (timeLimit === "all") {
      setHouseholds(allHouseholds);
    } else {
      const now = DateTime.now();
      let startDate;
      let endDate;
      switch (timeLimit) {
        case "thisWeek":
          startDate = now.startOf("week");
          endDate = now.endOf("week");
          break;
        case "lastWeek":
          startDate = now.minus({ weeks: 1 }).startOf("week");
          endDate = now.minus({ weeks: 1 }).endOf("week");
          break;
        case "thisMonth":
          startDate = now.startOf("month");
          endDate = now.endOf("month");
          break;
        case "lastMonth":
          startDate = now.minus({ months: 1 }).startOf("month");
          endDate = now.minus({ months: 1 }).endOf("month");
          break;
        case "thisYear":
          startDate = now.startOf("year");
          endDate = now.endOf("year");
          break;
        case "lastYear":
          startDate = now.minus({ years: 1 }).startOf("year");
          endDate = now.minus({ years: 1 }).endOf("year");
          break;
        default:
          setHouseholds(allHouseholds);
          setTimeLimit(null);
          return;
      } setHouseholds(allHouseholds.filter(
        h => h.lastVisit >= startDate.toISODate() && h.lastVisit <= endDate.toISODate()));
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
        <select id="timeLimitSelect"
          onChange={e =>{
            setTimeLimit(e.target.value);
            selectHouseholds(e.target.value)
          }} value={timeLimit}>
          <option value="thisWeek">This Week</option>
          <option value="lastWeek">Last Week</option>
          <option value="thisMonth">This Month</option>
          <option value="lastMonth">Last Month</option>
          <option value="thisYear" >This Year</option>
          <option value="lastYear">Last Year</option>
          <option value="all">All</option>
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
