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

import { FieldEvent } from "../../bindings/FieldEvent";
import { FieldEventType } from "../../bindings/FieldEventType";
import { FieldEventValue } from "../../bindings/FieldEventValue";
import { FarmFieldGroupMeta } from "../../bindings/FarmFieldGroupMeta";
import { ConfirmDeleteDialog, formatDate } from "../Utils";
import { prepareAuth } from "../requests";
import { FieldEventNote, FieldEventSummary, FieldEventValueBoxes } from "./FieldEventValueDisplay";
import { FieldEventValueInput } from "./FieldEventValueInput";
import { FieldEventValues, valuesForType } from "./fieldEventValues";
import dialogStyles from "./FieldEventForm.module.css";
import styles from "./FieldEvents.module.css";

type EventForm = {
  id: number;
  field_id: number;
  type_id: number;
  type_name: string;
  values: FieldEventValues;
  note: string;
  time: string;
};

type NumericSummaryStat = {
  label: string;
  value: string;
  detail: string;
};

const formatStatNumber = (value: number) =>
  value.toLocaleString("nb-NO", {
    maximumFractionDigits: 1,
  });

async function getFieldEvents() {
  const response = await fetch("/api/field_event");
  return response.json() as Promise<FieldEvent[]>;
}

async function saveFieldEvent(form: EventForm, eventType: FieldEventType) {
  const authHeaders = prepareAuth(true);
  if (!authHeaders) {
    return false;
  }

  const payload: FieldEvent = {
    id: form.id,
    field_id: form.field_id,
    type_id: eventType.id,
    type_name: eventType.name,
    note: form.note.trim() ? form.note.trim() : null,
    values: valuesForType(eventType, form.values),
    time: new Date(form.time).toISOString(),
  };

  const isNew = form.id < 0;
  const response = await fetch(isNew ? "/api/field_event" : `/api/field_event/${form.id}`, {
    method: isNew ? "POST" : "PATCH",
    headers: authHeaders,
    body: JSON.stringify(payload),
  });

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
  const [yearFilter, setYearFilter] = createSignal("all");
  const [typeFilter, setTypeFilter] = createSignal("all");
  const [fieldFilter, setFieldFilter] = createSignal("all");

  const groups = createQuery<FarmFieldGroupMeta[]>(() => ({
    queryKey: ["field_groups_meta"],
    queryFn: () =>
      fetch("/api/farm_field_groups/meta").then(
        (response) => response.json() as Promise<FarmFieldGroupMeta[]>,
      ),
  }));

  const eventTypes = createQuery<FieldEventType[]>(() => ({
    queryKey: ["field_event_types"],
    queryFn: () => fetch("/api/field_event_type").then((a) => a.json()),
  }));

  const fieldEvents = createQuery<FieldEvent[]>(() => ({
    queryKey: ["admin_field_events"],
    queryFn: getFieldEvents,
  }));

  const selectedType = createMemo(() =>
    eventTypes.data?.find((eventType) => eventType.id === form()?.type_id),
  );

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

  const fieldOptions = createMemo(() =>
    Array.from(fieldLookup().entries())
      .map(([id, field]) => ({ id, ...field }))
      .sort(
        (a, b) => a.groupName.localeCompare(b.groupName) || a.fieldName.localeCompare(b.fieldName),
      ),
  );

  const eventYear = (event: FieldEvent) => new Date(event.time).getFullYear().toString();

  const yearOptions = createMemo(() =>
    Array.from(new Set((fieldEvents.data ?? []).map(eventYear))).sort(
      (a, b) => Number(b) - Number(a),
    ),
  );

  const filteredEvents = createMemo(() => {
    const selectedYear = yearFilter();
    const selectedType = typeFilter();
    const selectedField = fieldFilter();

    return (fieldEvents.data ?? []).filter((event) => {
      const matchesYear = selectedYear === "all" || eventYear(event) === selectedYear;
      const matchesType = selectedType === "all" || event.type_id.toString() === selectedType;
      const matchesField = selectedField === "all" || event.field_id.toString() === selectedField;
      return matchesYear && matchesType && matchesField;
    });
  });

  const summaryStats = createMemo<NumericSummaryStat[]>(() => {
    const numericFieldNamesByType = new Map<number, Set<string>>();
    const stats = new Map<
      string,
      {
        count: number;
        fieldName: string;
        total: number;
        typeId: number;
        typeName: string;
        unit: string;
      }
    >();

    filteredEvents().forEach((event) => {
      Object.entries(event.values).forEach(([fieldName, value]) => {
        if (value.kind === "text") {
          return;
        }

        if (!numericFieldNamesByType.has(event.type_id)) {
          numericFieldNamesByType.set(event.type_id, new Set());
        }
        numericFieldNamesByType.get(event.type_id)?.add(fieldName);

        const unit = value.kind === "unit_int" ? value.unit : "";
        const key = `${event.type_id}:${fieldName}:${unit}`;
        const existing = stats.get(key) ?? {
          count: 0,
          fieldName,
          total: 0,
          typeId: event.type_id,
          typeName: event.type_name,
          unit,
        };

        stats.set(key, {
          ...existing,
          count: existing.count + 1,
          total: existing.total + value.value,
        });
      });
    });

    return Array.from(stats.values())
      .sort(
        (a, b) => a.typeName.localeCompare(b.typeName) || a.fieldName.localeCompare(b.fieldName),
      )
      .map((stat) => {
        const unitSuffix = stat.unit ? ` ${stat.unit}` : "";
        const hasMultipleNumericFields = (numericFieldNamesByType.get(stat.typeId)?.size ?? 0) > 1;
        const label = hasMultipleNumericFields
          ? `${stat.typeName} ${stat.fieldName}`
          : stat.typeName;
        const average = stat.count > 0 ? stat.total / stat.count : 0;

        return {
          label,
          value: `${formatStatNumber(stat.total)}${unitSuffix}`,
          detail: `${stat.count} entries, avg ${formatStatNumber(average)}${unitSuffix}`,
        };
      });
  });

  const canSave = createMemo(() => {
    const current = form();
    return !!(current && current.field_id > 0 && current.type_id > 0 && date().value.selected);
  });

  const openNewForm = () => {
    setShowInvalid(false);
    setForm({
      id: -1,
      field_id: -1,
      type_id: -1,
      type_name: "",
      values: {},
      note: "",
      time: "",
    });
    setDate({
      value: {},
      label: "",
    });
  };

  const openEditForm = (event: FieldEvent) => {
    setShowInvalid(false);
    const eventType = eventTypes.data?.find((type) => type.id === event.type_id);
    setForm({
      id: event.id,
      field_id: event.field_id,
      type_id: event.type_id,
      type_name: event.type_name,
      values: valuesForType(eventType, event.values),
      note: event.note ?? "",
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

  const setFieldValue = (name: string, value: FieldEventValue) => {
    const current = form();
    if (!current) {
      return;
    }

    setForm({
      ...current,
      values: {
        ...current.values,
        [name]: value,
      },
    });
  };

  const refreshEvents = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["admin_field_events"],
    });
  };

  const fieldLabel = (fieldId: number) =>
    fieldLookup().get(fieldId)?.fieldName ?? fieldId.toString();

  const groupLabel = (fieldId: number) => fieldLookup().get(fieldId)?.groupName ?? "-";

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
                onChange={(event) => updateForm("field_id", Number(event.target.value))}
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

          <FormControl fullWidth class={dialogStyles.field}>
            <InputLabel shrink id="admin-field-event-type">
              Event type
            </InputLabel>
            <Select
              labelId="admin-field-event-type"
              label="Event type"
              notched
              value={form()?.type_id ?? -1}
              onChange={(event) => {
                const nextTypeId = Number((event.currentTarget as HTMLSelectElement).value);
                const nextType = eventTypes.data?.find((item) => item.id === nextTypeId);
                const current = form();
                if (current) {
                  setForm({
                    ...current,
                    type_id: nextTypeId,
                    type_name: nextType?.name ?? "",
                    values: valuesForType(nextType),
                  });
                }
              }}
            >
              <MenuItem value={-1}>Select type</MenuItem>
              <For each={eventTypes.data ?? []}>
                {(eventType) => <MenuItem value={eventType.id}>{eventType.name}</MenuItem>}
              </For>
            </Select>
          </FormControl>

          <div class={dialogStyles.dateRow}>
            <DatePicker
              inputWrapperWidth="100%"
              placeholder="Select date"
              zIndex={2000}
              value={date}
              setValue={setDate}
              inputWrapperClass={dialogStyles.dateInputWrapper}
              inputClass={`${dialogStyles.dateInput} ${
                showInvalid() && !date().value.selected ? dialogStyles.dateInputInvalid : ""
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
            label="Note"
            size="small"
            multiline
            minRows={3}
            value={form()?.note ?? ""}
            onChange={(_event, nextNote) => updateForm("note", nextNote)}
          />

          <Show when={selectedType()}>
            {(eventType) => (
              <For each={eventType().fields}>
                {(field) => (
                  <FieldEventValueInput
                    field={field}
                    value={form()?.values[field.name]}
                    class={dialogStyles.field}
                    onValue={(value) => setFieldValue(field.name, value)}
                  />
                )}
              </For>
            )}
          </Show>
        </DialogContent>
        <DialogActions class={dialogStyles.dialogActions}>
          <Button onClick={closeForm}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!canSave()}
            onClick={async () => {
              const current = form();
              const selectedTime = date().value.selected;
              const eventType = selectedType();
              setShowInvalid(true);
              if (!current || !selectedTime || !eventType) {
                return;
              }

              const success = await saveFieldEvent(
                {
                  ...current,
                  time: selectedTime,
                },
                eventType,
              );
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
        title={`Delete "${toDelete()?.type_name ?? "field event"}"?`}
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
          <p class={styles.eyebrow}>Field log</p>
          <h2>Field events</h2>
        </div>
        <Button class={styles.heroAction} size="small" variant="contained" onClick={openNewForm}>
          New field event
        </Button>
      </section>

      <Show when={fieldEvents.data}>
        <>
          <section class={styles.tableTools} aria-label="Field event filters">
            <div class={styles.summaryPills}>
              <Show
                when={summaryStats().length > 0}
                fallback={<p class={styles.emptySummary}>No numeric values in this selection.</p>}
              >
                <For each={summaryStats()}>
                  {(stat) => (
                    <div class={styles.summaryPill}>
                      <span>{stat.label}</span>
                      <strong>{stat.value}</strong>
                      <small>{stat.detail}</small>
                    </div>
                  )}
                </For>
              </Show>
            </div>
            <div class={styles.filters}>
              <FormControl size="small" class={styles.filterControl}>
                <InputLabel id="field-event-year-filter">Year</InputLabel>
                <Select
                  labelId="field-event-year-filter"
                  label="Year"
                  value={yearFilter()}
                  onChange={(event) => setYearFilter((event.target as HTMLInputElement).value)}
                >
                  <MenuItem value="all">All years</MenuItem>
                  <For each={yearOptions()}>
                    {(year) => <MenuItem value={year}>{year}</MenuItem>}
                  </For>
                </Select>
              </FormControl>
              <FormControl size="small" class={styles.filterControl}>
                <InputLabel id="field-event-type-filter">Type</InputLabel>
                <Select
                  labelId="field-event-type-filter"
                  label="Type"
                  value={typeFilter()}
                  onChange={(event) => setTypeFilter((event.target as HTMLInputElement).value)}
                >
                  <MenuItem value="all">All types</MenuItem>
                  <For each={eventTypes.data ?? []}>
                    {(eventType) => (
                      <MenuItem value={eventType.id.toString()}>{eventType.name}</MenuItem>
                    )}
                  </For>
                </Select>
              </FormControl>
              <FormControl size="small" class={styles.filterControl}>
                <InputLabel id="field-event-field-filter">Field</InputLabel>
                <Select
                  labelId="field-event-field-filter"
                  label="Field"
                  value={fieldFilter()}
                  onChange={(event) => setFieldFilter((event.target as HTMLInputElement).value)}
                >
                  <MenuItem value="all">All fields</MenuItem>
                  <For each={fieldOptions()}>
                    {(field) => (
                      <MenuItem value={field.id.toString()}>
                        {field.groupName} / {field.fieldName}
                      </MenuItem>
                    )}
                  </For>
                </Select>
              </FormControl>
            </div>
          </section>

          <div class={styles.tableCard}>
            <TableContainer class={styles.tableWrap}>
              <Table size="small" class={styles.table}>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Event</TableCell>
                    <TableCell>Note</TableCell>
                    <TableCell>Field</TableCell>
                    <TableCell>Group</TableCell>
                    <TableCell class={styles.mobileActionCell}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <Show when={filteredEvents().length === 0}>
                    <TableRow>
                      <TableCell colSpan={6}>
                        <p class={styles.emptyState}>No field events match these filters.</p>
                      </TableCell>
                    </TableRow>
                  </Show>
                  <For each={filteredEvents()}>
                    {(event) => (
                      <TableRow
                        class={`${styles.row} ${styles.clickableRow}`}
                        onClick={() => openEditForm(event)}
                      >
                        <TableCell>{formatDate(event.time)}</TableCell>
                        <TableCell>
                          <FieldEventSummary
                            event={event}
                            class={styles.eventSummaryCell}
                            typeClass={styles.eventTypeName}
                            valuesClass={styles.primaryValues}
                            valueClass={styles.primaryValue}
                            nameClass={styles.valueName}
                            formattedValueClass={styles.valueValue}
                          />
                        </TableCell>
                        <TableCell>
                          <FieldEventNote event={event} class={styles.noteValue} />
                        </TableCell>
                        <TableCell>{fieldLabel(event.field_id)}</TableCell>
                        <TableCell>{groupLabel(event.field_id)}</TableCell>
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
            <Show when={filteredEvents().length === 0}>
              <p class={styles.emptyState}>No field events match these filters.</p>
            </Show>
            <For each={filteredEvents()}>
              {(event) => (
                <article class={styles.mobileCard} onClick={() => openEditForm(event)}>
                  <div class={styles.mobileCardTop}>
                    <div>
                      <h3 class={styles.mobileCardTitle}>{event.type_name}</h3>
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
                    <FieldEventValueBoxes event={event} boxClass={styles.valueBox} />
                    <div class={styles.valueBox}>
                      <p>Note</p>
                      <span>
                        <FieldEventNote event={event} />
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
