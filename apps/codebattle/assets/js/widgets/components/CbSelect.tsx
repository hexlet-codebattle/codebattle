import React, { useCallback, useMemo, useRef, useState } from 'react';

import { Combobox, InputBase, Loader, useCombobox } from '@mantine/core';

export interface CbSelectClassNames {
  target?: string;
  dropdown?: string;
  option?: string;
}

interface CbSelectProps<Option> {
  value: Option | null;
  onChange: (option: Option | null) => void;
  getOptionValue: (option: Option) => string;
  getOptionLabel: (option: Option) => React.ReactNode;
  getOptionSearchText?: (option: Option) => string;
  filter?: (option: Option, input: string) => boolean;
  options?: readonly Option[];
  loadOptions?: (input: string) => Promise<Option[]>;
  defaultOptions?: boolean;
  searchable?: boolean;
  disabled?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  nothingFoundMessage?: React.ReactNode;
  classNames?: CbSelectClassNames;
  w?: number | string;
}

function CbSelect<Option>({
  value,
  onChange,
  getOptionValue,
  getOptionLabel,
  getOptionSearchText,
  filter,
  options: staticOptions,
  loadOptions,
  defaultOptions = false,
  searchable = true,
  disabled = false,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  nothingFoundMessage = 'Nothing found',
  classNames,
  w,
}: CbSelectProps<Option>) {
  const isAsync = typeof loadOptions === 'function';
  const [search, setSearch] = useState('');
  const [asyncOptions, setAsyncOptions] = useState<Option[] | null>(null);
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);

  const options = isAsync ? asyncOptions : staticOptions;

  const reload = useCallback(
    async (input: string) => {
      if (!loadOptions) {
        return;
      }
      const requestId = ++requestIdRef.current;
      setLoading(true);
      try {
        const loaded = await loadOptions(input);
        if (requestId === requestIdRef.current) {
          setAsyncOptions(loaded);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [loadOptions],
  );

  const combobox = useCombobox({
    onDropdownOpen: () => {
      if (isAsync && asyncOptions === null && defaultOptions) {
        void reload(search);
      }
    },
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      setSearch('');
    },
  });

  const defaultFilter = useCallback(
    (option: Option, input: string) => {
      const text =
        typeof getOptionSearchText === 'function'
          ? getOptionSearchText(option)
          : String(getOptionLabel(option));
      return text.toLowerCase().includes(input.trim().toLowerCase());
    },
    [getOptionLabel, getOptionSearchText],
  );
  const filterFn = filter ?? defaultFilter;

  const visibleOptions = useMemo(() => {
    if (!options) {
      return [];
    }
    if (!searchable || !search) {
      return [...options];
    }
    return options.filter((option) => filterFn(option, search));
  }, [filterFn, options, search, searchable]);

  const submitOption = (optionValue: string) => {
    const option = visibleOptions.find((item) => getOptionValue(item) === optionValue);
    if (option) {
      onChange(option);
    }
    combobox.closeDropdown();
  };

  return (
    <Combobox store={combobox} onOptionSubmit={submitOption}>
      <Combobox.Target>
        <InputBase
          component="button"
          type="button"
          w={w}
          className={classNames?.target}
          rightSection={loading ? <Loader size="xs" /> : <Combobox.Chevron />}
          rightSectionPointerEvents="none"
          onClick={() => combobox.toggleDropdown()}
          disabled={disabled}
        >
          {value ? getOptionLabel(value) : placeholder}
        </InputBase>
      </Combobox.Target>
      <Combobox.Dropdown className={classNames?.dropdown}>
        {searchable && !disabled && (
          <Combobox.Search
            value={search}
            onChange={(event) => {
              const input = event.currentTarget.value;
              setSearch(input);
              if (isAsync) {
                void reload(input);
              }
            }}
            placeholder={searchPlaceholder}
          />
        )}
        <Combobox.Options>
          {loading ? (
            <Combobox.Empty>
              <Loader size="xs" />
            </Combobox.Empty>
          ) : visibleOptions.length > 0 ? (
            visibleOptions.map((option) => (
              <Combobox.Option
                key={getOptionValue(option)}
                value={getOptionValue(option)}
                className={classNames?.option}
              >
                {getOptionLabel(option)}
              </Combobox.Option>
            ))
          ) : (
            <Combobox.Empty>{nothingFoundMessage}</Combobox.Empty>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}

export default CbSelect;
