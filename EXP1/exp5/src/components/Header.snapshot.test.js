import React from 'react';
import renderer from 'react-test-renderer';
import Header from './Header';
import { AuthContext } from '../context/AuthContext';
import { BrowserRouter } from 'react-router-dom';

test('Header matches snapshot', () => {
  const tree = renderer
    .create(
      <BrowserRouter>
        <AuthContext.Provider value={{ isAuthenticated: true, setIsAuthenticated: jest.fn() }}>
          <Header />
        </AuthContext.Provider>
      </BrowserRouter>
    )
    .toJSON();
  expect(tree).toMatchSnapshot();
});
