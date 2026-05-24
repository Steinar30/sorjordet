import { createQuery } from "@tanstack/solid-query";
import { createSignal, For, Match, Switch } from "solid-js";
import {
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@suid/material";
import { FarmFieldGroupMeta } from "../../../bindings/FarmFieldGroupMeta";
import { FieldGroupForm } from "./FieldGroupForm";
import { Edit } from "@suid/icons-material";
import styles from "../AdminSurface.module.css";

export default function FieldGroupAdmin() {
  const [editForm, setEditForm] = createSignal<FarmFieldGroupMeta | undefined>(
    undefined,
  );
  const [newForm, setNewForm] = createSignal(false);

  const groups = createQuery<FarmFieldGroupMeta[]>(() => ({
    queryKey: ["field_groups"],
    queryFn: () => fetch("/api/farm_field_groups/meta").then((a) => a.json()),
  }));

  const RenderGroupsList = () => {
    return (
      <>
        <div class={styles.tableCard}>
          <TableContainer class={styles.tableWrap}>
          <Table size="small" class={styles.table}>
            <TableHead>
              <TableRow>
                <TableCell></TableCell>
                <TableCell>ID</TableCell>
                <TableCell>Group</TableCell>
                <TableCell>Fields</TableCell>
                <TableCell class={styles.mobileActionCell}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <For each={groups.data}>
                {(group) => (
                  <TableRow
                    class={`${styles.row} ${styles.clickableRow}`}
                    onClick={() => setEditForm(group)}
                  >
                    <TableCell sx={{ width: "20px" }}>
                      <span
                        style={{
                          display: "block",
                          "background-color": group.draw_color,
                          width: "20px",
                          height: "20px",
                          "border-radius": "50%",
                          border: "1px solid gray",
                        }}
                      />
                    </TableCell>
                    <TableCell>{group.id}</TableCell>
                    <TableCell>{group.name}</TableCell>
                    <TableCell>{group.fields.length}</TableCell>
                    <TableCell class={styles.mobileActionCell}>
                      <IconButton
                        onClick={(event) => {
                          event.stopPropagation();
                          setEditForm(group);
                        }}
                      >
                        <Edit />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                )}
              </For>
            </TableBody>
          </Table>
        </TableContainer>
        </div>
        <div class={styles.mobileCards}>
          <For each={groups.data}>
            {(group) => (
              <article
                class={styles.mobileCard}
                onClick={() => setEditForm(group)}
              >
                <div class={styles.mobileCardTop}>
                  <div>
                    <h3 class={styles.mobileCardTitle}>{group.name}</h3>
                    <p class={styles.mobileCardMeta}>Group #{group.id}</p>
                  </div>
                  <span
                    style={{
                      display: "block",
                      "background-color": group.draw_color,
                      width: "18px",
                      height: "18px",
                      "border-radius": "50%",
                      border: "1px solid gray",
                      "flex-shrink": 0,
                    }}
                  />
                </div>
                <div class={styles.mobileCardFacts}>
                  <div>
                    <p>Fields</p>
                    <span>{group.fields.length}</span>
                  </div>
                </div>
              </article>
            )}
          </For>
        </div>
      </>
    );
  };

  const RenderGroups = () => {
    return (
      <div class={styles.page}>
        <section class={styles.hero}>
          <div class={styles.heroContent}>
            <p class={styles.eyebrow}>Admin editor</p>
            <h2>Field groups</h2>
          </div>
          <Button
            class={styles.heroAction}
            size="small"
            variant="contained"
            onClick={() => setNewForm(true)}
          >
            New group
          </Button>
        </section>
        <RenderGroupsList />
      </div>
    );
  };

  return (
    <main class={styles.page}>
      <Switch fallback={<RenderGroups />}>
        <Match when={editForm()}>
          {(form) => (
            <div class={styles.page}>
              <section class={styles.toolbar}>
              <Button variant="outlined" onClick={() => setEditForm(undefined)}>
                Cancel
              </Button>
              </section>
              <FieldGroupForm
                onSave={() => {
                  setEditForm(undefined);
                  groups.refetch();
                }}
                toEdit={form()}
              />
            </div>
          )}
        </Match>
        <Match when={newForm()}>
          <div class={styles.page}>
            <section class={styles.toolbar}>
              <Button variant="outlined" onClick={() => setNewForm(false)}>
                Cancel
              </Button>
            </section>
            <FieldGroupForm onSave={() => setNewForm(false)} />
          </div>
        </Match>
      </Switch>
    </main>
  );
}
