import { ArrowBack } from "@suid/icons-material";
import { Button, IconButton, Typography } from "@suid/material";
import { createResource, createSignal, Match, Show, Switch } from "solid-js";

import styles from './Admin.module.css';
import { jwt_token } from "../App";
import { FieldForm } from "./FarmFieldForm";
import { FieldGroupForm } from "./FarmFieldGroupForm";
import { RenderFieldsList } from "../Fields";
import { getFarmFieldGroupsWithFields } from "../requests";


export default function Admin() {
  const [currentView, setCurrentView] = createSignal<string>("admin");
  const [farmFieldGroups, { refetch }] =
    createResource(getFarmFieldGroupsWithFields);

  function navButton(label: string, navstring: string) {
    return (
      <Button
        size="small"
        variant="contained"
        onClick={() => setCurrentView(navstring)}
      >
        {label}
      </Button>
    )
  }

  function backButton() {
    return (
      <IconButton
        size="large"
        edge="start"
        color="inherit"
        aria-label="return"
        sx={{ fontSize: "16px", borderRadius: "15px" }}
        onClick={() => {
          setCurrentView("admin");
        }}>
        <ArrowBack /> Back
      </IconButton>
    )
  }

  return (
    <main class={styles.container}>
      <Show when={jwt_token()}
        fallback={<p>You don't have access to this page</p>}
      >

        <Typography variant="h6">Admin</Typography>
        <Switch >
          <Match when={currentView() === "admin"}>
            <div class={styles.adminButtons}>
              {navButton("New Field", "add-field")}
              {navButton("New FieldGroup", "add-field-group")}
              {RenderFieldsList(farmFieldGroups())}
            </div>
          </Match>
          <Match when={currentView() === "add-field"}>
            {backButton()}

            {FieldForm(() => {
              setCurrentView("admin");
              refetch();
            })}
          </Match>
          <Match when={currentView() === "add-field-group"}>
            {backButton()}

            {FieldGroupForm(() => {
              setCurrentView("admin");
              refetch();
            })}
          </Match>
        </Switch>
      </Show>
    </main>
  )
}
