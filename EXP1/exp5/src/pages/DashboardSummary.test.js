import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import DashboardSummary from './DashboardSummary';

const mockStore = configureStore([]);

test('shows loading initially', () => {
  const store = mockStore({ logs: { data: [], status: 'loading', error: null } });
  render(
    <Provider store={store}>
      <DashboardSummary />
    </Provider>
  );
  expect(screen.getByText(/Loading summary/i)).toBeInTheDocument();
});

test('shows error message', () => {
  const store = mockStore({ logs: { data: [], status: 'failed', error: 'Network error' } });
  render(
    <Provider store={store}>
      <DashboardSummary />
    </Provider>
  );
  expect(screen.getByText(/Error loading data/i)).toBeInTheDocument();
});

test('shows total carbon footprint', async () => {
  const store = mockStore({ logs: { data: [ { carbon: 2 }, { carbon: 3 } ], status: 'success', error: null } });
  render(
    <Provider store={store}>
      <DashboardSummary />
    </Provider>
  );
  await waitFor(() => expect(screen.getByText(/Total Carbon Footprint: 5 kg/i)).toBeInTheDocument());
});
