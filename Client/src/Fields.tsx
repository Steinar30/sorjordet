import { createResource, For } from "solid-js";
import { getFarmFieldGroupsWithFields } from "./requests";

import { List, ListItem, ListItemIcon } from "@suid/material";
import { FarmFieldGroup } from "../bindings/FarmFieldGroup";
import { FarmField } from "../bindings/FarmField";
import { Circle } from "@suid/icons-material";

export function RenderFieldsList(fieldGroups: [FarmFieldGroup, FarmField[]][] | undefined) {
    return (
        <List>
            <ListItem>All fields by group:</ListItem>
            <For each={fieldGroups}>{([fg, fields]) => {
                return (
                    <List>
                        <ListItem>
                            {fg.name}
                            <ListItemIcon>
                                <Circle sx={{ color: fg.draw_color, marginLeft: "10px" }} />
                            </ListItemIcon>
                        </ListItem>
                        <For each={fields}>{(field) => {
                            return (
                                <ListItem sx={{ marginLeft: "10px" }}>
                                    {field.name}
                                </ListItem>
                            )
                        }}
                        </For>
                    </List>
                )
            }}
            </For>
        </List>
    )
}

export default function FieldsList() {
    const [farmFieldGroups] = createResource(
        getFarmFieldGroupsWithFields
    );

    return (
        <main style={{ "margin": "20px", "display": "flex", "flex-direction": "row", "flex-wrap": "wrap", "align-items": "start", "justify-content": "space-evenly" }}>
            {RenderFieldsList(farmFieldGroups())}

        </main>
    );
}