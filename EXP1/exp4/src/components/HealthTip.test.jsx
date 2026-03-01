import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import HealthTip from './HealthTip';

beforeAll(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      json: () => Promise.resolve({ slip: { advice: 'Stay hydrated!' } })
    })
  );
});

afterAll(() => {
  global.fetch.mockClear();
  delete global.fetch;
});

describe('HealthTip', () => {
  it('shows loading then health tip', async () => {
    render(<HealthTip />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
    const tip = await screen.findByText(/Stay hydrated!/i);
    expect(tip).toBeInTheDocument();
  });

  it('handles fetch error', async () => {
    global.fetch.mockImplementationOnce(() => Promise.reject('API error'));
    render(<HealthTip />);
    await waitFor(() => expect(screen.getByText(/Failed to fetch tip/i)).toBeInTheDocument());
  });
});

