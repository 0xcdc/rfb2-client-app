import EditDetailForm from './EditDetailForm.jsx';
import { useParams } from 'react-router-dom';

export default function Household() {
  const { id } = useParams();
  return (<EditDetailForm id={parseInt(id, 10)} />);
}
