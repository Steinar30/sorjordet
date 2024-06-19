import { Component, lazy } from 'solid-js';
import { ThemeProvider, createTheme } from '@suid/material';
import { Router, Route } from '@solidjs/router';

import TopAppBar from './TopBar';
import { NoEditMap } from './Map';

import { createSignal } from 'solid-js';

// use localstore to 
export const jwt_localstore_key = 'jwt_localstore'
export const [jwt_token, set_jwt_token] = createSignal(window.localStorage.getItem(jwt_localstore_key));


const farmTheme = createTheme({
  palette: {
    primary: {
      main: "#81c784"
    },
    secondary: {
      main: "#64b5f6"
    }
  }
})

const App: Component = () => {
  return (
    <ThemeProvider theme={farmTheme}>
      <div>
        <TopAppBar />

        <Router>
          <Route path="/" component={NoEditMap} />
          <Route path="/fields" component={lazy(() => import('./Fields'))} />
          <Route path="/about" component={lazy(() => import('./About'))} />
          <Route path="/login" component={lazy(() => import('./Login'))} />
          <Route path="/admin" component={lazy(() => import('./Admin'))} />
          <Route path="/harvest" component={lazy(() => import('./Harvest'))} />
        </Router>
      </div>
    </ThemeProvider>
  );
};

export default App;
