import { createMemo, createSignal, For, Show } from "solid-js";
import { createInfiniteQuery, createQuery, useQueryClient } from "@tanstack/solid-query";
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
import { Edit } from "@suid/icons-material";
import { HarvestEvent } from "../../../bindings/HarvestEvent";
import { HarvestPagination } from "../../../bindings/HarvestPagination";
import { FarmFieldGroupMeta } from "../../../bindings/FarmFieldGroupMeta";
import { HarvestType } from "../../../bindings/HarvestType";
import { prepareAuth } from "../../requests";
import { formatDate, getYearRangeSinceYearToCurrent } from "../../Utils";
import styles from "./HarvestEvents.module.css";

const pageSize = 100;
const years = getYearRangeSinceYearToCurrent(2022).reverse();

type EventForm = {
  id: number;
  field_id: number;
  type_id: number;
  type_name: string;
  time: string;
  value: number;
};

const emptyForm: EventForm = {
  id: -1,
  field_id: -1,
  type_id: -1,
  type_name: "",
  time: "",
  value: 0,
};

async function getHarvestEvents(year: number, page: number) {
  const url = new URL(`${document.location.origin}/api/harvest_event`);
  url.searchParams.append("page", page.toString());
  url.searchParams.append("page_size", pageSize.toString());
  url.searchParams.append("year", year.toString());

  const response = await fetch(url);
  const data = (await response.json()) as HarvestPagination;
  return data.events;
}

async function saveHarvestEvent(form: EventForm) {
  const authHeaders = prepareAuth(true);
  if (!authHeaders) {
    return false;
  }

  const payload: HarvestEvent = {
    id: form.id,
    field_id: form.field_id,
    type_id: form.type_id,
    type_name: form.type_name,
    time: new Date(form.time).toISOString(),
    value: form.value,
  };

  const isNew = form.id < 0;
  const response = await fetch(
    isNew ? "/api/harvest_event" : `/api/harvest_event/${form.id}`,
    {
      method: isNew ? "POST" : "PATCH",
      headers: authHeaders,
      body: JSON.stringify(payload),
    },
  );

  return response.ok;
}

function toDateTimeInputValue(value: string) {
  const date = new Date(value);
  const timezoneOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

export default function HarvestEvents() {
  const queryClient = useQueryClient();
  const [year, setYear] = createSignal(new Date().getFullYear());
  const [form, setForm] = createSignal<EventForm | undefined>(undefined);

  const groups = createQuery<FarmFieldGroupMeta[]>(() => ({
    queryKey: ["field_groups_meta"],
    queryFn: () =>
      fetch("/api/farm_field_groups/meta").then(
        (response) => response.json() as Promise<FarmFieldGroupMeta[]>,
      ),
  }));

  const harvestTypes = createQuery<HarvestType[]>(() => ({
    queryKey: ["harvest_types"],
    queryFn: () =>
      fetch("/api/harvest_type").then(
        (response) => response.json() as Promise<HarvestType[]>,
      ),
  }));

  const harvestEvents = createInfiniteQuery<HarvestEvent[]>(() => ({
    queryKey: ["admin_harvest_events", year()],
    queryFn: ({ pageParam }) => getHarvestEvents(year(), pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < pageSize ? undefined : allPages.length + 1,
  }));

  const fieldLookup = createMemo(() => {
    const map = new Map<
      number,
      { fieldName: string; groupName: string }
    >();

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
      current.type_id > 0 &&
      current.time &&
      Number.isFinite(current.value)
    );
  });

  const openNewForm = () => {
    setForm({
      ...emptyForm,
      time: toDateTimeInputValue(new Date().toISOString()),
    });
  };

  const openEditForm = (event: HarvestEvent) => {
    setForm({
      id: event.id,
      field_id: event.field_id,
      type_id: event.type_id,
      type_name: event.type_name,
      time: toDateTimeInputValue(event.time),
      value: event.value,
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

  const refreshYear = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["admin_harvest_events", year()],
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
        onClose={() => setForm(undefined)}
        classes={{ paper: styles.dialogPaper }}
      >
        <DialogTitle class={styles.dialogTitle}>
          <Show when={form()?.id !== -1} fallback={"Add harvest event"}>
            Edit harvest event
          </Show>
        </DialogTitle>
        <DialogContent class={styles.dialogContent}>
          <Show when={groups.data}>
            <FormControl fullWidth size="small">
              <InputLabel id="admin-harvest-field">Field</InputLabel>
              <Select
                labelId="admin-harvest-field"
                label="Field"
                value={form()?.field_id ?? -1}
                onChange={(event) =>
                  updateForm("field_id", Number(event.target.value))
                }
              >
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

          <Show when={harvestTypes.data}>
            <FormControl fullWidth size="small">
              <InputLabel id="admin-harvest-type">Harvest type</InputLabel>
              <Select
                labelId="admin-harvest-type"
                label="Harvest type"
                value={form()?.type_id ?? -1}
                onChange={(event) => {
                  const typeId = Number(event.target.value);
                  const selectedType = harvestTypes.data?.find(
                    (type) => type.id === typeId,
                  );
                  updateForm("type_id", typeId);
                  updateForm("type_name", selectedType?.name ?? "");
                }}
              >
                <For each={harvestTypes.data}>
                  {(type) => <MenuItem value={type.id}>{type.name}</MenuItem>}
                </For>
              </Select>
            </FormControl>
          </Show>

          <TextField
            label="Time"
            type="datetime-local"
            size="small"
            value={form()?.time ?? ""}
            InputLabelProps={{ shrink: true }}
            onChange={(event) => updateForm("time", event.currentTarget.value)}
          />

          <TextField
            label="Value"
            type="number"
            size="small"
            value={form()?.value ?? 0}
            onChange={(event) =>
              updateForm("value", Number(event.currentTarget.value))
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForm(undefined)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!canSave()}
            onClick={async () => {
              const current = form();
              if (!current) {
                return;
              }

              const success = await saveHarvestEvent(current);
              if (success) {
                setForm(undefined);
                await refreshYear();
              }
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <section class={styles.hero}>
        <p class={styles.eyebrow}>Admin editor</p>
        <h2>Harvest events</h2>
      </section>

      <div class={styles.toolbar}>
        <FormControl size="small" class={styles.yearFilter}>
          <InputLabel shrink id="harvest-year-filter">
            Select year
          </InputLabel>
          <Select
            labelId="harvest-year-filter"
            label="Select year"
            value={year().toString()}
            notched
            onChange={(event) => setYear(Number(event.target.value))}
          >
            <For each={years}>
              {(entry) => <MenuItem value={entry}>{entry}</MenuItem>}
            </For>
          </Select>
        </FormControl>

        <Button variant="contained" onClick={openNewForm}>
          New harvest event
        </Button>
      </div>

      <Show when={harvestEvents.data}>
        <>
          <div class={styles.tableCard}>
            <TableContainer class={styles.tableContainer}>
            <Table size="small" class={styles.table}>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Field</TableCell>
                  <TableCell>Group</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Value</TableCell>
                  <TableCell class={styles.mobileActionCell}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <For each={harvestEvents.data?.pages}>
                  {(page) => (
                    <For each={page}>
                      {(event) => (
                        <TableRow
                          class={`${styles.row} ${styles.clickableRow}`}
                          onClick={() => openEditForm(event)}
                        >
                          <TableCell class={styles.cell}>
                            {formatDate(event.time)}
                          </TableCell>
                          <TableCell
                            class={`${styles.cell} ${styles.fieldCell}`}
                          >
                            {fieldLabel(event.field_id)}
                          </TableCell>
                          <TableCell
                            class={`${styles.cell} ${styles.groupCell}`}
                          >
                            {groupLabel(event.field_id)}
                          </TableCell>
                          <TableCell
                            class={`${styles.cell} ${styles.typeCell}`}
                          >
                            {event.type_name}
                          </TableCell>
                          <TableCell
                            align="right"
                            class={`${styles.cell} ${styles.valueCell}`}
                          >
                            {event.value}
                          </TableCell>
                          <TableCell align="right" class={`${styles.cell} ${styles.mobileActionCell}`}>
                            <IconButton
                              size="small"
                              onClick={(rowEvent) => {
                                rowEvent.stopPropagation();
                                openEditForm(event);
                              }}
                            >
                              <Edit />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      )}
                    </For>
                  )}
                </For>
              </TableBody>
            </Table>
          </TableContainer>
          </div>

          <div class={styles.mobileCards}>
            <For each={harvestEvents.data?.pages}>
              {(page) => (
                <For each={page}>
                  {(event) => (
                    <article
                      class={styles.mobileCard}
                      onClick={() => openEditForm(event)}
                    >
                      <div class={styles.mobileCardTop}>
                        <div>
                          <h3 class={styles.mobileCardTitle}>{fieldLabel(event.field_id)}</h3>
                          <p class={styles.mobileCardMeta}>{groupLabel(event.field_id)}</p>
                        </div>
                      </div>
                      <div class={styles.mobileCardFacts}>
                        <div>
                          <p>Date</p>
                          <span>{formatDate(event.time)}</span>
                        </div>
                        <div>
                          <p>Type</p>
                          <span>{event.type_name}</span>
                        </div>
                        <div>
                          <p>Value</p>
                          <span>{event.value}</span>
                        </div>
                      </div>
                    </article>
                  )}
                </For>
              )}
            </For>
          </div>
        </>

        <Show when={harvestEvents.hasNextPage}>
          <Button
            size="small"
            sx={{ "margin-top": "12px" }}
            onClick={() => harvestEvents.fetchNextPage()}
          >
            Load more
          </Button>
        </Show>
      </Show>
    </main>
  );
}
