import {
  Route,
  BrowserRouter as Router,
  Routes,
} from 'react-router-dom';
import Home from './Home';
import Household from './Household';
import Layout from './Layout';
import Report from './Report';
import Verification from './Verification';

function App() {
  return (
    <Layout>
      <Router>
        <Routes>>
          <Route path='/' element={<Home />} />
          <Route path='/report' element={<Report/>} />
          <Route path='/households/:id' element={ <Household/> } />
          <Route path='/verification/:id' element={ <Verification/> }/>
        </Routes>
      </Router>
    </Layout>
  );
}

export default App;
