import { ArrowBack, Circle, Padding } from "@suid/icons-material";
import { Button, IconButton, List, ListItem, ListItemIcon, Typography } from "@suid/material";
import { createResource, createSignal, For, Match, Show, Switch } from "solid-js";

import styles from './Admin.module.css';
import { jwt_token } from "../App";
import { FieldForm } from "./FarmFieldForm";
import { FieldGroupForm } from "./FarmFieldGroupForm";
import { getFarmFieldGroupsWithFields } from "../requests";
import { FarmFieldGroup } from "../../bindings/FarmFieldGroup";
import { FarmField } from "../../bindings/FarmField";
import FieldsAdmin from "./FieldsAdmin";
import FieldGroupAdmin from "./FieldGroupAdmin";
import UserAdmin from "./UserAdmin";


type AdminNav = "fields" | "field-groups" | "users" | "harvests"
const adminButtons: AdminNav[] = ["fields", "field-groups", "users", "harvests"]
const toUpper = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export default function Admin() {
  const [currentView, setCurrentView] = createSignal<AdminNav>("fields");
  const [farmFieldGroups, { refetch }] =
    createResource(getFarmFieldGroupsWithFields);

  function navButton(input: AdminNav) {
    return (
      <Button
        size="small"
        
        variant={currentView() === input ? "contained" : "outlined"}
        onClick={() => setCurrentView(input)}
      >
        {toUpper(input.replace("-", " "))}
      </Button>
    )
  }

  return (
    <main class={styles.container}>
      <Show when={jwt_token()}
        fallback={<p>You don't have access to this page</p>}
      >
        <div class={styles.adminButtonsOuter}>
          <div class={styles.adminButtons}>
            <For each={adminButtons}>
              {input => navButton(input)}
            </For>
          </div>
        </div>
        <Switch >
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
  )
}
