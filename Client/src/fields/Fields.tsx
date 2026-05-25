import {
  createMemo,
  createSignal,
  For,
  Match,
  Show,
  Switch,
} from "solid-js";
import { createQuery } from "@tanstack/solid-query";
import { Button } from "@suid/material";
import { FarmField } from "../../bindings/FarmField";
import { getFarmFieldGroups } from "../requests";
import { formatArea, getMapPolygonArea } from "../maps/Map";
import styles from "./Fields.module.css";
import FieldsList from "./FieldsList";
import { jwt_token } from "../App";
import { FieldForm } from "../admin/fields/FieldForm";

export default function Fields() {
  const [showCreateForm, setShowCreateForm] = createSignal(false);
  const groups = createQuery(() => ({
    queryKey: ["field_groups"],
    queryFn: getFarmFieldGroups,
  }));
  const fields = createQuery(() => ({
    queryKey: ["fields_all"],
    queryFn: () =>
      fetch("/api/farm_fields/all").then((response) =>
        response.json() as Promise<FarmField[]>,
      ),
  }));

  const fieldAreas = createMemo(() =>
    (fields.data ?? []).map((field) => ({
      ...field,
      area: getMapPolygonArea(field.map_polygon_string),
    })),
  );

  const totalArea = createMemo(() =>
    fieldAreas().reduce((sum, field) => sum + Math.max(field.area, 0), 0),
  );

  const stats = createMemo(() => [
    { label: "Fields", value: (fields.data?.length ?? "...").toString() },
    { label: "Groups", value: (groups.data?.length ?? "...").toString() },
    { label: "Total area", value: fields.data ? formatArea(totalArea()) : "..." },
  ]);

  return (
    <main class={styles.page}>
      <section class={styles.summaryBar} aria-label="Field summary">
        <For each={stats()}>
          {(stat) => (
            <article class={styles.statTile}>
              <p class={styles.statLabel}>{stat.label}</p>
              <p class={styles.statValue}>{stat.value}</p>
            </article>
          )}
        </For>
      </section>

      <Switch>
        <Match when={showCreateForm()}>
          <section class={styles.managementPanel}>
            <div class={styles.managementHeader}>
              <div>
                <p class={styles.managementEyebrow}>Logged-in tools</p>
                <h2>Create a field</h2>
              </div>
              <Button
                variant="outlined"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </Button>
            </div>
            <FieldForm onCreate={() => setShowCreateForm(false)} />
          </section>
        </Match>
        <Match when={!showCreateForm()}>
          <FieldsList
            showDelete={jwt_token() !== null}
            addButton={() => (
              <Show when={jwt_token()}>
                <Button
                  variant="contained"
                  onClick={() => setShowCreateForm(true)}
                >
                  New field
                </Button>
              </Show>
            )}
          />
        </Match>
      </Switch>
    </main>
  );
}
