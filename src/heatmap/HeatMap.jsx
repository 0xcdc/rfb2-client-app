import './heatmap_style.css';

import { useEffect, useState } from 'preact/hooks'
import { DateTime } from 'luxon';
import graphQL from '../graphQL.js';
import { initMap } from './heatmap_code.js';
import { render } from 'preact'

function HeatMapControls({ allHouseholds, mapApi, cityCounts }) {
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


  const [showMessage, setShowMessage] = useState(false);
  const [summarizeDataMessage, setSummarizeDataMessage] = useState('');
  const handleSummarizeDataClick = () => {
    const summarizeDataMessage = JSON.stringify(cityCounts, null, 2)
      .replace(/[{}]/g, '');
    setSummarizeDataMessage(summarizeDataMessage);
    setShowMessage(!showMessage);
  }
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
      <button
        variant="danger"
        onClick={handleSummarizeDataClick}
      >Summarize Data
      </button>
      {showMessage && (
        <div className="message-box">
          {summarizeDataMessage}
        </div>
      )}
    </div>);
}

export function initHeatMap(allHouseholds, mapApi) {
  render(
    <HeatMapControls allHouseholds={allHouseholds} mapApi={mapApi} />,
    document.getElementById('heatmap-controls')
  );
}

export default function HeatMap() {
  const [mapApi, setMapApi] = useState(null);
  const [allHouseholds, setAllHouseholds] = useState([]);
  const [cityCounts, setCityCounts] = useState({});
  useEffect( () => {
    if (allHouseholds.length == 0) {
      const query = `{households(ids: []) { latlng lastVisit city{name} }}`;

      graphQL(query, 'households').then( json => {
        let { households } = json.data;
        households = households
          .filter( ({ latlng }) => latlng != '')
          .map( ({ lastVisit, latlng, city }) => ({
            lastVisit,
            latlng: JSON.parse(latlng),
            city,
          }));
        initMap(households).then( mapApi => {
          setAllHouseholds(households);
          setMapApi(mapApi);
          // calculate the cityCount
          const cityCounts = {};
          households.forEach(({ city }) => {
            if (city && city.name) {
              cityCounts[city.name] = (cityCounts[city.name] || 0) + 1;
            } else {
              const unknownCity = "unknown";
              cityCounts[unknownCity] = (cityCounts[unknownCity] || 0 ) + 1;
            }
          });
          setCityCounts(cityCounts);
        });
      });
    }
  }, [allHouseholds]);
  return (
    <>
      { mapApi && <HeatMapControls allHouseholds={allHouseholds} mapApi={mapApi} cityCounts={cityCounts} /> }
      <div id="map" />
    </>
  );
}
