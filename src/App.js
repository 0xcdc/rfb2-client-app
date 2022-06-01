import Home from './Home';
import Layout from './Layout';
import Report from './Report';
import Household from './Household';
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";

function App() {
  return (
    <Layout>
      <Router>
        <Routes>>
          <Route path="/" element={<Home />} />
          <Route path="/report" element={<Report/>} />
          <Route path="/households/:id" element={ <Household/> } />
        </Routes>
      </Router>
    </Layout>
    );
}

export default App;
