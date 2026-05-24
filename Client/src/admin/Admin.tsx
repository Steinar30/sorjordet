import { Button } from "@suid/material";
import { createSignal, For, Match, Show, Switch } from "solid-js";

import styles from "./Admin.module.css";
import { jwt_token } from "../App";
import FieldGroupAdmin from "./fieldgroups/FieldGroupAdmin";
import UserAdmin from "./users/UserAdmin";
import HarvestTypes from "./harvest/HarvestTypes";
import HarvestEvents from "./harvest/HarvestEvents";

const adminButtons: string[] = [
  "field-groups",
  "users",
  "harvest-types",
  "harvest-events",
];
type AdminNav = typeof adminButtons[number];
const toUpper = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function Admin() {
  const [currentView, setCurrentView] = createSignal<AdminNav>("field-groups");

  function navButton(input: AdminNav) {
    return (
      <Button
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
        fallback={
          <div class={styles.accessCard}>
            <p>You don't have access to this page</p>
          </div>
        }
      >
        <section class={styles.adminHero}>
          <p>Control room</p>
          <h1>Admin</h1>
        </section>
        <div class={styles.adminButtonsOuter}>
          <div class={styles.adminButtons}>
            <For each={adminButtons}>{(input) => navButton(input)}</For>
          </div>
        </div>
        <Switch>
          <Match when={currentView() === "field-groups"}>
            <FieldGroupAdmin />
          </Match>
          <Match when={currentView() === "users"}>
            <UserAdmin />
          </Match>
          <Match when={currentView() === "harvest-types"}>
            <HarvestTypes />
          </Match>
          <Match when={currentView() === "harvest-events"}>
            <HarvestEvents />
          </Match>
        </Switch>
      </Show>
    </main>
  );
}
