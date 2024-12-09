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
import { createSignal, createResource, Show, createEffect } from "solid-js";

import GeoJSON from "ol/format/GeoJSON";

import "ol/ol.css";
import "../../maps/Map.css";

import { FarmField } from "../../../bindings/FarmField";
import { Feature } from "ol";

import { getFarmFieldGroups, prepareAuth } from "../../requests";
import { DrawableMap } from "../../maps/DrawableMap";
import { parseJsonIntoFeature } from "../../maps/Map";

const patchField = async (field: FarmField) => {
  const authHeaders = prepareAuth(true);
  if (!authHeaders) {
    console.log("Not allowed to update without token");
    return null;
  }

  const url = "/api/farm_fields/" + field.id;
  const res = await fetch(url, {
    headers: authHeaders,
    method: "PATCH",
    body: JSON.stringify(field),
  });
  if (res.ok) {
    return field;
  } else {
    return null;
  }
};

function validateFarmInput(field: FarmField, feature: Feature | undefined) {
  return (
    field.farm_id >= 1 &&
    field.farm_field_group_id &&
    field.farm_field_group_id >= 1 &&
    field.name.length > 1 &&
    feature
  );
}

export function FieldUpdateForm(props: {
  initial: FarmField;
  onSave: (x: FarmField) => void;
}) {
  const [farmFieldGroups] = createResource(getFarmFieldGroups);
  const [form, setForm] = createStore<FarmField>(props.initial);

  const feature = createSignal<Feature | undefined>(
    parseJsonIntoFeature(props.initial, "placeholder") ?? undefined,
  );

  createEffect(() => {
    console.log("Feature: ", form, feature[0]());
  }, [form, feature[0]()]);

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
            value={form.farm_field_group_id}
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
        <Typography variant="h6">Update field</Typography>

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
          disabled={!validateFarmInput(form, feature[0]())}
          size="small"
          variant="contained"
          onClick={async () => {
            console.log("click of button");
            const f = feature[0]();
            if (f) {
              const json = new GeoJSON().writeFeature(f);
              setForm({ ["map_polygon_string"]: json });
              const result = await patchField(form);
              if (result) {
                console.log("created field");
                props.onSave(form);
              }
            }
          }}
        >
          Save field
        </Button>
      </div>

      <Show when={farmFieldGroups()}>
        {(groups) => (
          <DrawableMap
            feature={feature}
            initialFeature={
              parseJsonIntoFeature(
                props.initial,
                groups().find((x) => x.id === props.initial.farm_field_group_id)
                  ?.name ?? "placeholder",
              ) ?? undefined
            }
          />
        )}
      </Show>
    </div>
  );
}
