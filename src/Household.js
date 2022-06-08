import EditDetailForm from './EditDetailForm';
import { useParams } from 'react-router-dom';

export default function Household() {
  const { id } = useParams();
  return (<EditDetailForm id={parseInt(id)}/>);
}
