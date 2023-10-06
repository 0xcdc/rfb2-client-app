import {
  BrowserRouter,
  Route,
  Routes,
} from 'react-router-dom';
import Home from './Home.jsx';
import Household from './Household.jsx';
import Layout from './Layout.jsx';
import Report from './Report.jsx';

function App() {
  return (
    <Layout>
      <BrowserRouter>
        <Routes>
          <Route path='/report' element={<Report />} />
          <Route path='/households/:id' element={ <Household /> } />
          <Route path='/' element={<Home />} />
        </Routes>
      </BrowserRouter>
    </Layout>
  );
}

export { App };
