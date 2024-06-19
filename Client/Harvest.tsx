import { createQuery } from "@tanstack/solid-query";
import { For, Match, Show, Switch, createResource, createSignal } from "solid-js";
import { HarvestEvent } from "./bindings/HarvestEvent";
import { FarmFieldMeta } from "./bindings/FarmFieldMeta";
import { Button, MenuItem, Select } from "@suid/material";
import { SelectChangeEvent } from "@suid/material/Select";

const localStorageKey = 'selectedHarvestEvent';

const getHarvestEventFromLocalStore = () => {
  const storedId = localStorage.getItem(localStorageKey);
  return storedId ? parseInt(storedId) : undefined;
};

const updateHarvestEventInLocalStore = (id: number | undefined) => {
  id ? localStorage.setItem(localStorageKey, id.toString()) : localStorage.removeItem(localStorageKey);
};

const createNewHarvestEventInLocalStore = (id: number) => {
  localStorage.setItem(localStorageKey, id.toString());
};

const postNewHarvestEvent = async (fieldId: number): Promise<HarvestEvent | undefined> => {
  const body: HarvestEvent = {
    id: -1,
    value: 0,
    time: new Date().toISOString(),
    field_id: fieldId,
    type_id: 1,
    type_name: '',
  };
  const response = await fetch(`/api/harvest_event`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (response.status === 200) {
    const id = await response.text();
    const newItem = { ...body, id: parseInt(id) };
    return newItem as HarvestEvent;
  }
};

export default function Harvest() {
  const [selectedField, setSelectedField] = createResource<FarmFieldMeta | undefined>(() => undefined);
  const [isUpdating, setIsUpdating] = createSignal(false);

  const trygetHarvest = async () => {
    const fieldId = selectedField()?.id;
    return fieldId === undefined ? undefined : fetch(`/api/harvest_event/${fieldId}`).then(a => a.json());
  }

  const fieldHarvests = createQuery<HarvestEvent[]>(() => ({
    queryKey: ['harvest', selectedField()?.id],
    queryFn: () => trygetHarvest(),
    enabled: !!selectedField()
  }));

  const currentHarvest = createQuery<HarvestEvent | undefined>(() => ({
    queryKey: ['harvest', getHarvestEventFromLocalStore()],
    queryFn: trygetHarvest,
    enabled: getHarvestEventFromLocalStore() !== undefined
  }));

  const fields = createQuery<FarmFieldMeta[]>(() => ({
    queryKey: ['fields'],
    queryFn: () => fetch('/api/farm_fields').then(a => a.json())
  }));

  const selectField = (e: SelectChangeEvent) => {
    const id = parseInt(e.target.value);
    const field = fields.data?.find(x => x.id === id);
    setSelectedField.mutate(field);
  }

  return (
    <div style={{ display: 'flex', "flex-direction": 'column', "align-items": 'center', padding: '20px' }}>
      <Switch>
        <Match when={fields.isLoading}>Loading</Match>
        <Match when={fields.data !== undefined}>

          <Select
            value={selectedField()?.id ?? -1}
            sx={{ width: 300 }}
            onChange={selectField}
          >
            <MenuItem disabled value={-1}>Velg jorde</MenuItem>
            <For each={fields.data}>{(field) => (
              <MenuItem value={field.id}>{field.farm_field_group_name ?? ''} - {field.name}</MenuItem>
            )}</For>
          </Select>

        </Match>
      </Switch>

      <Switch>
        <Match when={currentHarvest.isLoading}>Laster...</Match>
        <Match when={currentHarvest.isError}>Error: {(currentHarvest.error as Error).message}</Match>
        <Match when={currentHarvest.data === undefined}>
          <p>Velg eller opprett innhøsting for å redigere</p>

          <Show when={fieldHarvests.data !== undefined && fieldHarvests.data.length > 0}>
            <Select
              sx={{ width: 300 }}
            >
              <MenuItem disabled value={-1}>Velg innhøsting</MenuItem>
              <For each={fieldHarvests.data}>{(harvest) => (
                <MenuItem value={harvest.id}>
                  {harvest.time} - {harvest.type_name}
                </MenuItem>
              )}</For>
            </Select>
          </Show>

          <Button
            variant="contained"
            onClick={async () => {
              if (isUpdating()) return;
              setIsUpdating(true);
              const newEvent = await postNewHarvestEvent(selectedField()?.id ?? -1);
              if (newEvent) {
                createNewHarvestEventInLocalStore(newEvent.id);
              }
              setIsUpdating(false);
            }}>
            Lag ny
          </Button>

        </Match>
      </Switch>

    </div>
  );
}