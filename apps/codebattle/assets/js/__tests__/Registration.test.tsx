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
const cyrillicPasswordError = 'Password must not contain Cyrillic characters';
const cyrillicPasswords: Array<[string, string]> = [
  ['confirmed mixed-script password', 'as1234567ыы'],
  ['uppercase Cyrillic at the beginning', 'Ыas1234567'],
  ['uppercase Cyrillic in the middle', 'as123Ы4567'],
  ['uppercase Cyrillic at the end', 'as1234567Ы'],
  ['yo at the beginning', 'ёas1234567'],
  ['yo in the middle', 'as123ё4567'],
  ['yo at the end', 'as1234567ё'],
  ['YO at the beginning', 'Ёas1234567'],
  ['YO in the middle', 'as123Ё4567'],
  ['YO at the end', 'as1234567Ё'],
  ['Ukrainian ghe with upturn at the beginning', 'ґas1234567'],
  ['Ukrainian ghe with upturn in the middle', 'as123ґ4567'],
  ['Ukrainian ghe with upturn at the end', 'as1234567ґ'],
];

const fillSignUpForm = async (
  getByLabelText: (label: string) => HTMLElement,
  overrides: Partial<typeof data> = {},
) => {
  const values = {
    ...data,
    ...overrides,
    passwordConfirmation:
      overrides.passwordConfirmation ?? overrides.password ?? data.passwordConfirmation,
  };

  await userEvent.type(getByLabelText('name'), values.name);
  await userEvent.type(getByLabelText('email'), values.email);
  await userEvent.type(getByLabelText('password'), values.password);
  await userEvent.type(getByLabelText('passwordConfirmation'), values.passwordConfirmation);
};

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

  test('reveals and hides passwords without removing the controls', async () => {
    const { getByLabelText, getByRole, user } = setup(<Registration />);
    const password = getByLabelText('password');
    const confirmation = getByLabelText('passwordConfirmation');

    expect(password).toHaveAttribute('type', 'password');
    expect(confirmation).toHaveAttribute('type', 'password');

    await user.click(getByRole('button', { name: 'Show password' }));
    await user.click(getByRole('button', { name: 'Show password confirmation' }));

    expect(password).toHaveAttribute('type', 'text');
    expect(confirmation).toHaveAttribute('type', 'text');
    expect(getByRole('button', { name: 'Hide password' })).toBeInTheDocument();
    expect(getByRole('button', { name: 'Hide password confirmation' })).toBeInTheDocument();

    await user.click(getByRole('button', { name: 'Hide password' }));

    expect(password).toHaveAttribute('type', 'password');
    expect(getByRole('button', { name: 'Show password' })).toBeInTheDocument();
  });

  test('reveals the password on the sign-in page', async () => {
    window.history.pushState({}, '', '/session/new');
    const { getByLabelText, getByRole, user } = setup(<Registration />);
    const password = getByLabelText('password');

    await user.click(getByRole('button', { name: 'Show password' }));

    expect(password).toHaveAttribute('type', 'text');
    expect(getByRole('button', { name: 'Hide password' })).toBeInTheDocument();
  });

  test.each(invalidData)('%s', async (testName, value, validationMessage, inputName) => {
    const { getByLabelText, findByText, user } = setup(<Registration />);

    const nameInput = getByLabelText(inputName);
    if (value) {
      await userEvent.type(nameInput, value);
    }

    const submitButton = getByLabelText('Submit form');
    await user.click(submitButton);

    expect(await findByText(validationMessage)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('rejects a Cyrillic password without Latin letters using the letter rule', async () => {
    const { getByLabelText, findByText, queryByText, user } = setup(<Registration />);

    await fillSignUpForm(getByLabelText, { password: '12345678ы' });
    await user.click(getByLabelText('Submit form'));

    expect(await findByText('Should contain at least one letter')).toBeInTheDocument();
    expect(queryByText(cyrillicPasswordError)).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test.each(cyrillicPasswords)(
    'rejects %s with a Cyrillic-specific error',
    async (_name, password) => {
      const { getByLabelText, findByText, user } = setup(<Registration />);

      await fillSignUpForm(getByLabelText, { password });
      await user.click(getByLabelText('Submit form'));

      expect(await findByText(cyrillicPasswordError)).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  test('rejects mismatched password confirmation', async () => {
    const { getByLabelText, findByText, user } = setup(<Registration />);

    await fillSignUpForm(getByLabelText, { passwordConfirmation: 'differentpassword1' });
    await user.click(getByLabelText('Submit form'));

    expect(await findByText('Passwords must match')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('successful sign up', async () => {
    const { getByLabelText, user } = setup(<Registration />);

    const signUpSpy = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    fetchMock.mockImplementation(signUpSpy);

    await fillSignUpForm(getByLabelText);

    const submitButton = getByLabelText('Submit form');
    await user.click(submitButton);

    await waitFor(() => {
      expect(signUpSpy).toHaveBeenCalledWith(route, {
        method: 'POST',
        headers: headers.headers,
        body: JSON.stringify(data),
      });
    });
  });

  test('accepts punctuation and non-Cyrillic Unicode in the password', async () => {
    const { getByLabelText, user } = setup(<Registration />);
    const password = 'testpassword1!α';
    const signUpSpy = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    fetchMock.mockImplementation(signUpSpy);

    await fillSignUpForm(getByLabelText, { password });
    await user.click(getByLabelText('Submit form'));

    await waitFor(() => {
      expect(signUpSpy).toHaveBeenCalledTimes(1);
      expect(signUpSpy).toHaveBeenCalledWith(route, {
        method: 'POST',
        headers: headers.headers,
        body: JSON.stringify({
          ...data,
          password,
          passwordConfirmation: password,
        }),
      });
    });
  });

  test('clears the Cyrillic password error after correction and submits unchanged values', async () => {
    const { getByLabelText, findByText, queryByText, user } = setup(<Registration />);
    const signUpSpy = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    fetchMock.mockImplementation(signUpSpy);

    await fillSignUpForm(getByLabelText, { password: 'as1234567ыы' });
    await user.click(getByLabelText('Submit form'));

    expect(await findByText(cyrillicPasswordError)).toBeInTheDocument();
    expect(signUpSpy).not.toHaveBeenCalled();

    await user.clear(getByLabelText('password'));
    await userEvent.type(getByLabelText('password'), data.password);
    await user.clear(getByLabelText('passwordConfirmation'));
    await userEvent.type(getByLabelText('passwordConfirmation'), data.passwordConfirmation);

    await waitFor(() => {
      expect(queryByText(cyrillicPasswordError)).not.toBeInTheDocument();
    });

    await user.click(getByLabelText('Submit form'));

    await waitFor(() => {
      expect(signUpSpy).toHaveBeenCalledTimes(1);
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
    await user.click(getByLabelText('Submit form'));

    const confirmation = await findByText(
      'We have sent you an email with instructions on how to reset your password',
    );

    expect(confirmation).toHaveClass('text-white');
  });
});
