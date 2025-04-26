import { createInfiniteQuery, createQuery, InfiniteData } from "@tanstack/solid-query";
import { createSignal, For, Show } from "solid-js";
import { HarvestEvent } from "../../../bindings/HarvestEvent";
import { Button, FormControl, InputLabel, MenuItem, Select, Table, TableBody, TableCell, TableHead, TableRow } from "@suid/material";
import { prepareAuth } from "../../requests";
import { HarvestPagination } from "../../../bindings/HarvestPagination";
import { formatDate } from "../../Utils";
import { FarmFieldMeta } from "../../../bindings/FarmFieldMeta";

// https://stackoverflow.com/questions/1575271/range-of-years-in-javascript-for-a-select-box
const years = Array.from({ length: (new Date().getFullYear() - 2022) / 1 + 1 }, (_, i) => 2022 + (i * 1));

// todo make this configurable maybe
const page_size = 100;

const getHarvestEvents = async (page: number, year: number) => {
  const authHeaders = prepareAuth(false);
  const result: Promise<HarvestPagination> = fetch(
    `/api/harvest_event?page_size=${page_size}&page=${page}&year=${year}`, {
    headers: authHeaders!
  }
  ).then((a) => a.json());
  return (await result).events;
}

export default function HarvestAdmin() {
  const [year, setYear] = createSignal(new Date().getFullYear());

  const fields = createQuery<FarmFieldMeta[]>(() => ({
    queryKey: ["fields_meta"], 
    queryFn: () => fetch("/api/farm_fields").then((a) => a.json())
  }));

  const harvestEvents = createInfiniteQuery<HarvestEvent[], Error, InfiniteData<HarvestEvent[], unknown>, ["harvestEventsInfinite", number]>(() => ({
    queryKey: ["harvestEventsInfinite", year()],
    queryFn: (param) => getHarvestEvents(param.pageParam as number, year()),
    keepPreviousData: true,
    initialPageParam: 1,
    getNextPageParam: (lastPage: HarvestEvent[], allPages: HarvestEvent[][]) => lastPage.length < page_size ? undefined : allPages.length + 1,
    getPreviousPageParam: (firstPage: HarvestEvent[], allPages: HarvestEvent[][]) => firstPage.length < page_size ? undefined : allPages.length - 1
  }))

  return (
    <main
      style={{
        padding: "10px",
        "max-width": "800px",
        margin: "0 auto",
        width: "calc(100% - 40px)",
      }}
    >
      <div style={{ display: "flex", "justify-content": "space-between" }}>
        <FormControl style={{ width: "150px" }} size="small">
          <InputLabel shrink id="yearSelect">
            Select year
          </InputLabel>
          <Select
            labelId="yearSelect"
            color="primary"
            id="year-select"
            value={year().toString()}
            label="Select Year"
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
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Id</TableCell>
            <TableCell>Value</TableCell>
            <TableCell>Time</TableCell>
            <TableCell>Field Id</TableCell>
            <TableCell>Type</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <For each={harvestEvents.data?.pages}>
            {(page) => (
              <For each={page}>
                {(harvestEvent) => (
                  <TableRow>
                    <TableCell>{harvestEvent.id}</TableCell>
                    <TableCell>{harvestEvent.value}</TableCell>
                    <TableCell>{formatDate(harvestEvent.time)}</TableCell>
                    <TableCell>
                      <Show when={fields.data} fallback={<span>{harvestEvent.id}</span>}>
                        {fields.data?.find((f) => f.id === harvestEvent.field_id)?.name}
                      </Show>
                      </TableCell>
                    <TableCell>{harvestEvent.type_name}</TableCell>
                  </TableRow>
                )}
              </For>
            )}
          </For>
        </TableBody>
      </Table>

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