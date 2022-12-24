import { Component, lazy, Show } from 'solid-js';
import { Paper, Typography, ThemeProvider, createTheme, TextField } from '@suid/material';
import { Routes, Route, A } from '@solidjs/router';

import logo from './farm-logo.svg';
import styles from './App.module.css';
import TopAppBar from './TopBar';
import Login from './Login';
import { NoEditMap } from './Map';
import About from './About';

import {createSignal} from 'solid-js';
import Admin from './Admin';

// use localstore to 
export const jwt_localstore_key = 'jwt_localstore'
export const [jwt_token, set_jwt_token] = createSignal(window.localStorage.getItem(jwt_localstore_key));


function Home() {
  return (
    <h1>Main page. Put map here.</h1>
  )
}



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

        <Routes>
          <Route path="/"       component={NoEditMap} />
          <Route path="/fields" component={Home} />
          <Route path="/about"  component={About} />
          <Route path="/login"  component={Login} />
          <Route path="/admin"  component={Admin} />
        </Routes>
      </div>
    </ThemeProvider>    
  );
};

export default App;
