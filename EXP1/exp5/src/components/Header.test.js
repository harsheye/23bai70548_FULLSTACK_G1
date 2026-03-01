import { render, screen, fireEvent } from '@testing-library/react';
import Header from './Header';
import { AuthContext } from '../context/AuthContext';
import { BrowserRouter } from 'react-router-dom';

test('renders Ecotrack title', () => {
  render(
    <BrowserRouter>
      <AuthContext.Provider value={{ isAuthenticated: true, setIsAuthenticated: jest.fn() }}>
        <Header />
      </AuthContext.Provider>
    </BrowserRouter>
  );
  expect(screen.getByText(/Ecotrack/i)).toBeInTheDocument();
});

test('shows logout button when authenticated', () => {
  render(
    <BrowserRouter>
      <AuthContext.Provider value={{ isAuthenticated: true, setIsAuthenticated: jest.fn() }}>
        <Header />
      </AuthContext.Provider>
    </BrowserRouter>
  );
  expect(screen.getByText(/Logout/i)).toBeInTheDocument();
});
