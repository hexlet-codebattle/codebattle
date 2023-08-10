import React from 'react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/extend-expect';
import axios from 'axios';

import Registration from '../widgets/pages/registration';
import { getTestData } from './helpers';

jest.mock('axios');

const { invalidData, validData } = getTestData('signUpData.json');
const { data, route, headers } = validData;

describe('sign up', () => {
  function setup(jsx) {
    return {
      user: userEvent.setup(),
      ...render(jsx),
    };
  }

  beforeAll(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        pathname: '/users/new',
      },
    });
    document.head.innerHTML = '<meta name="csrf-token" content="test-csrf-token">';
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

    const signUpSpy = jest.spyOn(axios, 'post').mockResolvedValueOnce({ data: {} });

    await userEvent.type(getByLabelText('name'), data.name);
    await userEvent.type(getByLabelText('email'), data.email);
    await userEvent.type(getByLabelText('password'), data.password);
    await userEvent.type(getByLabelText('passwordConfirmation'), data.passwordConfirmation);

    const submitButton = getByLabelText('SubmitForm');
    await user.click(submitButton);

    await waitFor(() => {
      expect(signUpSpy).toHaveBeenCalledWith(route, data, headers);
    });
  });
});
