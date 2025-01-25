import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
} from "@suid/material";
import { Show, Switch, Match, Accessor, Signal, createSignal } from "solid-js";
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
import { renderHarvest } from "./Harvest";

const trygetHarvest = async (fieldId: number) => {
  return fetch(`/api/harvest_event/${fieldId}`).then(
    (a) => a.json() as Promise<HarvestEvent[]>,
  );
};

const postNewHarvestEvent = async (
  fieldId: number,
  time: string,
  type: HarvestType,
): Promise<HarvestEvent | undefined> => {
  const authHeaders = prepareAuth(true);
  if (authHeaders === null) {
    console.log("not allowed to post without bearer token");
    return;
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
  }
};

export type HarvestSelector = {
  selectedGroup: FarmFieldGroupMeta | undefined;
  selectedField: FarmFieldMeta | undefined;
  selectedHarvestEvent: HarvestEvent | undefined;
  harvests: HarvestEvent[] | undefined;
};

export type ValidHarvest = {
  group: FarmFieldGroupMeta;
  field: FarmFieldMeta;
  harvest: HarvestEvent;
};

function datePicker(
  [date, setDate]: Signal<PickerValue>,
  showInvalid: Accessor<boolean>,
) {
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

function harvestTypeSelect(
  [harvestType, setHarvestType]: Signal<HarvestType | undefined>,
  harvestTypes: HarvestType[],
  showInvalid: Accessor<boolean>,
) {
  return (
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
            harvestTypes.find((h) => h.name === value.target.value),
          );
        }}
        label="Select Type"
        notched
      >
        {harvestTypes.map((h) => (
          <MenuItem value={h.name}>{h.name}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

const groupSelect = (
  groups: FarmFieldGroupMeta[],
  [harvestSelector, setHarvestSelector]: Signal<HarvestSelector>,
) => {
  return (
    <FormControl fullWidth>
      <InputLabel shrink id="groupSelect">
        Select Group
      </InputLabel>
      <Select
        labelId="groupSelect"
        color="primary"
        id="group-select"
        value={harvestSelector().selectedGroup?.name ?? ""}
        label="Select Group"
        notched
        onChange={(value) => {
          const group = groups.find((g) => g.name === value.target.value);
          setHarvestSelector({
            selectedGroup: group,
            selectedField: undefined,
            selectedHarvestEvent: undefined,
            harvests: undefined,
          });
        }}
      >
        {groups.map((g) => (
          <MenuItem value={g.name}>{g.name}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

function fieldSelect(
  group: FarmFieldGroupMeta,
  [harvestSelector, setHarvestSelector]: Signal<HarvestSelector>,
) {
  return (
    <FormControl fullWidth>
      <InputLabel shrink id="fieldSelect">
        Select Field
      </InputLabel>
      <Select
        labelId="fieldSelect"
        color="primary"
        id="field-select"
        value={harvestSelector().selectedField?.name ?? ""}
        label="Select Field"
        notched
        onChange={async (value) => {
          const field = group.fields.find((f) => f.name === value.target.value);
          if (field != undefined) {
            const harvests = await trygetHarvest(field.id);
            setHarvestSelector({
              selectedGroup: group,
              selectedField: field,
              selectedHarvestEvent: undefined,
              harvests,
            });
          }
        }}
      >
        {group.fields.map((f) => (
          <MenuItem value={f.name}>{f.name}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

function addHarvestButton(addHarvest: () => void) {
  return (
    <Button
      variant="contained"
      size="large"
      class={styles.addHarvestButton}
      onClick={addHarvest}
    >
      Add
    </Button>
  );
}

const harvestSelect = (
  selectedHarvest: HarvestEvent | undefined,
  harvests: () => HarvestEvent[],
  onSelect: (harvest: HarvestEvent) => void,
) => {
  return (
    <FormControl fullWidth>
      <InputLabel shrink id="fieldSelect">
        Select harvest
      </InputLabel>
      <Select
        labelId="fieldSelect"
        id="field-select"
        renderValue={() => renderHarvest(selectedHarvest) ?? ""}
        value={selectedHarvest?.id ?? -1}
        label="Select harvest"
        color="primary"
        notched
        onChange={(value) => {
          const harvest = harvests().find((f) => f.id === value.target.value);

          if (harvest) {
            onSelect(harvest);
          }
        }}
      >
        {harvests().map((f) => (
          <MenuItem value={f.id}>{renderHarvest(f)}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export function HarvestSelector(props: {
  isOpen: Accessor<boolean>;
  selectHarvest: (event: ValidHarvest) => void;
  onClose: () => void;
}) {
  const [harvestSelector, setHarvestSelector] = createSignal<HarvestSelector>({
    selectedGroup: undefined,
    selectedField: undefined,
    selectedHarvestEvent: undefined,
    harvests: undefined,
  });
  const [harvestType, setHarvestType] = createSignal<HarvestType | undefined>(
    undefined,
  );
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
    const field = harvestSelector().selectedField;
    const date_value = date().value.selected;
    const harvest_type = harvestType();
    if (!field || !date_value || !harvest_type) {
      return;
    }
    postNewHarvestEvent(field.id, date_value, harvest_type).then((harvest) => {
      const s = harvestSelector();
      if (
        harvest == undefined ||
        s.selectedGroup == undefined ||
        s.selectedField == undefined
      ) {
        return;
      }
      setshowInvalid(false);
      setHarvestSelector({
        ...s,
        selectedHarvestEvent: harvest,
      });
      s.harvests?.push(harvest);

      props.selectHarvest({
        group: s.selectedGroup,
        field: s.selectedField,
        harvest: harvest,
      });
    });
  };

  return (
    <Dialog
      open={props.isOpen()}
      onClose={() => {
        setshowInvalid(false);
        props.onClose();
      }}
    >
      <DialogTitle>Choose or create harvest</DialogTitle>
      <DialogContent
        class={styles.harvestSelectBody}
        style={{ padding: "20px" }}
      >
        <Switch>
          <Match when={groups.isLoading}>Laster</Match>
          <Match when={groups.data !== undefined}>
            {groupSelect(groups.data ?? [], [
              harvestSelector,
              setHarvestSelector,
            ])}

            <Show when={harvestSelector()?.selectedGroup} keyed>
              {(group) =>
                fieldSelect(group, [harvestSelector, setHarvestSelector])
              }
            </Show>
            <Show when={harvestSelector()?.harvests} keyed>
              {(harvests) => (
                <div
                  style={{
                    display: "flex",
                    "flex-direction": "column",
                    gap: "16px",
                    width: "100%",
                  }}
                >
                  <Show when={harvests.length > 0}>
                    {harvestSelect(
                      harvestSelector().selectedHarvestEvent,
                      () => harvests,
                      (harvest) => {
                        const s = harvestSelector();
                        setHarvestSelector({
                          ...s,
                          selectedHarvestEvent: harvest,
                        });

                        if (s.selectedGroup && s.selectedField) {
                          props.selectHarvest({
                            group: s.selectedGroup,
                            field: s.selectedField,
                            harvest: harvest,
                          });
                        }
                      },
                    )}
                  </Show>

                  <Divider
                    sx={{
                      "&:before, &:after": { top: 0 },
                      marginTop: "16px",
                      marginBottom: "16px",
                    }}
                  >
                    Add new
                  </Divider>

                  {datePicker([date, setDate], showInvalid)}

                  <div style={{ display: "flex", gap: "16px", width: "100%" }}>
                    {harvestTypeSelect(
                      [harvestType, setHarvestType],
                      harvestTypes.data ?? [],
                      showInvalid,
                    )}
                    {addHarvestButton(addNewHarvest)}
                  </div>
                </div>
              )}
            </Show>
          </Match>
        </Switch>
      </DialogContent>
    </Dialog>
  );
}
