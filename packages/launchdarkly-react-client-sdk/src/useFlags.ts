import { useContext } from 'react';
import context from './context';

const useFlags = () => {
  const { flags } = useContext(context);

  return flags;
};

export default useFlags;
