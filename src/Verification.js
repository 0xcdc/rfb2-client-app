import { Button } from 'react-bootstrap';
import { Translations } from './Translations';
// import { useParams } from 'react-router-dom';

export default function Verficiation() {
  /* const { id } = useParams(); */

  return <div sm='10' className='d-grid gap-2'>{
    Object.entries(Translations.PickALanguage).map( ([k, v], i) =>
      v ? <Button key={k} size='lg' variant='outline-primary'>{v}</Button> : '')
  }</div>
  ;
}
