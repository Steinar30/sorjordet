import { Button, rgbToHex, TextField, Typography } from "@suid/material";
import { createStore } from "solid-js/store";
import { tryPatchNewFieldGroup, tryPostNewFieldGroup } from "../../requests";
import { FarmFieldGroupMeta } from "../../../bindings/FarmFieldGroupMeta";
import { Show } from "solid-js";
import { hexToRgbWithOpacity } from "../../Utils";

function validateInput(group: FarmFieldGroupMeta): boolean {
  return group.name.length > 0 && group.draw_color.length > 0;
}

function colorPicker(val: string, callback: (x: string) => void) {
  return (
    <div>
      <label for="draw_color" style={{ "margin-right": "10px" }}>
        Groupcolor
      </label>
      <input
        style={{ opacity: "0.4" }}
        onchange={(ev) => {
          callback(hexToRgbWithOpacity(ev.currentTarget.value, 0.2));
        }}
        type="color"
        id="draw_color"
        name="draw_color"
        value={rgbToHex(val)}
      />
    </div>
  );
}

export function FieldGroupForm(props: {
  onSave: () => void;
  toEdit?: FarmFieldGroupMeta;
}) {
  const [form, setForm] = createStore<FarmFieldGroupMeta>(
    props.toEdit || {
      id: -1,
      name: "",
      farm_id: 1,
      fields: [],
      draw_color: "",
    },
  );

  const updateField = (fieldName: string) => (event: Event) => {
    const inputElement = event.currentTarget as HTMLInputElement;
    setForm({
      [fieldName]: inputElement.value,
    });
  };

  return (
    <div id="map_form_container">
      <div id="field_form">
        <Show
          when={props.toEdit}
          fallback={<Typography variant="h6">Add new field group</Typography>}
        >
          <Typography variant="h6">Edit field group</Typography>
        </Show>

        <TextField
          id="field-group-name"
          label="Group name"
          variant="outlined"
          size="small"
          value={form.name}
          onChange={updateField("name")}
        ></TextField>

        {colorPicker(form.draw_color, (z) => setForm({ ["draw_color"]: z }))}

        <Button
          disabled={!validateInput(form)}
          size="small"
          variant="contained"
          onClick={async () => {
            const groupForm = { ...form, fields: [] };
            let result;
            if (props.toEdit) {
              result = await tryPatchNewFieldGroup(groupForm);
            } else {
              result = await tryPostNewFieldGroup(groupForm);
            }
            if (result) {
              props.onSave();
            }
          }}
        >
          Save Group
        </Button>
      </div>
    </div>
  );
}
