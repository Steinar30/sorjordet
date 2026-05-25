import { createMemo, createSignal, For, Show } from "solid-js";
import { createQuery, useQueryClient } from "@tanstack/solid-query";
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
import DatePicker, { PickerValue } from "@rnwonder/solid-date-picker";
import "@rnwonder/solid-date-picker/dist/style.css";

import { FieldEvent } from "../../../bindings/FieldEvent";
import { FarmFieldGroupMeta } from "../../../bindings/FarmFieldGroupMeta";
import { ConfirmDeleteDialog, formatDate } from "../../Utils";
import { prepareAuth } from "../../requests";
import dialogStyles from "../../fields/FieldEventForm.module.css";
import styles from "../AdminSurface.module.css";

type EventForm = {
  id: number;
  field_id: number;
  event_name: string;
  description: string;
  time: string;
};

async function getFieldEvents() {
  const response = await fetch("/api/field_event");
  return response.json() as Promise<FieldEvent[]>;
}

async function saveFieldEvent(form: EventForm) {
  const authHeaders = prepareAuth(true);
  if (!authHeaders) {
    return false;
  }

  const payload: FieldEvent = {
    id: form.id,
    field_id: form.field_id,
    event_name: form.event_name.trim(),
    description: form.description.trim() ? form.description.trim() : null,
    time: new Date(form.time).toISOString(),
  };

  const isNew = form.id < 0;
  const response = await fetch(
    isNew ? "/api/field_event" : `/api/field_event/${form.id}`,
    {
      method: isNew ? "POST" : "PATCH",
      headers: authHeaders,
      body: JSON.stringify(payload),
    },
  );

  return response.ok;
}

async function deleteFieldEvent(eventId: number) {
  const authHeaders = prepareAuth(true);
  if (!authHeaders) {
    return false;
  }

  const response = await fetch(`/api/field_event/${eventId}`, {
    method: "DELETE",
    headers: authHeaders,
  });

  return response.ok;
}

export default function FieldEvents() {
  const queryClient = useQueryClient();
  const [form, setForm] = createSignal<EventForm | undefined>(undefined);
  const [toDelete, setToDelete] = createSignal<FieldEvent | undefined>(undefined);
  const [date, setDate] = createSignal<PickerValue>({
    value: {},
    label: "",
  });
  const [showInvalid, setShowInvalid] = createSignal(false);

  const groups = createQuery<FarmFieldGroupMeta[]>(() => ({
    queryKey: ["field_groups_meta"],
    queryFn: () =>
      fetch("/api/farm_field_groups/meta").then(
        (response) => response.json() as Promise<FarmFieldGroupMeta[]>,
      ),
  }));

  const fieldEvents = createQuery<FieldEvent[]>(() => ({
    queryKey: ["admin_field_events"],
    queryFn: getFieldEvents,
  }));

  const fieldLookup = createMemo(() => {
    const map = new Map<number, { fieldName: string; groupName: string }>();
    groups.data?.forEach((group) => {
      group.fields.forEach((field) => {
        map.set(field.id, {
          fieldName: field.name,
          groupName: group.name,
        });
      });
    });
    return map;
  });

  const canSave = createMemo(() => {
    const current = form();
    return !!(
      current &&
      current.field_id > 0 &&
      current.event_name.trim().length > 0 &&
      date().value.selected
    );
  });

  const openNewForm = () => {
    setShowInvalid(false);
    setForm({
      id: -1,
      field_id: -1,
      event_name: "",
      description: "",
      time: "",
    });
    setDate({
      value: {},
      label: "",
    });
  };

  const openEditForm = (event: FieldEvent) => {
    setShowInvalid(false);
    setForm({
      id: event.id,
      field_id: event.field_id,
      event_name: event.event_name,
      description: event.description ?? "",
      time: event.time,
    });
    setDate({
      value: { selected: event.time },
      label: new Date(event.time).toLocaleDateString("nb-NO"),
    });
  };

  const closeForm = () => {
    setForm(undefined);
    setShowInvalid(false);
    setDate({
      value: {},
      label: "",
    });
  };

  const updateForm = <K extends keyof EventForm>(key: K, value: EventForm[K]) => {
    const current = form();
    if (!current) {
      return;
    }
    setForm({
      ...current,
      [key]: value,
    });
  };

  const refreshEvents = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["admin_field_events"],
    });
  };

  const fieldLabel = (fieldId: number) =>
    fieldLookup().get(fieldId)?.fieldName ?? fieldId.toString();

  const groupLabel = (fieldId: number) =>
    fieldLookup().get(fieldId)?.groupName ?? "-";

  return (
    <main class={styles.page}>
      <Dialog
        open={form() !== undefined}
        onClose={closeForm}
        PaperProps={{ class: dialogStyles.dialogPaper }}
      >
        <DialogTitle class={dialogStyles.dialogTitle}>
          {form()?.id && form()!.id > 0 ? "Edit field event" : "Add field event"}
        </DialogTitle>
        <DialogContent class={dialogStyles.dialogContent}>
          <Show when={groups.data}>
            <FormControl fullWidth class={dialogStyles.field}>
              <InputLabel shrink id="admin-field-event-field">
                Select field
              </InputLabel>
              <Select
                labelId="admin-field-event-field"
                label="Select field"
                notched
                value={form()?.field_id ?? -1}
                onChange={(event) =>
                  updateForm("field_id", Number(event.target.value))
                }
              >
                <MenuItem value={-1}>Select field</MenuItem>
                <For each={groups.data}>
                  {(group) => (
                    <For each={group.fields}>
                      {(field) => (
                        <MenuItem value={field.id}>
                          {group.name} / {field.name}
                        </MenuItem>
                      )}
                    </For>
                  )}
                </For>
              </Select>
            </FormControl>
          </Show>

          <TextField
            class={dialogStyles.field}
            label="Event name"
            size="small"
            value={form()?.event_name ?? ""}
            onChange={(event) => updateForm("event_name", event.currentTarget.value)}
          />

          <div class={dialogStyles.dateRow}>
            <DatePicker
              inputWrapperWidth="100%"
              placeholder="Select date"
              zIndex={2000}
              value={date}
              setValue={setDate}
              inputWrapperClass={dialogStyles.dateInputWrapper}
              inputClass={`${dialogStyles.dateInput} ${
                showInvalid() && !date().value.selected
                  ? dialogStyles.dateInputInvalid
                  : ""
              }`}
              shouldCloseOnSelect
            />
            <Button
              variant="outlined"
              class={dialogStyles.nowButton}
              onClick={() => {
                const now = new Date();
                setDate({
                  value: { selected: now.toISOString() },
                  label: now.toLocaleDateString("nb-NO"),
                });
              }}
            >
              Now
            </Button>
          </div>

          <TextField
            class={dialogStyles.field}
            label="Description"
            size="small"
            multiline
            minRows={3}
            value={form()?.description ?? ""}
            onChange={(event) =>
              updateForm("description", event.currentTarget.value)
            }
          />
        </DialogContent>
        <DialogActions class={dialogStyles.dialogActions}>
          <Button onClick={closeForm}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!canSave()}
            onClick={async () => {
              const current = form();
              const selectedTime = date().value.selected;
              setShowInvalid(true);
              if (!current || !selectedTime) {
                return;
              }

              const success = await saveFieldEvent({
                ...current,
                time: selectedTime,
              });
              if (success) {
                closeForm();
                await refreshEvents();
              }
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDeleteDialog
        open={toDelete() !== undefined}
        title={`Delete "${toDelete()?.event_name ?? "field event"}"?`}
        onClose={() => setToDelete(undefined)}
        onConfirm={async () => {
          const current = toDelete();
          if (!current) {
            return;
          }

          const success = await deleteFieldEvent(current.id);
          if (success) {
            setToDelete(undefined);
            await refreshEvents();
          }
        }}
      />

      <section class={styles.hero}>
        <div class={styles.heroContent}>
          <p class={styles.eyebrow}>Admin editor</p>
          <h2>Field events</h2>
        </div>
        <Button
          class={styles.heroAction}
          size="small"
          variant="contained"
          onClick={openNewForm}
        >
          New field event
        </Button>
      </section>

      <Show when={fieldEvents.data}>
        <>
          <div class={styles.tableCard}>
            <TableContainer class={styles.tableWrap}>
              <Table size="small" class={styles.table}>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Event</TableCell>
                    <TableCell>Field</TableCell>
                    <TableCell>Group</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell class={styles.mobileActionCell}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <For each={fieldEvents.data}>
                    {(event) => (
                      <TableRow
                        class={`${styles.row} ${styles.clickableRow}`}
                        onClick={() => openEditForm(event)}
                      >
                        <TableCell>{formatDate(event.time)}</TableCell>
                        <TableCell>{event.event_name}</TableCell>
                        <TableCell>{fieldLabel(event.field_id)}</TableCell>
                        <TableCell>{groupLabel(event.field_id)}</TableCell>
                        <TableCell>{event.description || "-"}</TableCell>
                        <TableCell class={styles.mobileActionCell}>
                          <div class={styles.chipActions}>
                            <IconButton
                              onClick={(rowEvent) => {
                                rowEvent.stopPropagation();
                                openEditForm(event);
                              }}
                            >
                              <Edit />
                            </IconButton>
                            <IconButton
                              color="error"
                              onClick={(rowEvent) => {
                                rowEvent.stopPropagation();
                                setToDelete(event);
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
            <For each={fieldEvents.data}>
              {(event) => (
                <article
                  class={styles.mobileCard}
                  onClick={() => openEditForm(event)}
                >
                  <div class={styles.mobileCardTop}>
                    <div>
                      <h3 class={styles.mobileCardTitle}>{event.event_name}</h3>
                      <p class={styles.mobileCardMeta}>
                        {groupLabel(event.field_id)} / {fieldLabel(event.field_id)}
                      </p>
                    </div>
                    <div class={styles.chipActions}>
                      <IconButton
                        onClick={(rowEvent) => {
                          rowEvent.stopPropagation();
                          openEditForm(event);
                        }}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={(rowEvent) => {
                          rowEvent.stopPropagation();
                          setToDelete(event);
                        }}
                      >
                        <Delete />
                      </IconButton>
                    </div>
                  </div>
                  <div class={styles.mobileCardFacts}>
                    <div>
                      <p>Date</p>
                      <span>{formatDate(event.time)}</span>
                    </div>
                    <div>
                      <p>Description</p>
                      <span>{event.description || "-"}</span>
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
