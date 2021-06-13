import Home from './Home';
import Layout from './Layout';
import {
  BrowserRouter as Router,
  Switch,
  Route,
} from "react-router-dom";

function Report() {
  return <h2>Report</h2>;
}

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
