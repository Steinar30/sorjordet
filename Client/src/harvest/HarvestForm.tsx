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
} from "@suid/material";
import { Switch, Match, Accessor, createSignal } from "solid-js";
import { FarmFieldGroupMeta } from "../../bindings/FarmFieldGroupMeta";
import { HarvestEvent } from "../../bindings/HarvestEvent";

import styles from "./Harvest.module.css";
import DatePicker, { PickerValue } from "@rnwonder/solid-date-picker";
import "@rnwonder/solid-date-picker/dist/style.css";
import "@rnwonder/solid-date-picker/dist/style.css";

import { FarmFieldMeta } from "../../bindings/FarmFieldMeta";
import { createQuery } from "@tanstack/solid-query";
import { HarvestType } from "../../bindings/HarvestType";
import { prepareAuth } from "../requests";

const postNewHarvestEvent = async (
  fieldId: number,
  time: string,
  type: HarvestType,
): Promise<HarvestEvent> => {
  const authHeaders = prepareAuth(true);
  if (authHeaders === null) {
    console.log("not allowed to post without bearer token");
    throw new Error("not allowed to post without bearer token");
  }
  const body: HarvestEvent = {
    id: -1,
    value: 0,
    time,
    field_id: fieldId,
    type_id: type.id,
    type_name: type.name,
  };
  const response = await fetch(`/api/harvest_event`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(body),
  });
  if (response.status === 200) {
    const id = await response.text();
    const newItem = { ...body, id: parseInt(id) };
    return newItem as HarvestEvent;
  } else {
    throw new Error("Something went wrong creating harvest");
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
}) {

  const [selectedGroup, setSelectedGroup] = createSignal<FarmFieldGroupMeta | undefined>(props.group())
  const [selectedField, setSelectedField] = createSignal<FarmFieldMeta | undefined>(props.field())
  const [harvestType, setHarvestType] = createSignal<HarvestType | undefined>();
  const [date, setDate] = createSignal<PickerValue>({
    value: {},
    label: "",
  });
  const [showInvalid, setshowInvalid] = createSignal(false);

  const harvestTypes = createQuery<HarvestType[]>(() => ({
    queryKey: ["harvest_types"],
    queryFn: () => fetch("/api/harvest_type").then((a) => a.json()),
  }));

  const groups = createQuery<FarmFieldGroupMeta[]>(() => ({
    queryKey: ["field_groups"],
    queryFn: () => fetch("/api/farm_field_groups/meta").then((a) => a.json()),
  }));

  const addNewHarvest = () => {
    setshowInvalid(true);
    const field = selectedField();
    const group = selectedGroup();
    const date_value = date().value.selected;
    const harvest_type = harvestType();
    if (!field || !group || !date_value || !harvest_type) {
      return;
    }
    postNewHarvestEvent(field.id, date_value, harvest_type)
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
          inputClass={showInvalid() && !date().value.selected ? "invalid" : ""}
          shouldCloseOnSelect
        />
        <Button
          variant="outlined"
          size="small"
          sx={{
            minWidth: "56px",
            width: "56px",
            height: "56px",
            fontSize: "14px",
            textTransform: "none",
            borderColor: "#c4c4c4",
          }}
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
    >
      <DialogTitle>New harvest</DialogTitle>
      <DialogContent class={styles.harvestSelectBody}>
        <Switch>
          <Match when={groups.isLoading}>Loading</Match>
          <Match when={groups.data !== undefined}>
            <FormControl fullWidth>
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
                  console.log(group);
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

            <FormControl disabled={!selectedGroup()} fullWidth>
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

            <FormControl fullWidth>
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

          </Match>
        </Switch>
      </DialogContent>
      <DialogActions>

        <Button
          variant="contained"
          class={styles.addHarvestButton}
          onClick={addNewHarvest}
        >
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
}
