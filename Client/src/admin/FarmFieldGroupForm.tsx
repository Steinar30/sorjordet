import { Button, TextField, Typography } from "@suid/material";
import { createStore } from "solid-js/store";
import { FarmFieldGroup } from "../../bindings/FarmFieldGroup";
import { tryPostNewFieldGroup } from "../requests";
import { FarmFieldGroupMeta } from "../../bindings/FarmFieldGroupMeta";

function validateInput(group: FarmFieldGroupMeta): boolean {
    return (group.name.length > 0 && group.draw_color.length > 0)
}

function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function hexToRgbWithOpacity(hex: string, opacity: number) {
    const x = hexToRgb(hex);
    if (x) {
        return 'rgba(' + x.r + ',' + x.g + ',' + x.b + ',' + opacity + ')';
    } else {
        return hex
    }
}

function rgbToHex(rgba: string) {
    if (rgba === "") {
        return "#000";
    }
    const [r, g, b] = rgba.match(/\d+/g)!.map(Number);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function colorPicker(val: string, callback: (x: string) => void) {
    return (<div>
        <label for="draw_color" style={{ "margin-right": "10px" }}>Groupcolor</label>
        <input
            style={{ opacity: "0.4" }}
            onchange={(ev) => {
                callback(ev.currentTarget.value);
            }}
            type="color"
            id="draw_color"
            name="draw_color"
            value={rgbToHex(val)}
        />
    </div>)
}

export function FieldGroupForm(props:{
    onCreate: () => void,
    toEdit?: FarmFieldGroupMeta
}) {

    const [form, setForm] = createStore<FarmFieldGroupMeta>(props.toEdit || {
        id: -1,
        name: "",
        farm_id: 1,
        fields: [],
        draw_color: ""
    });

    const updateField = (fieldName: string) => (event: Event) => {
        const inputElement = event.currentTarget as HTMLInputElement;
        setForm({
            [fieldName]: inputElement.value
        })
    };

    return (
        <div id="map_form_container">
            <div id="field_form">
                <Typography variant="h6">Add new field group</Typography>

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
                        setForm({ ["draw_color"]: hexToRgbWithOpacity(form.draw_color, 0.2) });
                        const result = await tryPostNewFieldGroup(form);
                        if (result) {
                            const formRes = form;
                            formRes.id = result;
                            props.onCreate();
                        }
                    }}
                >
                    Save Group
                </Button>
            </div>
        </div>
    );
}