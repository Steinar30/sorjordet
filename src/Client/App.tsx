import { Component, lazy } from 'solid-js';
import { Paper, Typography, ThemeProvider, createTheme, TextField } from '@suid/material';
import { Routes, Route, A } from '@solidjs/router';

import logo from './farm-logo.svg';
import styles from './App.module.css';
import TopAppBar from './TopBar';
import Login from './Login';
import NoEditMap from './Map';


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
          <Route path="/" component={NoEditMap}/>
          <Route path="/fields" component={Home} />
          <Route path="/about" component={Home} />
          <Route path="/login" component={Login}/>


        </Routes>
        
      </div>

    </ThemeProvider>
    
    
  );
};

export default App;
