import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.min.css';
import './index.css';

import { App } from './App.jsx'
import { render } from 'preact'

export default function renderApp() {
  render(<App />, document.getElementById('app'))
}
