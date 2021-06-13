import Home from './Home';
import Layout from './Layout';
import Report from './Report';
import {
  BrowserRouter as Router,
  Switch,
  Route,
} from "react-router-dom";

function App() {
  return (
    <Router>
      <Layout>
        <Switch>
          <Route path="/report">
            <Report/>
          </Route>
          <Route path="/">
            <Home/>
          </Route>
        </Switch>
      </Layout>
    </Router>
  );
}

export default App;
