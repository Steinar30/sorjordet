import { createQuery } from "@tanstack/solid-query";
import { createSignal, Show } from "solid-js";
import { HarvestType } from "../../../bindings/HarvestType";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from "@suid/material";
import { Edit } from "@suid/icons-material";
import { prepareAuth } from "../../requests";
import styles from "../AdminSurface.module.css";

// apicalls dont return a new object, using refetch instead
const updateHarvestType = (harvestType: HarvestType) => {
  const authHeaders = prepareAuth(true);
  if (authHeaders === null) {
    console.log("not allowed to post without bearer token");
    return null;
  }
  return fetch(`/api/harvest_type/${harvestType.id}`, {
    method: "PATCH",
    body: JSON.stringify(harvestType),
    headers: authHeaders
  });
};

const createHarvestType = (harvestType: HarvestType) => {
  const authHeaders = prepareAuth(true);
  if (authHeaders === null) {
    console.log("not allowed to post without bearer token");
    return null;
  }
  return fetch(`/api/harvest_type`, {
    method: "POST",
    body: JSON.stringify(harvestType),
    headers: authHeaders
  });
};

export default function HarvestTypes() {
  const [addForm, setAddForm] = createSignal<HarvestType | undefined>(undefined);
  const [editForm, setEditForm] = createSignal<HarvestType | undefined>(undefined);

  const harvestTypes = createQuery<HarvestType[]>(() => ({
    queryKey: ["harvest_types"],
    queryFn: () => fetch("/api/harvest_type").then((a) => a.json()),
  }));

  return (
    <main class={styles.page}>
      <Dialog
        open={addForm() !== undefined || editForm() !== undefined}
        onClose={() => addForm() != undefined ? setAddForm(undefined) : setEditForm(undefined)}
        classes={{ paper: styles.dialogPaper }}
      >
        <DialogTitle class={styles.dialogTitle}>
          <Show when={editForm()} fallback={"Add new type"}>
            {`Update ${editForm()?.name ?? ""}`}
          </Show>
        </DialogTitle>
        <DialogContent class={styles.dialogContent}>
          <Show when={addForm()}>
            <TextField
              fullWidth
              id="name"
              label="Name"
              variant="outlined"
              size="small"
              value={addForm()?.name}
              onChange={(x) => setAddForm({ id: -1, name: x.target.value })}
            />
          </Show>
          <Show when={editForm()}>
            <TextField
              fullWidth
              id="name"
              label="Name"
              variant="outlined"
              size="small"
              value={editForm()?.name}
              onChange={(x) => setEditForm({ id: editForm()!.id, name: x.target.value })}
            />
          </Show>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => addForm() ? setAddForm(undefined) : setEditForm(undefined)}>Cancel</Button>
          <Show when={addForm()}>
            {(toAdd =>
              <Button
                variant="contained"
                onClick={async () => {
                  const n = await createHarvestType(toAdd());
                  if (n?.ok) {
                    setAddForm(undefined);
                    harvestTypes.refetch();
                  }
                }}
              >
                Save
              </Button>
            )}
          </Show>
          <Show when={editForm()}>
            {update => (<Button
              variant="contained"
              onClick={async () => {
                const n = await updateHarvestType(update());
                if (n?.ok) {
                  setEditForm(undefined);
                  harvestTypes.refetch();
                }
              }}
            >
              Save
            </Button>)}
          </Show>
        </DialogActions>
      </Dialog>
      <section class={styles.hero}>
        <p class={styles.eyebrow}>Admin editor</p>
        <h2>Harvest types</h2>
      </section>
      <section class={styles.toolbar}>
        <Button variant="contained" onClick={() => setAddForm({ id: -1, name: "" })}>
          New type
        </Button>
      </section>
      <Show when={harvestTypes.isSuccess && harvestTypes.data}>
        <>
          <div class={styles.tableCard}>
            <TableContainer class={styles.tableWrap}>
            <Table size="small" class={styles.table}>
              <TableHead>
                <TableRow>
                  <TableCell>Id</TableCell>
                  <TableCell>Harvest Type</TableCell>
                  <TableCell class={styles.mobileActionCell}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {harvestTypes.data?.map((harvestType) => (
                  <TableRow
                    class={`${styles.row} ${styles.clickableRow}`}
                    onClick={() => setEditForm(harvestType)}
                  >
                    <TableCell>{harvestType.id}</TableCell>
                    <TableCell>{harvestType.name}</TableCell>
                    <TableCell class={styles.mobileActionCell}>
                      <IconButton
                        onClick={(event) => {
                          event.stopPropagation();
                          setEditForm(harvestType);
                        }}
                      >
                        <Edit />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          </div>
          <div class={styles.mobileCards}>
            <For each={harvestTypes.data}>
              {(harvestType) => (
                <article
                  class={styles.mobileCard}
                  onClick={() => setEditForm(harvestType)}
                >
                  <div class={styles.mobileCardTop}>
                    <div>
                      <h3 class={styles.mobileCardTitle}>{harvestType.name}</h3>
                      <p class={styles.mobileCardMeta}>Type #{harvestType.id}</p>
                    </div>
                  </div>
                </article>
              )}
            </For>
          </div>
        </>
      </Show>
    </main>
  );
}
