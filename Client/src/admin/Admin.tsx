import { Button } from "@suid/material";
import { createSignal, For, Match, Show, Switch } from "solid-js";

import styles from "./Admin.module.css";
import { jwt_token } from "../App";
import FieldsAdmin from "./fields/FieldsAdmin";
import FieldGroupAdmin from "./fieldgroups/FieldGroupAdmin";
import UserAdmin from "./users/UserAdmin";

type AdminNav = "fields" | "field-groups" | "users" | "harvests";
const adminButtons: AdminNav[] = [
  "fields",
  "field-groups",
  "users",
  "harvests",
];
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
        </Switch>
      </Show>
    </main>
  );
}
