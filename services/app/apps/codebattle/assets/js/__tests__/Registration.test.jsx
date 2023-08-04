import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import axios from 'axios';

import Registration from '../widgets/pages/registration';
import { getTestData } from './helpers';

jest.mock('axios');

const { invalidData, validData } = getTestData('signUpData.json');
const { data, route, headers } = validData;

describe('sign up', () => {
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
    const { getByText } = render(<Registration />);

    expect(getByText(/Sign Up/)).toBeInTheDocument();
  });

  test.each(invalidData)('%s', async (testName, value, validationMessage, inputName) => {
    const { getByLabelText, findByText } = render(<Registration />);

    const nameInput = getByLabelText(inputName);
    fireEvent.change(nameInput, { target: { value } });

    const submitButton = getByLabelText('SubmitForm');
    fireEvent.click(submitButton);

    expect(await findByText(validationMessage)).toBeInTheDocument();
  });

  test('successful sign up', async () => {
    const { getByLabelText } = render(<Registration />);

    const signUpSpy = jest.spyOn(axios, 'post').mockResolvedValueOnce({ data: {} });

    const fieldNames = ['name', 'email', 'password', 'passwordConfirmation'];
    const fields = fieldNames.map(fieldName => getByLabelText(fieldName));
    fields.forEach((field, index) => (
      fireEvent.change(field, { target: { value: data[fieldNames[index]] } })
    ));

    const submitButton = getByLabelText('SubmitForm');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(signUpSpy).toHaveBeenCalledWith(route, data, headers);
    });
  });
});
