import { Component, lazy, Show } from 'solid-js';
import { ThemeProvider, createTheme } from '@suid/material';
import { Router, Route } from '@solidjs/router';

import logo from './farm-logo.svg';
import TopAppBar from './TopBar';
import Login from './Login';
import { NoEditMap } from './Map';
import About from './About';

import {createSignal} from 'solid-js';
import Admin from './Admin';
import FieldsList from './Fields';

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
          <Route path="/"       component={NoEditMap} />
          <Route path="/fields" component={FieldsList} />
          <Route path="/about"  component={About} />
          <Route path="/login"  component={Login} />
          <Route path="/admin"  component={Admin} />
        </Router>
      </div>
    </ThemeProvider>    
  );
};

export default App;
