import { Button, IconButton, TextField } from "@suid/material";
import { Autorenew } from "@suid/icons-material";
import { createStore } from "solid-js/store";
import { tryPatchNewFieldGroup, tryPostNewFieldGroup } from "../../requests";
import { FarmFieldGroupMeta } from "../../../bindings/FarmFieldGroupMeta";
import { createSignal, Show } from "solid-js";
import { hexToRgbWithOpacity, rgbToHex } from "../../Utils";
import formStyles from "../AdminForm.module.css";

function hslToHex(hue: number, saturation: number, lightness: number) {
  const s = saturation / 100;
  const l = lightness / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (hue < 60) {
    r = c;
    g = x;
  } else if (hue < 120) {
    r = x;
    g = c;
  } else if (hue < 180) {
    g = c;
    b = x;
  } else if (hue < 240) {
    g = x;
    b = c;
  } else if (hue < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  const toHex = (value: number) =>
    Math.round((value + m) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function getRandomGroupColorHex() {
  const hue = Math.floor(Math.random() * 360);
  const saturation = 38 + Math.floor(Math.random() * 26);
  const lightness = 50 + Math.floor(Math.random() * 12);
  return hslToHex(hue, saturation, lightness);
}

function validateInput(group: FarmFieldGroupMeta): boolean {
  return group.name.length > 0 && group.draw_color.length > 0;
}

function colorPicker(
  swatchColor: string,
  callback: (hex: string) => void,
) {
  return (
    <div class={formStyles.colorRow}>
      <label for="draw_color">Group color</label>
      <div class={formStyles.colorPickerControls}>
        <input
          class={formStyles.colorSwatch}
          onchange={(ev) => {
            callback(ev.currentTarget.value);
          }}
          type="color"
          id="draw_color"
          name="draw_color"
          value={swatchColor}
        />
        <IconButton
          aria-label="Randomize group color"
          title="Randomize group color"
          class={formStyles.colorRandomButton}
          onClick={() => callback(getRandomGroupColorHex())}
        >
          <Autorenew />
        </IconButton>
      </div>
    </div>
  );
}

export function FieldGroupForm(props: {
  onSave: () => void;
  toEdit?: FarmFieldGroupMeta;
}) {
  const initialHex = props.toEdit
    ? rgbToHex(props.toEdit.draw_color)
    : getRandomGroupColorHex();
  const [form, setForm] = createStore<FarmFieldGroupMeta>(
    props.toEdit || {
      id: -1,
      name: "",
      farm_id: 1,
      fields: [],
      draw_color: hexToRgbWithOpacity(initialHex, 0.2),
    },
  );
  const [colorHex, setColorHex] = createSignal(initialHex);

  const updateField = (fieldName: string) => (event: Event) => {
    const inputElement = event.currentTarget as HTMLInputElement;
    setForm({
      [fieldName]: inputElement.value,
    });
  };

  return (
    <div class={formStyles.formShell}>
      <div class={formStyles.header}>
        <p class={formStyles.eyebrow}>Admin editor</p>
        <Show
          when={props.toEdit}
          fallback={<h2>Add new field group</h2>}
        >
          <h2>Edit field group</h2>
        </Show>
      </div>

      <TextField
        id="field-group-name"
        label="Group name"
        variant="outlined"
        size="small"
        value={form.name}
        onChange={updateField("name")}
      ></TextField>

      {colorPicker(colorHex(), (hex) => {
        setColorHex(hex);
        setForm({ draw_color: hexToRgbWithOpacity(hex, 0.2) });
      })}
      <Button
        disabled={!validateInput(form)}
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
  );
}
