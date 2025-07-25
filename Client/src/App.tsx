import { Component, lazy } from "solid-js";
import { ThemeProvider, createTheme } from "@suid/material";
import { Router, Route } from "@solidjs/router";

import TopAppBar from "./TopBar";
import { NoEditMap } from "./maps/Map";
import { FieldDetails } from "./fields/FieldDetails";

import { createSignal } from "solid-js";

// use localstore to
export const jwt_localstore_key = "jwt_localstore";
export const [jwt_token, set_jwt_token] = createSignal(
  window.localStorage.getItem(jwt_localstore_key),
);

const farmTheme = createTheme({
  palette: {
    primary: {
      main: "#2b2e2b",
    },
    secondary: {
      main: "#ffffff",
    },
  },
});

const LazyFields = lazy(() => import("./fields/Fields"));

const App: Component = () => {
  return (
    <ThemeProvider theme={farmTheme}>
      <TopAppBar />

      <Router>
        <Route path="/" component={NoEditMap} />
        <Route path="/fields" component={() => <LazyFields />} />
        <Route
          path="/fields/:id"
          component={(x) => <FieldDetails fieldId={Number(x.params.id)} />}
        />
        <Route path="/login" component={lazy(() => import("./login/Login"))} />
        <Route path="/stats" component={lazy(() => import("./stats/Stats"))} />
        <Route path="/admin" component={lazy(() => import("./admin/Admin"))} />
        <Route
          path="/harvest"
          component={lazy(() => import("./harvest/HarvestList"))}
        />
      </Router>
    </ThemeProvider>
  );
};

export default App;
