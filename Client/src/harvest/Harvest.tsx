import { createQuery } from "@tanstack/solid-query";
import { Match, Switch, createSignal, Show, Accessor } from "solid-js";
import { HarvestEvent } from "../../bindings/HarvestEvent";
import { FarmFieldMeta } from "../../bindings/FarmFieldMeta";
import {
  Button, Card, CardContent, Checkbox, Dialog, DialogContent, DialogTitle,
  Divider, FormControl, InputLabel, MenuItem, Select, TextField, Typography
} from "@suid/material";
import { FarmFieldGroupMeta } from "../../bindings/FarmFieldGroupMeta";
import { prepareAuth } from "../requests";
import '@rnwonder/solid-date-picker/dist/style.css'
import DatePicker, {
  PickerValue,
} from "@rnwonder/solid-date-picker";
import '@rnwonder/solid-date-picker/dist/style.css'
import { HarvestType } from "../../bindings/HarvestType";

import TractorIcon from "@suid/icons-material/Agriculture";
import TractorIconOutlined from "@suid/icons-material/AgricultureOutlined";


import styles from './Harvest.module.css';
import { jwt_token } from "../App";

/// TODO: this got very messy, should be refactored


const postNewHarvestEvent = async (fieldId: number): Promise<HarvestEvent | undefined> => {
  const authHeaders = prepareAuth(true);
  if (authHeaders === null) {
    console.log('not allowed to post without bearer token');
    return;
  }
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
    headers: authHeaders,
    body: JSON.stringify(body),
  });
  if (response.status === 200) {
    const id = await response.text();
    const newItem = { ...body, id: parseInt(id) };
    return newItem as HarvestEvent;
  }
};

const updateHarvestEvent = async (harvest: HarvestEvent): Promise<HarvestEvent | undefined> => {
  const authHeaders = prepareAuth(true);
  if (authHeaders === null) {
    console.log('not allowed to post without bearer token');
    return;
  }
  const response = await fetch(`/api/harvest_event/${harvest.id}`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify(harvest),
  });
  if (response.status === 200) {
    return harvest;
  }
};

const tractorModeAdd = async (harvest: HarvestEvent): Promise<HarvestEvent | undefined> => {
  const copy = { ...harvest, value: harvest.value + 1 };
  return updateHarvestEvent(copy);
}

const tractorModeSub = async (harvest: HarvestEvent): Promise<HarvestEvent | undefined> => {
  if (harvest.value <= 0) {
    return;
  }
  const copy = { ...harvest, value: harvest.value - 1 };
  return updateHarvestEvent(copy);
}

const renderHarvest = (h: HarvestEvent | undefined) => {
  if (!h) {
    return undefined;
  }
  const time = new Date(h.time);
  return (
    h.type_name + " " + time.toLocaleDateString("nb-NO")
  )
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const renderDateTime = (t: string) => {
  const time = new Date(t);
  return (
    time.toLocaleDateString("nb-NO")
  )
}

const trygetHarvest = async (fieldId: number) => {
  return fetch(`/api/harvest_event/${fieldId}`).then(a => a.json() as Promise<HarvestEvent[]>);
}

type HarvestSelector = {
  selectedGroup: FarmFieldGroupMeta | undefined;
  selectedField: FarmFieldMeta | undefined;
  selectedHarvestEvent: HarvestEvent | undefined;
  harvests: HarvestEvent[] | undefined;
}

type ValidHarvest = {
  group: FarmFieldGroupMeta;
  field: FarmFieldMeta;
  harvest: HarvestEvent;
}

const getValidHarvestSelection = (h: HarvestSelector): ValidHarvest | undefined => {
  if (!h.selectedGroup || !h.selectedField || !h.selectedHarvestEvent) {
    return undefined;
  }
  return {
    group: h.selectedGroup,
    field: h.selectedField,
    harvest: h.selectedHarvestEvent
  }
}

export default function Harvest() {
  const [isOpen, setIsOpen] = createSignal(false);
  const [tractorMode, setTractorMode] = createSignal(localStorage.getItem('tractor_mode') === 'true');
  const [harvestSelector, setHarvestSelector] = createSignal<HarvestSelector>({
    selectedGroup: undefined,
    selectedField: undefined,
    selectedHarvestEvent: undefined,
    harvests: undefined
  });
  const [harvestType, setHarvestType] = createSignal<HarvestType | undefined>(undefined);
  const [date, setDate] = createSignal<PickerValue>({
    value: {},
    label: "",
  });
  const [showInvalid, setshowInvalid] = createSignal(false);

  const groups = createQuery<FarmFieldGroupMeta[]>(() => ({
    queryKey: ['field_groups'],
    queryFn: () => fetch('/api/farm_field_groups/meta').then(a => a.json())
  }));

  const harvestTypes = createQuery<HarvestType[]>(() => ({
    queryKey: ['harvest_types'],
    queryFn: () => fetch('/api/harvest_type').then(a => a.json())
  }));

  const datePicker = () => {
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
          sx={{ minWidth: "56px", width: "56px", height: "56px", fontSize: "14px", textTransform: "none", borderColor: "#c4c4c4" }}
          onClick={() => {
            const today = new Date();
            setDate({ value: { selected: today.toISOString() }, label: today.toLocaleDateString("nb-NO") });
          }}
        >
          Today
        </Button>
      </div>
    )
  }

  const tractorModeButton = () => {
    return (
      <Checkbox
        checked={tractorMode()}
        onChange={() => {
          const newValue = !tractorMode();
          localStorage.setItem('tractor_mode', String(newValue));
          setTractorMode(newValue);
        }}
        icon={<TractorIconOutlined />}
        checkedIcon={<TractorIcon />}
      />
    )
  }

  const harvestTypeSelect = () => {
    return (
      <FormControl fullWidth>
        <InputLabel shrink id="harvestTypeSelect">Select Type</InputLabel>
        <Select
          labelId="harvestTypeSelect"
          color="primary"
          id="harvest-type-select"
          value={harvestType()?.name ?? ''}
          error={showInvalid() && harvestType() == undefined}
          onChange={value => {
            setHarvestType(harvestTypes.data?.find(h => h.name === value.target.value));
          }}
          label="Select Type"
          notched
        >
          {harvestTypes.data?.map(h => <MenuItem value={h.name}>{h.name}</MenuItem>)}
        </Select>
      </FormControl>
    )
  };

  const groupSelect = () => {
    return (
      <FormControl fullWidth>
        <InputLabel shrink id="groupSelect">Select Group</InputLabel>
        <Select
          labelId="groupSelect"
          color="primary"
          id="group-select"
          value={harvestSelector().selectedGroup?.name ?? ''}
          label="Select Group"
          notched
          onChange={value => {
            const group = groups.data?.find(g => g.name === value.target.value);
            setHarvestSelector({
              selectedGroup: group,
              selectedField: undefined,
              selectedHarvestEvent: undefined,
              harvests: undefined
            });
          }}
        >
          {groups.data?.map(g => <MenuItem value={g.name}>{g.name}</MenuItem>)}
        </Select>
      </FormControl>
    )
  }

  const fieldSelect = (group: () => FarmFieldGroupMeta) => {
    return (
      <FormControl fullWidth>
        <InputLabel shrink id="fieldSelect">Select Field</InputLabel>
        <Select
          labelId="fieldSelect"
          color="primary"
          id="field-select"
          value={harvestSelector().selectedField?.name ?? ''}
          label="Select Field"
          notched
          onChange={async value => {
            const field = group()?.fields.find(f => f.name === value.target.value);
            if (field != undefined) {
              const harvests = await trygetHarvest(field.id);
              setHarvestSelector({
                selectedGroup: group(),
                selectedField: field,
                selectedHarvestEvent: undefined,
                harvests
              });
            }
          }}
        >
          {group()?.fields.map(f => <MenuItem value={f.name}>{f.name}</MenuItem>)}
        </Select>
      </FormControl>
    )
  }

  const addHarvestButton = () => {
    return (
      <Button
        variant="contained"
        size="large"
        sx={{ minWidth: "56px", width: "56px", height: "56px", borderColor: "#c4c4c4", textTransform: "none", fontSize: "14px" }}
        onClick={() => {
          setshowInvalid(true);
          if (harvestSelector().selectedField == undefined || date().value.selected == undefined || harvestType() == undefined) {
            return;
          }
          postNewHarvestEvent(harvestSelector().selectedField?.id ?? -1).then(() => {
            setshowInvalid(false);
            setHarvestSelector({
              ...harvestSelector(),
              selectedHarvestEvent: undefined
            });
          });
        }}
      >
        Add
      </Button>)
  }


  const harvestSelect = (harvests: () => HarvestEvent[]) => {
    return (
      <FormControl fullWidth>
        <InputLabel shrink id="fieldSelect">Select harvest</InputLabel>
        <Select
          labelId="fieldSelect"
          id="field-select"
          renderValue={() => renderHarvest(harvestSelector().selectedHarvestEvent) ?? ''}
          value={harvestSelector().selectedHarvestEvent?.id ?? -1}
          label="Select harvest"
          color="primary"
          notched
          onChange={value => {
            const harvest = harvests().find(f => f.id === value.target.value);

            setHarvestSelector({
              ...harvestSelector(),
              selectedHarvestEvent: harvest,
            });
            setIsOpen(false);
          }}
        >
          {harvests().map(f =>
            <MenuItem value={f.id}>{renderHarvest(f)}</MenuItem>
          )}
        </Select>
      </FormControl>
    )
  }

  const renderSelectOrAddHarvest = (harvests: () => HarvestEvent[]) => {
    return (
      <div style={{ display: "flex", "flex-direction": "column", gap: "16px", width: "100%" }}>
        <Show when={harvests().length > 0}>
          {harvestSelect(harvests)}
        </Show>

        <Divider sx={{ "&:before, &:after": { top: 0 }, marginTop: "16px", marginBottom: "16px" }}>Add new</Divider>

        {datePicker()}

        <div style={{ display: "flex", gap: "16px", width: "100%" }}>
          {harvestTypeSelect()}
          {addHarvestButton()}
        </div>
      </div>
    )
  }

  const selectFieldModal = () => {
    return (
      <Dialog open={isOpen()} onClose={() => { setshowInvalid(false); setIsOpen(false); }}>
        <DialogTitle>Choose or create harvest</DialogTitle>
        <DialogContent class={styles.harvestSelectBody} style={{ padding: "20px" }}>
          <Switch>
            <Match when={groups.isLoading}>Laster</Match>
            <Match when={groups.data !== undefined}>
              {groupSelect()}

              <Show when={harvestSelector()?.selectedGroup} keyed>
                {(group) => fieldSelect(() => group)}
              </Show>
              <Show when={harvestSelector()?.harvests} keyed>
                {(harvest) => renderSelectOrAddHarvest(() => harvest)}
              </Show>
            </Match>
          </Switch>
        </DialogContent>
      </Dialog>
    );
  }

  const renderEditHarvest = (initialHarvest: ValidHarvest, commit: (harvest: HarvestEvent) => void) => {
    const [editHarvest, setEditHarvest] = createSignal<HarvestEvent>(initialHarvest.harvest);
    return (
      <div style={{ display: 'flex', "flex-direction": 'column', gap: '16px', "margin-top": '16px' }}>
        <FormControl fullWidth>
          <InputLabel shrink id="harvestTypeSelect">Type</InputLabel>
          <Select
            labelId="harvestTypeSelect"
            color="primary"
            id="harvest-type-select"
            value={editHarvest().type_name}
            error={showInvalid() && harvestType() == undefined}
            onChange={value => {
              const type = harvestTypes.data?.find(h => h.name === value.target.value);
              if (type) {
                setEditHarvest({ ...editHarvest(), type_name: type.name, type_id: type.id });
              }
            }}
            label="Select Type"
            notched
          >
            {harvestTypes.data?.map(h => <MenuItem value={h.name}>{h.name}</MenuItem>)}
          </Select>
        </FormControl>

        <TextField
          fullWidth
          id="outlined-basic"
          label="Value"
          variant="outlined"
          type="number"
          sx={{ marginTop: '20px' }}
          value={editHarvest().value}
          onChange={(x) => {
            const parsed = parseInt(x.currentTarget.value);
            if (!isNaN(parsed)) {
              setEditHarvest({ ...editHarvest(), value: parsed });
            } else {
              setEditHarvest({ ...editHarvest(), value: 0 });
            }
          }}
        />
        <div style={{ display: 'flex', "justify-content": 'space-evenly' }}>
          <Button
            disabled={editHarvest().value === initialHarvest.harvest.value && editHarvest().type_name === initialHarvest.harvest.type_name}
            variant="contained"
            color="primary"
            onClick={async () => {
              const res = await updateHarvestEvent(editHarvest());
              if (res) {
                commit(res);
              }
            }}
          >
            Save
          </Button>
          <Button variant="contained" color="secondary" onClick={() => setEditHarvest(initialHarvest.harvest)}>Reset</Button>
        </div>
      </div>
    )
  }

  const updateHarvestInOuterState = (harvest: HarvestEvent) => {
    setHarvestSelector({
      ...harvestSelector(),
      harvests: harvestSelector().harvests?.map(h => h.id === harvest.id ? harvest : h),
      selectedHarvestEvent: harvest
    });
  }

  const renderSelectedHarvest = (harvest: Accessor<ValidHarvest>) => {
    const commitHarvest = (toCommit: HarvestEvent) => {
      harvest().harvest = toCommit;
      updateHarvestInOuterState(toCommit);
    }
    return (
      <Card
        variant="outlined"
        sx={{
          padding: '20px',
          marginTop: '40px',
          width: '300px',
        }}
      >
        <CardContent>
          <div style={{ display: 'flex', "justify-content": 'space-between' }}>
            <Typography variant="h4">
              {harvest().field.name}
            </Typography>

            {tractorModeButton()}
          </div>
          <Typography variant="subtitle1" color="text.secondary">{harvest().group.name}</Typography>
          <Typography sx={{ marginTop: '10px' }} variant="h6" color="text.primary">{renderHarvest(harvest().harvest)}</Typography>

          <Show when={tractorMode()} fallback={renderEditHarvest(harvest(), commitHarvest)} >
            <Typography sx={{ marginTop: '20px', textAlign: 'center' }} variant="h1" color="text.primary">{harvest().harvest.value}</Typography>
            <div style={{ display: 'flex', "justify-content": 'space-evenly', "margin-top": '20px' }}>
              <Button
                variant="contained"
                size="large"
                onClick={async () => {
                  const res = await tractorModeAdd(harvest().harvest);
                  if (res !== undefined) {
                    commitHarvest(res);
                  }
                }}
              >
                +
              </Button>
              <Button
                variant="contained"
                size="large"
                onClick={async () => {
                  const res = await tractorModeSub(harvest().harvest);
                  if (res !== undefined) {
                    harvest().harvest = res;
                    updateHarvestInOuterState(res);
                  }
                }}
              >
                -
              </Button>
            </div>
          </Show>
        </CardContent>
      </Card>
    )
  }

  return (
    <div style={{ display: 'flex', "flex-direction": 'column', "align-items": 'center', padding: '20px' }}>

      <Show when={jwt_token()}
        fallback={<p>You don't have access to this page</p>}
      >
        {selectFieldModal()}

        <Button
          variant="outlined"
          color="primary"
          onClick={() => setIsOpen(true)}>
          Choose or create harvest
        </Button>

        <Show when={getValidHarvestSelection(harvestSelector())}>
          {(harvest) => renderSelectedHarvest(harvest)}
        </Show>
      </Show>
    </div>
  );
}
