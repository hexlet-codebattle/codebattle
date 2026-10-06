import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Provider } from 'react-redux';

import LanguagePickerView from '../widgets/components/LanguagePickerView';

vi.mock('../widgets/components/LanguageIcon', () => ({ default: () => null }));

const langs = [
  { slug: 'js', name: 'javascript', version: '22' },
  { slug: 'kotlin', name: 'kotlin', version: '2.1' },
];

function renderPicker(
  currentLangSlug: string,
  availableLangs = langs,
  isDisabled = true,
  changeLang = vi.fn(),
) {
  const store = configureStore({
    reducer: () => ({ editor: { langs: availableLangs } }),
  });

  return render(
    <Provider store={store}>
      <LanguagePickerView
        changeLang={changeLang}
        currentLangSlug={currentLangSlug}
        isDisabled={isDisabled}
      />
    </Provider>,
  );
}

describe('LanguagePickerView', () => {
  test('allows switching when there is exactly one alternative language', async () => {
    const user = userEvent.setup();
    const changeLang = vi.fn();
    renderPicker(
      'js',
      [
        { slug: 'js', name: 'javascript', version: '25.4.0' },
        { slug: 'python', name: 'python', version: '3.14.5' },
      ],
      false,
      changeLang,
    );

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByText('Python'));

    expect(changeLang).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'python' }),
      expect.anything(),
    );
  });

  test('disables switching when no alternative language is available', () => {
    renderPicker('js', [langs[0]], false);

    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  test('shows a saved language even when it is hidden from the selectable languages', () => {
    renderPicker('kotlin');

    expect(screen.getByRole('button')).toHaveTextContent('Kotlin2.1');
  });

  test('falls back to the slug when a saved language is no longer available', () => {
    renderPicker('removed-language');

    expect(screen.getByRole('button')).toHaveTextContent('Removed-language');
  });
});
