import { Component, lazy } from "solid-js";
import { CssBaseline, ThemeProvider, createTheme } from "@suid/material";
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
      main: "#203432",
      contrastText: "#f8fbf7",
    },
    secondary: {
      main: "#f4f7f2",
      contrastText: "#203432",
    },
    background: {
      default: "#f2f6f1",
      paper: "#ffffff",
    },
    text: {
      primary: "#203432",
      secondary: "rgba(32, 52, 50, 0.68)",
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily:
      '"SF Pro Display", "SF Pro Text", "Aptos", "Segoe UI Variable", "Inter", "Helvetica Neue", sans-serif',
    button: {
      fontWeight: 650,
      letterSpacing: "0",
      textTransform: "none",
    },
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
        sx: {
          "&&": {
            "min-height": "40px",
            "padding": "9px 16px",
            "border-radius": "999px",
            "font-weight": 650,
            "text-transform": "none",
            "letter-spacing": "0",
          },
          "&.Mui-disabled": {
            color: "rgba(32, 52, 50, 0.34)",
            "box-shadow": "none",
          },
          "&.MuiButton-sizeSmall": {
            "min-height": "36px",
            "padding": "7px 14px",
          },
          "&.MuiButton-containedPrimary": {
            background:
              "linear-gradient(180deg, rgba(46, 70, 63, 0.98), rgba(32, 52, 50, 0.98))",
            "box-shadow": "0 12px 24px rgba(18, 33, 28, 0.12)",
            ":hover": {
              background:
                "linear-gradient(180deg, rgba(53, 80, 72, 0.98), rgba(37, 60, 56, 0.98))",
              "box-shadow": "0 14px 28px rgba(18, 33, 28, 0.16)",
            },
            "&.Mui-disabled": {
              background: "rgba(32, 52, 50, 0.12)",
              color: "rgba(32, 52, 50, 0.34)",
              "box-shadow": "none",
            },
          },
          "&.MuiButton-outlined": {
            "border-color": "rgba(32, 52, 50, 0.14)",
            background: "rgba(255, 255, 255, 0.72)",
            ":hover": {
              "border-color": "rgba(32, 52, 50, 0.24)",
              background: "rgba(244, 248, 244, 0.92)",
            },
            "&.Mui-disabled": {
              background: "rgba(255, 255, 255, 0.46)",
              "border-color": "rgba(32, 52, 50, 0.1)",
            },
          },
          "&.MuiButton-text:hover": {
            background: "rgba(34, 66, 59, 0.08)",
          },
        },
      },
    },
    MuiIconButton: {
      defaultProps: {
        sx: {
          color: "#203432",
          "border-radius": "10px",
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        sx: {
          "background-image": "none",
          "border-radius": "12px",
        },
      },
    },
    MuiCard: {
      defaultProps: {
        sx: {
          border: "1px solid rgba(26, 46, 40, 0.08)",
          background: "rgba(255, 255, 255, 0.88)",
          "box-shadow": "0 14px 32px rgba(18, 33, 28, 0.06)",
          "border-radius": "12px",
        },
      },
    },
    MuiDialog: {
      defaultProps: {
        PaperProps: {
          sx: {
            "border-radius": "12px",
            background: "rgba(252, 253, 250, 0.98)",
            "box-shadow": "0 24px 54px rgba(20, 33, 30, 0.18)",
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
        sx: {
          "& .MuiOutlinedInput-root": {
            "border-radius": "12px",
            background: "rgba(255, 255, 255, 0.82)",
          },
          "& .MuiOutlinedInput-notchedOutline": {
            "border-color": "rgba(32, 52, 50, 0.14)",
          },
          "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
            "border-color": "rgba(32, 52, 50, 0.24)",
          },
          "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
          {
            "border-color": "#2c574a",
            "border-width": "1px",
          },
          "& .MuiOutlinedInput-input": {
            "padding-top": "12px",
            "padding-bottom": "12px",
          },
          "& .MuiOutlinedInput-input.MuiInputBase-inputSizeSmall": {
            "padding-top": "10px",
            "padding-bottom": "10px",
          },
          "& .MuiInputLabel-root": {
            color: "rgba(32, 52, 50, 0.66)",
          },
        },
      },
    },
  },
});

const LazyFields = lazy(() => import("./fields/Fields"));

const App: Component = () => {
  return (
    <ThemeProvider theme={farmTheme}>
      <CssBaseline />
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
