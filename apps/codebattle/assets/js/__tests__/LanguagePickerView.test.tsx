import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';

import LanguagePickerView from '../widgets/components/LanguagePickerView';

vi.mock('../widgets/components/LanguageIcon', () => ({ default: () => null }));

const langs = [
  { slug: 'js', name: 'javascript', version: '22' },
  { slug: 'kotlin', name: 'kotlin', version: '2.1' },
];

function renderPicker(currentLangSlug: string) {
  const store = configureStore({
    reducer: () => ({ editor: { langs } }),
  });

  return render(
    <Provider store={store}>
      <LanguagePickerView changeLang={vi.fn()} currentLangSlug={currentLangSlug} isDisabled />
    </Provider>,
  );
}

describe('LanguagePickerView', () => {
  test('shows a saved language even when it is hidden from the selectable languages', () => {
    renderPicker('kotlin');

    expect(screen.getByRole('button')).toHaveTextContent('Kotlin2.1');
  });

  test('falls back to the slug when a saved language is no longer available', () => {
    renderPicker('removed-language');

    expect(screen.getByRole('button')).toHaveTextContent('Removed-language');
  });
});
