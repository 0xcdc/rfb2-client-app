import React from 'react';
import { useParams } from 'react-router-dom';
import EditDetailForm from './EditDetailForm';

export default function Household() {
  const { id } = useParams();
  return (<EditDetailForm id={parseInt(id)}/>);
}
