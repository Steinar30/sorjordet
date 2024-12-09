import {
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@suid/material";
import { createStore } from "solid-js/store";
import { createSignal, createResource, Show } from "solid-js";

import GeoJSON from "ol/format/GeoJSON";

import "ol/ol.css";
import "../../maps/Map.css";

import { FarmField } from "../../../bindings/FarmField";
import { Feature } from "ol";

import { getFarmFieldGroups, tryPostNewField } from "../../requests";
import { DrawableMap } from "../../maps/DrawableMap";

function validateFarmInput(
  field: FarmField,
  feature: Feature | undefined,
  validFeature: boolean,
) {
  return (
    field.farm_id >= 1 &&
    field.farm_field_group_id &&
    field.farm_field_group_id >= 1 &&
    field.name.length > 1 &&
    feature &&
    validFeature
  );
}

export function FieldForm(props: { onCreate: () => void }) {
  const [farmFieldGroups] = createResource(getFarmFieldGroups);
  const [form, setForm] = createStore<FarmField>({
    id: -1,
    name: "",
    map_polygon_string: "",
    farm_id: 1,
    farm_field_group_id: -1,
  });

  const feature = createSignal<Feature | undefined>(undefined);
  const validFeature = createSignal(false);

  const updateField = (fieldName: string) => (event: Event) => {
    const inputElement = event.currentTarget as HTMLInputElement;
    setForm({
      [fieldName]: inputElement.value,
    });
  };

  const selectComponent = () => {
    return (
      <Show when={farmFieldGroups()}>
        <FormControl fullWidth>
          <InputLabel shrink id="groupSelect">
            Select Group
          </InputLabel>
          <Select
            label="Select Group"
            labelId="groupSelect"
            notched
            id="group-select"
            color="primary"
            onChange={(x) => {
              const group = farmFieldGroups()?.find(
                (y) => y.id === x.target.value,
              );
              if (group) {
                setForm({
                  ["farm_field_group_id"]: group.id,
                });
              }
            }}
          >
            {farmFieldGroups()?.map((x) => (
              <MenuItem value={x.id}>{x.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Show>
    );
  };

  return (
    <div id="map_form_container">
      <div id="field_form">
        <Typography variant="h6">Add new field</Typography>

        <TextField
          id="field-name"
          label="Name"
          variant="outlined"
          size="small"
          value={form.name}
          onChange={updateField("name")}
        ></TextField>

        {selectComponent()}

        <Typography variant="body2">
          Draw an outline of the field in the map below to show it in maps.
        </Typography>

        <Button
          disabled={!validateFarmInput(form, feature[0](), validFeature[0]())}
          size="small"
          variant="contained"
          onClick={async () => {
            console.log("click of button");
            const f = feature[0]();
            if (f) {
              const json = new GeoJSON().writeFeature(f);
              setForm({ ["map_polygon_string"]: json });
              const result = await tryPostNewField(form);
              if (result) {
                console.log("created field");
                const res = form;
                res.id = result;
                props.onCreate();
              }
            }
          }}
        >
          Save field
        </Button>
      </div>
      <DrawableMap feature={feature} closed={validFeature} />
    </div>
  );
}
