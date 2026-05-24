import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@suid/material";
import { Switch, Match, Accessor, createEffect, createMemo, createSignal } from "solid-js";
import { FarmFieldGroupMeta } from "../../bindings/FarmFieldGroupMeta";
import { HarvestEvent } from "../../bindings/HarvestEvent";

import styles from "./Harvest.module.css";
import DatePicker, { PickerValue } from "@rnwonder/solid-date-picker";
import "@rnwonder/solid-date-picker/dist/style.css";

import { FarmFieldMeta } from "../../bindings/FarmFieldMeta";
import { createQuery } from "@tanstack/solid-query";
import { HarvestType } from "../../bindings/HarvestType";
import { prepareAuth } from "../requests";

const saveHarvestEvent = async (
  harvestEvent: HarvestEvent,
): Promise<HarvestEvent> => {
  const authHeaders = prepareAuth(true);
  if (authHeaders === null) {
    console.log("not allowed to post without bearer token");
    throw new Error("not allowed to post without bearer token");
  }
  const isNew = harvestEvent.id < 0;
  const response = await fetch(isNew ? `/api/harvest_event` : `/api/harvest_event/${harvestEvent.id}`, {
    method: isNew ? "POST" : "PATCH",
    headers: authHeaders,
    body: JSON.stringify(harvestEvent),
  });
  if (response.status === 200) {
    if (isNew) {
      const id = await response.text();
      return { ...harvestEvent, id: parseInt(id) };
    }
    return response.json() as Promise<HarvestEvent>;
  } else {
    throw new Error("Something went wrong saving harvest");
  }
};

export type ValidHarvest = {
  group: FarmFieldGroupMeta;
  field: FarmFieldMeta;
  harvest: HarvestEvent;
};

export function HarvestForm(props: {
  isOpen: Accessor<boolean>;
  selectHarvest: (event: ValidHarvest) => void;
  onClose: () => void;
  group: Accessor<FarmFieldGroupMeta | undefined>;
  field: Accessor<FarmFieldMeta | undefined>;
  initialHarvest?: Accessor<ValidHarvest | undefined>;
  title?: string;
  submitLabel?: string;
}) {
  const [selectedGroup, setSelectedGroup] = createSignal<FarmFieldGroupMeta | undefined>(props.group())
  const [selectedField, setSelectedField] = createSignal<FarmFieldMeta | undefined>(props.field())
  const [harvestType, setHarvestType] = createSignal<HarvestType | undefined>();
  const [date, setDate] = createSignal<PickerValue>({
    value: {},
    label: "",
  });
  const [value, setValue] = createSignal(0);
  const [showInvalid, setshowInvalid] = createSignal(false);

  const harvestTypes = createQuery<HarvestType[]>(() => ({
    queryKey: ["harvest_types"],
    queryFn: () => fetch("/api/harvest_type").then((a) => a.json()),
  }));

  const groups = createQuery<FarmFieldGroupMeta[]>(() => ({
    queryKey: ["field_groups"],
    queryFn: () => fetch("/api/farm_field_groups/meta").then((a) => a.json()),
  }));

  const title = () => props.title ?? (props.initialHarvest?.() ? "Edit harvest" : "New harvest");
  const submitLabel = () => props.submitLabel ?? (props.initialHarvest?.() ? "Save" : "Add");

  createEffect(() => {
    const initial = props.initialHarvest?.();
    if (initial) {
      setSelectedGroup(initial.group);
      setSelectedField(initial.field);
      setValue(initial.harvest.value);
      setDate({
        value: { selected: initial.harvest.time },
        label: new Date(initial.harvest.time).toLocaleDateString("nb-NO"),
      });
      return;
    }

    setSelectedGroup(props.group());
    setSelectedField(props.field());
    setValue(0);
    setDate({
      value: {},
      label: "",
    });
  });

  createEffect(() => {
    const initialTypeId = props.initialHarvest?.()?.harvest.type_id;
    const types = harvestTypes.data;
    if (!types) {
      return;
    }
    if (initialTypeId) {
      setHarvestType(types.find((type) => type.id === initialTypeId));
      return;
    }
    if (!harvestType()) {
      setHarvestType(undefined);
    }
  });

  const canSave = createMemo(() => {
    const field = selectedField();
    const group = selectedGroup();
    const dateValue = date().value.selected;
    const type = harvestType();
    return !!field && !!group && !!dateValue && !!type && Number.isFinite(value());
  });

  const addNewHarvest = () => {
    setshowInvalid(true);
    const field = selectedField();
    const group = selectedGroup();
    const date_value = date().value.selected;
    const harvest_type = harvestType();
    if (!field || !group || !date_value || !harvest_type) {
      return;
    }
    const currentId = props.initialHarvest?.()?.harvest.id ?? -1;
    saveHarvestEvent({
      id: currentId,
      value: value(),
      time: new Date(date_value).toISOString(),
      field_id: field.id,
      type_id: harvest_type.id,
      type_name: harvest_type.name,
    })
      .then((harvest) => {
        if (!harvest) {
          return;
        }
        setshowInvalid(false);

        props.selectHarvest({
          group,
          field,
          harvest
        });
      });
  };

  function DatePickerComponent() {
    return (
      <div class={styles.datePickerContainer}>
        <DatePicker
          inputWrapperWidth={"100%"}
          placeholder="Select Date"
          zIndex={2000}
          value={date}
          setValue={setDate}
          inputWrapperClass={styles.datePickerInputWrapper}
          inputClass={`${styles.datePickerInput} ${showInvalid() && !date().value.selected ? styles.datePickerInputInvalid : ""}`}
          shouldCloseOnSelect
        />
        <Button
          variant="outlined"
          class={styles.dateShortcutButton}
          onClick={() => {
            const today = new Date();
            setDate({
              value: { selected: today.toISOString() },
              label: today.toLocaleDateString("nb-NO"),
            });
          }}
        >
          Today
        </Button>
      </div>
    );
  }

  return (
    <Dialog
      open={props.isOpen()}
      onClose={() => {
        setshowInvalid(false);
        props.onClose();
      }}
      PaperProps={{ class: styles.harvestDialog }}
    >
      <DialogTitle class={styles.harvestDialogTitle}>{title()}</DialogTitle>
      <DialogContent class={styles.harvestSelectBody}>
        <Switch>
          <Match when={groups.isLoading}>Loading</Match>
          <Match when={groups.data !== undefined}>
            <FormControl fullWidth class={styles.harvestField}>
              <InputLabel shrink id="groupSelect">
                Select Group
              </InputLabel>
              <Select
                labelId="groupSelect"
                color="primary"
                id="group-select"
                value={selectedGroup()?.name}
                label="Select Group"
                notched
                onChange={(value) => {
                  const group = groups.data?.find((g) => g.name === value.target.value);
                  setSelectedGroup(group);
                  // if a field is selected, we unselect the field if we switch groups
                  if (selectedField() && !group?.fields.find(y => y.id === selectedField()?.id)) {
                    setSelectedField(undefined);
                  }
                }}
              >
                {groups.data?.map((g) => (
                  <MenuItem value={g.name}>{g.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl disabled={!selectedGroup()} fullWidth class={styles.harvestField}>
              <InputLabel shrink id="fieldSelect">
                Select Field
              </InputLabel>
              <Select
                labelId="fieldSelect"
                color="primary"
                id="field-select"
                value={selectedField()?.name}
                label="Select Field"
                notched
                onChange={async (value) => {
                  const field = selectedGroup()?.fields.find((f) => f.name === value.target.value);
                  setSelectedField(field);
                }}
              >
                {selectedGroup()?.fields.map((f) => (
                  <MenuItem value={f.name}>{f.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth class={styles.harvestField}>
              <InputLabel shrink id="harvestTypeSelect">
                Select Type
              </InputLabel>
              <Select
                labelId="harvestTypeSelect"
                color="primary"
                id="harvest-type-select"
                value={harvestType()?.name ?? ""}
                error={showInvalid() && harvestType() == undefined}
                onChange={(value) => {
                  setHarvestType(
                    harvestTypes.data?.find((h) => h.name === value.target.value),
                  );
                }}
                label="Select Type"
                notched
              >
                {harvestTypes.data?.map((h) => (
                  <MenuItem value={h.name}>{h.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <DatePickerComponent />

            <TextField
              class={styles.harvestField}
              label="Value"
              type="number"
              size="small"
              value={value()}
              onChange={(event) => setValue(Number(event.currentTarget.value))}
            />

          </Match>
        </Switch>
      </DialogContent>
      <DialogActions class={styles.harvestDialogActions}>

        <Button
          onClick={() => {
            setshowInvalid(false);
            props.onClose();
          }}
        >
          Cancel
        </Button>

        <Button
          variant="contained"
          class={styles.addHarvestButton}
          disabled={!canSave()}
          onClick={addNewHarvest}
        >
          {submitLabel()}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
