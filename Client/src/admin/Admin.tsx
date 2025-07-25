import { Button } from "@suid/material";
import { createSignal, For, Match, Show, Switch } from "solid-js";

import styles from "./Admin.module.css";
import { jwt_token } from "../App";
import FieldsAdmin from "./fields/FieldsAdmin";
import FieldGroupAdmin from "./fieldgroups/FieldGroupAdmin";
import UserAdmin from "./users/UserAdmin";
import HarvestTypes from "./harvest/HarvestTypes";

const adminButtons: string[] = [
  "fields",
  "field-groups",
  "users",
  "harvest-types",
];
type AdminNav = typeof adminButtons[number];
const toUpper = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function Admin() {
  const [currentView, setCurrentView] = createSignal<AdminNav>("fields");

  function navButton(input: AdminNav) {
    return (
      <Button
        size="small"
        variant={currentView() === input ? "contained" : "outlined"}
        onClick={() => setCurrentView(input)}
      >
        {toUpper(input.replace("-", " "))}
      </Button>
    );
  }

  return (
    <main class={styles.container}>
      <Show
        when={jwt_token()}
        fallback={<p>You don't have access to this page</p>}
      >
        <div class={styles.adminButtonsOuter}>
          <div class={styles.adminButtons}>
            <For each={adminButtons}>{(input) => navButton(input)}</For>
          </div>
        </div>
        <Switch>
          <Match when={currentView() === "fields"}>
            <FieldsAdmin />
          </Match>
          <Match when={currentView() === "field-groups"}>
            <FieldGroupAdmin />
          </Match>
          <Match when={currentView() === "users"}>
            <UserAdmin />
          </Match>
          <Match when={currentView() === "harvest-types"}>
            <HarvestTypes />
          </Match>
        </Switch>
      </Show>
    </main>
  );
}
