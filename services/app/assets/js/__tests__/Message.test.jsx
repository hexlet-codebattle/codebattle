import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import Message from '../widgets/components/Message';

test('test rendering Message Component', async () => {
  const { getByText } = render(<Message message="txt" user="user" />);

  expect(getByText(/user/)).toBeInTheDocument();
});
