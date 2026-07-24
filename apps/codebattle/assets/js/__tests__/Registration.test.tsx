import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import React, { type ReactElement } from 'react';

import Registration from '../widgets/pages/registration';

import { getTestData } from './helpers';

// jsdom URL the registration page reads (was @jest-environment-options).
window.history.pushState({}, '', '/users/new');

const { invalidData: fixtureInvalidData, validData } = getTestData('signUpData.json');
const invalidData = fixtureInvalidData as Array<[string, string, string, string]>;
const { data, route, headers } = validData;

vi.mock('@/inertia/pageProps', () => {
  const pageProps = { local: 'en', current_user: { sound_settings: {} } };
  return {
    getPageProp: (key: keyof typeof pageProps, fallback?: unknown) => pageProps[key] ?? fallback,
  };
});

describe('sign up', () => {
  let fetchMock = vi.fn();

  function setup(jsx: ReactElement) {
    return {
      user: userEvent.setup(),
      ...render(jsx),
    };
  }

  beforeAll(() => {
    document.head.innerHTML = '<meta name="csrf-token" content="test-csrf-token">';
  });

  beforeEach(() => {
    window.history.pushState({}, '', '/users/new');
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  test('render', () => {
    const { getByText } = setup(<Registration />);

    expect(getByText(/Sign Up/)).toBeInTheDocument();
  });

  test.each(invalidData)('%s', async (testName, value, validationMessage, inputName) => {
    const { getByLabelText, findByText, user } = setup(<Registration />);

    const nameInput = getByLabelText(inputName);
    if (value) {
      await userEvent.type(nameInput, value);
    }

    const submitButton = getByLabelText('SubmitForm');
    await user.click(submitButton);

    expect(await findByText(validationMessage)).toBeInTheDocument();
  });

  test('successful sign up', async () => {
    const { getByLabelText, user } = setup(<Registration />);

    const signUpSpy = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    fetchMock.mockImplementation(signUpSpy);

    await userEvent.type(getByLabelText('name'), data.name);
    await userEvent.type(getByLabelText('email'), data.email);
    await userEvent.type(getByLabelText('password'), data.password);
    await userEvent.type(getByLabelText('passwordConfirmation'), data.passwordConfirmation);

    const submitButton = getByLabelText('SubmitForm');
    await user.click(submitButton);

    await waitFor(() => {
      expect(signUpSpy).toHaveBeenCalledWith(route, {
        method: 'POST',
        headers: headers.headers,
        body: JSON.stringify(data),
      });
    });
  });

  test('shows a readable password recovery confirmation', async () => {
    window.history.pushState({}, '', '/remind_password');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const { getByLabelText, findByText, user } = setup(<Registration />);

    await user.type(getByLabelText('email'), 'user@example.com');
    await user.click(getByLabelText('SubmitForm'));

    const confirmation = await findByText(
      'We have sent you an email with instructions on how to reset your password',
    );

    expect(confirmation).toHaveClass('text-white');
  });
});
