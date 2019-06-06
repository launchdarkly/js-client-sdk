import { useContext } from 'react';
import context from './context';

const useLDClient = () => {
  const { ldClient } = useContext(context);

  return ldClient;
};

export default useLDClient;
