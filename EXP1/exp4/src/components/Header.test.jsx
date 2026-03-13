import React from 'react';
import { render, screen } from '@testing-library/react';
import Header from './Header';
import '@testing-library/jest-dom';

describe('Header', () => {
  it('renders EcoTrack header', () => {
    render(<Header />);
    expect(screen.getByText(/EcoTrack/i)).toBeInTheDocument();
   
    expect(screen.getByRole('banner')).toBeTruthy();

    screen.debug();
  });

  it('matches snapshot', () => {
    const { asFragment } = render(<Header />);
    expect(asFragment()).toMatchSnapshot();
  });
});


