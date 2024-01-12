import { useParams, useSearchParams } from 'react-router-dom';
import EditDetailForm from './EditDetailForm.jsx';

export default function Household() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const languageId = searchParams.get('languageId') || 0;

  return (<EditDetailForm id={parseInt(id, 10)} languageId={languageId} />);
}
