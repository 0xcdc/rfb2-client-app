import { render } from 'preact'
import { useState } from 'preact/hooks'

function HeatMapControls({ allHouseholds, mapApi }) {
  const { renderHeatMap } = mapApi;

  const [dissipating, setDissipating] = useState(mapApi.state.dissipating);
  const [households, setHouseholds] = useState(allHouseholds);
  const [showPins, setShowPins] = useState(mapApi.state.showPins);
  const [timeLimit, setTimeLimit] = useState(null);

  renderHeatMap({
    dissipating,
    households,
    showPins,
  });

  function toggleVisitedThisYear() {
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
      <button id="decrease-radius">Decrease radius</button>
      <button id="increase-radius">Increase radius</button>
      <button id="change-opacity">Change opacity</button>
      <button id="change-dissipating" onClick={() => setDissipating(!dissipating) }>Change dissipating</button>
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
