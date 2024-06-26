import {
  useEffect,
  useState,
  useMemo,
} from 'react';

const useSearchParams = () => {
  const [search, setSearch] = useState(document.location.search);

  const currentSearch = document.location.search;

  useEffect(() => {
    if (search !== currentSearch) {
      setSearch(document.location.search);
    }
  }, [search, currentSearch, setSearch]);

  const searchParams = useMemo(() => new URLSearchParams(search), [search]);

  return searchParams;
};

export default useSearchParams;
