import { createQuery } from "@tanstack/solid-query";
import { createSignal, For, Index, Show } from "solid-js";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from "@suid/material";
import { Delete, Edit } from "@suid/icons-material";

import { FieldEventType } from "../../../bindings/FieldEventType";
import { FieldEventTypeField } from "../../../bindings/FieldEventTypeField";
import { FieldEventValueKind } from "../../../bindings/FieldEventValueKind";
import { ConfirmDeleteDialog } from "../../Utils";
import { prepareAuth } from "../../requests";
import { fieldEventValueKindLabels } from "../../fields/FieldEventValueDisplay";
import styles from "../AdminSurface.module.css";

const valueKinds: FieldEventValueKind[] = ["text", "int", "unit_int"];

async function saveFieldEventType(eventType: FieldEventType) {
  const authHeaders = prepareAuth(true);
  if (!authHeaders) {
    return false;
  }

  const isNew = eventType.id < 0;
  const payload: FieldEventType = {
    ...eventType,
    name: eventType.name.trim(),
    fields: eventType.fields
      .filter((field) => field.name.trim().length > 0)
      .filter(
        (field) => !["note", "notes", "description"].includes(field.name.trim().toLowerCase()),
      )
      .map((field) => ({
        ...field,
        name: field.name.trim(),
        unit: field.value_kind === "unit_int" && field.unit?.trim() ? field.unit.trim() : null,
      })),
  };

  const response = await fetch(
    isNew ? "/api/field_event_type" : `/api/field_event_type/${eventType.id}`,
    {
      method: isNew ? "POST" : "PATCH",
      headers: authHeaders,
      body: JSON.stringify(payload),
    },
  );

  return response.ok;
}

async function deleteFieldEventType(typeId: number) {
  const authHeaders = prepareAuth(true);
  if (!authHeaders) {
    return false;
  }

  const response = await fetch(`/api/field_event_type/${typeId}`, {
    method: "DELETE",
    headers: authHeaders,
  });

  return response.ok;
}

const newField = (): FieldEventTypeField => ({
  id: -Date.now(),
  name: "",
  value_kind: "text",
  unit: null,
});

export default function FieldEventTypes() {
  const [form, setForm] = createSignal<FieldEventType | undefined>(undefined);
  const [toDelete, setToDelete] = createSignal<FieldEventType | undefined>(undefined);

  const eventTypes = createQuery<FieldEventType[]>(() => ({
    queryKey: ["field_event_types"],
    queryFn: () => fetch("/api/field_event_type").then((a) => a.json()),
  }));

  const updateForm = (next: FieldEventType) => setForm(next);

  const updateField = (index: number, patch: Partial<FieldEventTypeField>) => {
    const current = form();
    if (!current) {
      return;
    }

    updateForm({
      ...current,
      fields: current.fields.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, ...patch } : field,
      ),
    });
  };

  return (
    <main class={styles.page}>
      <Dialog
        open={form() !== undefined}
        onClose={() => setForm(undefined)}
        classes={{ paper: styles.dialogPaper }}
      >
        <DialogTitle class={styles.dialogTitle}>
          {form()?.id && form()!.id > 0 ? `Update ${form()?.name ?? ""}` : "Add field event type"}
        </DialogTitle>
        <DialogContent class={styles.dialogContent}>
          <TextField
            fullWidth
            label="Name"
            variant="outlined"
            size="small"
            value={form()?.name ?? ""}
            onChange={(event) => {
              const current = form();
              if (current) {
                updateForm({ ...current, name: event.currentTarget.value });
              }
            }}
          />

          <Index each={form()?.fields ?? []}>
            {(field, index) => (
              <div class={styles.toolbar}>
                <TextField
                  label="Field"
                  size="small"
                  value={field().name}
                  onInput={(event) =>
                    updateField(index, {
                      name: (event.currentTarget as HTMLInputElement).value,
                    })
                  }
                />
                <FormControl size="small">
                  <InputLabel id={`field-kind-${index}`}>Kind</InputLabel>
                  <Select
                    labelId={`field-kind-${index}`}
                    label="Kind"
                    value={field().value_kind}
                    onChange={(event) =>
                      updateField(index, {
                        value_kind: (event.currentTarget as HTMLSelectElement)
                          .value as FieldEventValueKind,
                      })
                    }
                  >
                    <For each={valueKinds}>
                      {(kind) => (
                        <MenuItem value={kind}>{fieldEventValueKindLabels[kind]}</MenuItem>
                      )}
                    </For>
                  </Select>
                </FormControl>
                <Show when={field().value_kind === "unit_int"}>
                  <TextField
                    label="Unit"
                    size="small"
                    value={field().unit ?? ""}
                    onInput={(event) =>
                      updateField(index, {
                        unit: (event.currentTarget as HTMLInputElement).value,
                      })
                    }
                  />
                </Show>
                <IconButton
                  color="error"
                  onClick={() => {
                    const current = form();
                    if (current) {
                      updateForm({
                        ...current,
                        fields: current.fields.filter((_, fieldIndex) => fieldIndex !== index),
                      });
                    }
                  }}
                >
                  <Delete />
                </IconButton>
              </div>
            )}
          </Index>

          <Button
            variant="outlined"
            onClick={() => {
              const current = form();
              if (current) {
                updateForm({
                  ...current,
                  fields: [...current.fields, newField()],
                });
              }
            }}
          >
            Add field
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForm(undefined)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!form()?.name.trim()}
            onClick={async () => {
              const current = form();
              if (!current) {
                return;
              }

              const success = await saveFieldEventType(current);
              if (success) {
                setForm(undefined);
                await eventTypes.refetch();
              }
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDeleteDialog
        open={toDelete() !== undefined}
        title={`Delete "${toDelete()?.name ?? "field event type"}"?`}
        onClose={() => setToDelete(undefined)}
        onConfirm={async () => {
          const current = toDelete();
          if (!current) {
            return;
          }

          const success = await deleteFieldEventType(current.id);
          if (success) {
            setToDelete(undefined);
            await eventTypes.refetch();
          }
        }}
      />

      <section class={styles.hero}>
        <div class={styles.heroContent}>
          <p class={styles.eyebrow}>Admin editor</p>
          <h2>Field event types</h2>
        </div>
        <Button
          class={styles.heroAction}
          size="small"
          variant="contained"
          onClick={() => setForm({ id: -1, name: "", fields: [] })}
        >
          New type
        </Button>
      </section>

      <Show when={eventTypes.isSuccess && eventTypes.data}>
        <>
          <div class={styles.tableCard}>
            <TableContainer class={styles.tableWrap}>
              <Table size="small" class={styles.table}>
                <TableHead>
                  <TableRow>
                    <TableCell>Id</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Fields</TableCell>
                    <TableCell class={styles.mobileActionCell}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <For each={eventTypes.data}>
                    {(eventType) => (
                      <TableRow
                        class={`${styles.row} ${styles.clickableRow}`}
                        onClick={() =>
                          setForm({
                            ...eventType,
                            fields: [...eventType.fields],
                          })
                        }
                      >
                        <TableCell>{eventType.id}</TableCell>
                        <TableCell>{eventType.name}</TableCell>
                        <TableCell>
                          {eventType.fields
                            .map(
                              (field) =>
                                `${field.name} (${fieldEventValueKindLabels[field.value_kind]})`,
                            )
                            .join(", ") || "-"}
                        </TableCell>
                        <TableCell class={styles.mobileActionCell}>
                          <div class={styles.chipActions}>
                            <IconButton
                              onClick={(event) => {
                                event.stopPropagation();
                                setForm({
                                  ...eventType,
                                  fields: [...eventType.fields],
                                });
                              }}
                            >
                              <Edit />
                            </IconButton>
                            <IconButton
                              color="error"
                              onClick={(event) => {
                                event.stopPropagation();
                                setToDelete(eventType);
                              }}
                            >
                              <Delete />
                            </IconButton>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </For>
                </TableBody>
              </Table>
            </TableContainer>
          </div>

          <div class={styles.mobileCards}>
            <For each={eventTypes.data}>
              {(eventType) => (
                <article
                  class={styles.mobileCard}
                  onClick={() => setForm({ ...eventType, fields: [...eventType.fields] })}
                >
                  <div class={styles.mobileCardTop}>
                    <div>
                      <h3 class={styles.mobileCardTitle}>{eventType.name}</h3>
                      <p class={styles.mobileCardMeta}>Type #{eventType.id}</p>
                    </div>
                    <div class={styles.chipActions}>
                      <IconButton
                        color="error"
                        onClick={(event) => {
                          event.stopPropagation();
                          setToDelete(eventType);
                        }}
                      >
                        <Delete />
                      </IconButton>
                    </div>
                  </div>
                  <div class={styles.mobileCardFacts}>
                    <div>
                      <p>Fields</p>
                      <span>
                        {eventType.fields
                          .map(
                            (field) =>
                              `${field.name} (${fieldEventValueKindLabels[field.value_kind]})`,
                          )
                          .join(", ") || "-"}
                      </span>
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
