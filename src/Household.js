import EditDetailForm from './EditDetailForm';
import React from 'react';
import { useParams } from 'react-router-dom';

export default function Household() {
  const { id } = useParams();
  return (<EditDetailForm id={parseInt(id)}/>);
}
