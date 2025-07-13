import { createInfiniteQuery, createQuery, InfiniteData, useQueryClient } from "@tanstack/solid-query";
import { createMemo, createSignal, For, Show } from "solid-js";
import { HarvestEvent } from "../../bindings/HarvestEvent";
import { Button, FormControl, IconButton, InputLabel, MenuItem, Select, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@suid/material";
import { HarvestPagination } from "../../bindings/HarvestPagination";
import { ConfirmDeleteDialog, formatDate, getYearRangeSinceYearToCurrent } from "../Utils";
import { FarmFieldMeta } from "../../bindings/FarmFieldMeta";
import { FarmFieldGroupMeta } from "../../bindings/FarmFieldGroupMeta";
import { jwt_token } from "../App";
import { HarvestForm, ValidHarvest } from "./HarvestForm";
import { Harvest } from "./SelectedHarvest";
import { Delete } from "@suid/icons-material";
import { prepareAuth } from "../requests";
import styles from "./Harvest.module.css";

const years = getYearRangeSinceYearToCurrent(2022);

// todo make this configurable maybe
const page_size = 100;

const getHarvestEvents = async (page: number, year: number, field_id?: number, group_id?: number) => {
  const url = new URL(document.location.origin + "/api/harvest_event");
  url.searchParams.append("page", page.toString());
  url.searchParams.append("page_size", page_size.toString())
  url.searchParams.append("year", year.toString())
  if (field_id) {
    url.searchParams.append("field_id", field_id.toString());
  }
  if (group_id) {
    url.searchParams.append("group_id", group_id.toString());
  }
  const result: Promise<HarvestPagination> = fetch(url).then((a) => a.json());
  return (await result).events;
}

const deleteHarvestEvent = async (id: number) => {
  const authHeaders = prepareAuth(true);
  if (authHeaders === null) {
    console.log("not allowed to post without bearer token");
    return false;
  }
  const response = await fetch(`/api/harvest_event/${id}`, {
    method: "DELETE",
    headers: authHeaders,
  });
  if (response.status === 200) {
    return true;
  } else {
    return false;
  }
};

export default function HarvestList() {
  const isAdmin = jwt_token() !== null;
  const [year, setYear] = createSignal(new Date().getFullYear());
  const [fieldGroup, setFieldGroup] = createSignal<FarmFieldGroupMeta>();
  const [field, setField] = createSignal<FarmFieldMeta>();
  const queryClient = useQueryClient();
  const [createNew, setCreateNew] = createSignal(false);
  const [selectedHarvest, setSelectedHarvest] = createSignal<ValidHarvest>();
  const [toDelete, setToDelete] = createSignal<number | undefined>(undefined);

  const groups = createQuery<FarmFieldGroupMeta[]>(() => ({
    queryKey: ["field_groups"],
    queryFn: () => fetch("/api/farm_field_groups/meta").then((a) => a.json()),
  }));

  const fieldLookup = createMemo(() => {
    const m = new Map<number, { group: FarmFieldGroupMeta, field: FarmFieldMeta }>();
    groups.data?.forEach(g => g.fields.forEach(f => m.set(f.id, { group: g, field: f })))
    return m;
  }, [groups.data])

  const harvestEvents = createInfiniteQuery<HarvestEvent[], Error, InfiniteData<HarvestEvent[], unknown>, ["harvestEventsInfinite", number, number, number]>(() => ({
    queryKey: ["harvestEventsInfinite", year(), field()?.id || -1, fieldGroup()?.id || -1],
    queryFn: (param) => getHarvestEvents(param.pageParam as number, year(), field()?.id, fieldGroup()?.id),
    keepPreviousData: true,
    initialPageParam: 1,
    getNextPageParam: (lastPage: HarvestEvent[], allPages: HarvestEvent[][]) => lastPage.length < page_size ? undefined : allPages.length + 1,
    getPreviousPageParam: (firstPage: HarvestEvent[], allPages: HarvestEvent[][]) => firstPage.length < page_size ? undefined : allPages.length - 1
  }))

  function handleCreateNewEvent(event: ValidHarvest) {
    const date = new Date(event.harvest.time);
    const year = date.getFullYear();
    const fieldId = event.field.id;
    const groupId = event.group.id;

    const keysToInvalidate = [
      [year, -1, -1],
      [year, fieldId, -1],
      [year, -1, groupId],
      [year, fieldId, groupId],
    ];

    keysToInvalidate.forEach(([y, fId, gId]) => {
      queryClient.invalidateQueries({
        queryKey: ["harvestEventsInfinite", y, fId, gId],
      });
    });
  }

  function handleDeleteSuccess() {
    setToDelete(undefined);
    queryClient.invalidateQueries({
      queryKey: ["harvestEventsInfinite", year(), field(), fieldGroup()],
    });
    queryClient.invalidateQueries({
      queryKey: ["harvestEventsInfinite", year(), -1, fieldGroup()],
    });
    queryClient.invalidateQueries({
      queryKey: ["harvestEventsInfinite", year(), -1, -1],
    });
  }

  function RenderHarvestList() {
    return (
      <main
        style={{
          "max-width": "800px",
          margin: "0 auto",
          width: "calc(100% - 40px)",
        }}
      >
        <HarvestForm
          isOpen={createNew}
          selectHarvest={handleCreateNewEvent}
          onClose={() => setCreateNew(false)}
          field={field()}
          group={fieldGroup()}
        />
        <Show when={isAdmin}>
          <ConfirmDeleteDialog
            open={toDelete() !== undefined}
            onClose={() => setToDelete(undefined)}
            onConfirm={() => {
              const id = toDelete();
              if (id !== undefined) {
                deleteHarvestEvent(id).then(handleDeleteSuccess);
              }
            }}
            title="Are you sure you want to delete this harvest?"
          />
        </Show>
        <div class={styles.listFilterContainer}>
          <FormControl class={styles.filterComponent} size="small">
            <InputLabel shrink id="yearSelect">
              Select year
            </InputLabel>
            <Select
              labelId="yearSelect"
              color="primary"
              id="year-select"
              value={year().toString()}
              label="Select year"
              notched
              onChange={async (value) => {
                const year = parseInt(value.target.value);
                setYear(year);
              }}
            >
              {years.map((year) => (
                <MenuItem value={year}>{year}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl class={styles.filterComponent} size="small">
            <InputLabel shrink id="groupSelect">
              Select group
            </InputLabel>
            <Select
              labelId="groupSelect"
              color="primary"
              id="group-select"
              value={fieldGroup()?.id || -1}
              label="Select group"
              notched
              onChange={async (value) => {
                console.log(value.target.value)
                if (value.target.value === -1) {
                  setFieldGroup(undefined);
                }
                const g = groups.data?.find(x => x.id === value.target.value);
                if (g) {
                  setFieldGroup(g);
                }
              }}
            >
              <MenuItem value={-1}>All</MenuItem>
              {groups.data?.map((group) => (
                <MenuItem value={group.id}>{group.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl disabled={!fieldGroup()} class={styles.filterComponent} size="small">
            <InputLabel shrink id="fieldSelect">
              Select field
            </InputLabel>
            <Select
              labelId="fieldSelect"
              color="primary"
              id="field-select"
              value={field()?.id || -1}
              label="Select field"
              notched
              onChange={async (value) => {
                if (value.target.value === -1) {
                  setField(undefined);
                }
                const g = fieldGroup()?.fields.find(x => x.id === value.target.value);
                if (g) {
                  setField(g);
                }
              }}
            >
              <MenuItem value={-1}>All</MenuItem>
              {fieldGroup()?.fields.map(field =>
                <MenuItem value={field.id}>{field.name}</MenuItem>
              )}
            </Select>
          </FormControl>

          <Button class={styles.filterComponent} size="small" variant="contained" onClick={() => setCreateNew(true)}>
            New Harvest
          </Button>
        </div>

        <TableContainer>

          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Value</TableCell>
                <TableCell>Time</TableCell>
                <TableCell>Field</TableCell>
                <TableCell>Group</TableCell>
                <TableCell>Type</TableCell>
                <Show when={isAdmin}>
                  <TableCell></TableCell>
                </Show>
              </TableRow>
            </TableHead>
            <TableBody>
              <For each={harvestEvents.data?.pages}>
                {(page) => (
                  <For each={page}>
                    {(harvestEvent) => (
                      <TableRow
                        hover
                        onClick={() => {
                          const values = fieldLookup().get(harvestEvent.field_id);
                          if (!values?.field || !values?.group) {
                            console.log("failed to find field in lookup");
                            return;
                          }
                          setSelectedHarvest({
                            harvest: harvestEvent,
                            field: values?.field,
                            group: values?.group
                          })
                        }}
                        style={{
                          "cursor": "pointer"
                        }}
                      >
                        <TableCell>{harvestEvent.value}</TableCell>
                        <TableCell>{formatDate(harvestEvent.time)}</TableCell>
                        <TableCell>
                          <Show when={groups.data} fallback={<span>{harvestEvent.id}</span>}>
                            {fieldLookup().get(harvestEvent.field_id)?.field.name}
                          </Show>
                        </TableCell>
                        <TableCell>
                          <Show when={groups.data}>
                            {fieldLookup().get(harvestEvent.field_id)?.group.name}
                          </Show>
                        </TableCell>
                        <TableCell>{harvestEvent.type_name}</TableCell>
                        <Show when={isAdmin}>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                setToDelete(harvestEvent.id)
                              }}
                            >
                              <Delete />
                            </IconButton>

                          </TableCell>
                        </Show>
                      </TableRow>
                    )}
                  </For>
                )}
              </For>
            </TableBody>
          </Table>
        </TableContainer>

        <Show when={harvestEvents.hasNextPage}>
          <Button
            size="small"
            onClick={() => harvestEvents.fetchNextPage()}
          >
            Load more
          </Button>
        </Show>
      </main>
    );
  }

  return (
    <div
      class={styles.harvestListRoot}
    >
      <Show
        when={jwt_token()}
        fallback={<p>You don't have access to this page</p>}
      >
        <Show when={selectedHarvest()} fallback={<RenderHarvestList />}>
          {(harvest) =>
            <Harvest selectedHarvest={harvest} setSelectedHarvest={setSelectedHarvest} />
          }
        </Show>
      </Show>
    </div>
  );
}
