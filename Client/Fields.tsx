import { createResource, For } from "solid-js";
import { getFarmFieldGroupsWithFields } from "./requests";

import styles from './Admin.module.css';
import { Box, List, ListItem, ListItemIcon } from "@suid/material";
import { FarmFieldGroup } from "./bindings/FarmFieldGroup";
import { FarmField } from "./bindings/FarmField";
import { NoEditMap } from "./Map";
import { Circle } from "@suid/icons-material";

export function RenderFieldsList(fieldGroups: [FarmFieldGroup, FarmField[]][] | undefined) {
    return (
        <List>
            <ListItem>Liste over jorder etter gruppe:</ListItem>
            <For each={fieldGroups}>{([fg,fields],i) => {
                return (
                    <List>
                        <ListItem>
                            {fg.name}
                            <ListItemIcon>
                                <Circle sx={{color: fg.draw_color, marginLeft:"10px"}}/>
                            </ListItemIcon>
                        </ListItem>
                        <For each={fields}>{(field, j) => {
                            return (
                                <ListItem sx={{marginLeft:"10px"}}>
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
    const [farmFieldGroups, { mutate, refetch }] = createResource(
        getFarmFieldGroupsWithFields
    );

    return (
        <main class={styles.container}>
            {RenderFieldsList(farmFieldGroups())}

            <Box sx={{maxWidth: "600px", width:"90%", height:"400px"}}>
                {NoEditMap}
            </Box>

        </main>
    );
}