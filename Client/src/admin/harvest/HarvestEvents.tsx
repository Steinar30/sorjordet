import { createMemo, createSignal, For, Show } from "solid-js";
import { createInfiniteQuery, createQuery, useQueryClient } from "@tanstack/solid-query";
import {
  Button,
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
} from "@suid/material";
import { Edit } from "@suid/icons-material";
import { HarvestEvent } from "../../../bindings/HarvestEvent";
import { HarvestPagination } from "../../../bindings/HarvestPagination";
import { FarmFieldGroupMeta } from "../../../bindings/FarmFieldGroupMeta";
import { formatDate, getYearRangeSinceYearToCurrent } from "../../Utils";
import { prepareAuth } from "../../requests";
import { HarvestForm, ValidHarvest } from "../../harvest/HarvestForm";
import { DrynessIndicator } from "../../harvest/DrynessIndicator";
import { drynessRatings, getDrynessDisplay } from "../../harvest/dryness";
import harvestStyles from "../../harvest/Harvest.module.css";
import styles from "./HarvestEvents.module.css";

const pageSize = 100;
const years = getYearRangeSinceYearToCurrent(2022).reverse();

async function getHarvestEvents(year: number, page: number) {
  const url = new URL(`${document.location.origin}/api/harvest_event`);
  url.searchParams.append("page", page.toString());
  url.searchParams.append("page_size", pageSize.toString());
  url.searchParams.append("year", year.toString());

  const response = await fetch(url);
  const data = (await response.json()) as HarvestPagination;
  return data.events;
}

async function updateHarvestDryness(event: HarvestEvent, drynessRating: number | null) {
  const authHeaders = prepareAuth(true);
  if (authHeaders === null) {
    throw new Error("not allowed to update without bearer token");
  }

  const response = await fetch(`/api/harvest_event/${event.id}`, {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify({
      ...event,
      dryness_rating: drynessRating,
    }),
  });

  if (response.status !== 200) {
    throw new Error("Something went wrong updating harvest dryness");
  }

  return response.json() as Promise<HarvestEvent>;
}

export default function HarvestEvents() {
  const queryClient = useQueryClient();
  const [year, setYear] = createSignal(new Date().getFullYear());
  const [missingDrynessOnly, setMissingDrynessOnly] = createSignal(false);
  const [isFormOpen, setIsFormOpen] = createSignal(false);
  const [form, setForm] = createSignal<ValidHarvest | undefined>(undefined);

  const groups = createQuery<FarmFieldGroupMeta[]>(() => ({
    queryKey: ["field_groups_meta"],
    queryFn: () =>
      fetch("/api/farm_field_groups/meta").then(
        (response) => response.json() as Promise<FarmFieldGroupMeta[]>,
      ),
  }));

  const harvestEvents = createInfiniteQuery<HarvestEvent[]>(() => ({
    queryKey: ["admin_harvest_events", year()],
    queryFn: ({ pageParam }) => getHarvestEvents(year(), pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < pageSize ? undefined : allPages.length + 1,
  }));

  const visiblePages = createMemo(() =>
    harvestEvents.data?.pages.map((page) =>
      missingDrynessOnly()
        ? page.filter((event) => event.dryness_rating === null)
        : page,
    ) ?? [],
  );

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

  const openNewForm = () => {
    setForm(undefined);
    setIsFormOpen(true);
  };

  const openEditForm = (event: HarvestEvent) => {
    const group = groups.data?.find((entry) =>
      entry.fields.some((field) => field.id === event.field_id),
    );
    const field = group?.fields.find((entry) => entry.id === event.field_id);
    if (!group || !field) {
      return;
    }
    setForm({
      group,
      field,
      harvest: event,
    });
    setIsFormOpen(true);
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

  const setDryness = async (event: HarvestEvent, rating: number) => {
    await updateHarvestDryness(event, rating);
    await refreshYear();
  };

  const renderDrynessBackfill = (event: HarvestEvent) => (
    <Show
      when={event.dryness_rating === null}
      fallback={<DrynessIndicator rating={event.dryness_rating} class={harvestStyles.drynessChip} compact />}
    >
      <div class={styles.backfillButtons}>
        <For each={drynessRatings}>
          {(rating) => {
            const display = getDrynessDisplay(rating);
            return (
              <button
                type="button"
                class={styles.backfillButton}
                style={{
                  "background": display.background,
                  "border-color": display.borderColor,
                  "color": display.color,
                }}
                title={display.description}
                onClick={async (clickEvent) => {
                  clickEvent.stopPropagation();
                  await setDryness(event, rating);
                }}
              >
                {rating}
              </button>
            );
          }}
        </For>
      </div>
    </Show>
  );

  return (
    <main class={styles.page}>
      <HarvestForm
        isOpen={isFormOpen}
        initialHarvest={form}
        onClose={() => {
          setIsFormOpen(false);
          setForm(undefined);
        }}
        group={() => undefined}
        field={() => undefined}
        title={form() ? "Edit harvest event" : "Add harvest event"}
        submitLabel={form() ? "Save" : "Add"}
        selectHarvest={async () => {
          setIsFormOpen(false);
          setForm(undefined);
          await refreshYear();
        }}
      />

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

        <Button
          variant={missingDrynessOnly() ? "contained" : "outlined"}
          onClick={() => setMissingDrynessOnly(!missingDrynessOnly())}
        >
          Missing dryness
        </Button>

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
                    <TableCell>Dryness</TableCell>
                    <TableCell align="right">Value</TableCell>
                    <TableCell class={styles.mobileActionCell}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <For each={visiblePages()}>
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
                            <TableCell class={`${styles.cell} ${styles.drynessCell}`}>
                              {renderDrynessBackfill(event)}
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
            <For each={visiblePages()}>
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
                        <div>
                          <p>Dryness</p>
                          {renderDrynessBackfill(event)}
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
          <div style={{ "margin-top": "12px" }}>
            <Button
              variant="outlined"
              onClick={() => harvestEvents.fetchNextPage()}
            >
              Load more
            </Button>
          </div>
        </Show>
      </Show>
    </main>
  );
}