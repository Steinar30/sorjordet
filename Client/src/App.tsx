import { Component, lazy } from 'solid-js';
import { ThemeProvider, createTheme } from '@suid/material';
import { Router, Route } from '@solidjs/router';

import TopAppBar from './TopBar';
import { NoEditMap } from './maps/Map';

import { createSignal } from 'solid-js';

// use localstore to 
export const jwt_localstore_key = 'jwt_localstore'
export const [jwt_token, set_jwt_token] = createSignal(window.localStorage.getItem(jwt_localstore_key));


const farmTheme = createTheme({
  palette: {
    primary: {
      main: "#2b2e2b"
    },
    secondary: {
      main: "#ffffff"
    }
  }
})

const App: Component = () => {
  return (
    <ThemeProvider theme={farmTheme}>
      <TopAppBar />

      <Router>
        <Route path="/" component={NoEditMap} />
        <Route path="/fields" component={lazy(() => import('./Fields'))} />
        <Route path="/login" component={lazy(() => import('./login/Login'))} />
        <Route path="/admin" component={lazy(() => import('./admin/Admin'))} />
        <Route path="/harvest" component={lazy(() => import('./harvest/Harvest'))} />
      </Router>

    </ThemeProvider>
  );
};

export default App;
