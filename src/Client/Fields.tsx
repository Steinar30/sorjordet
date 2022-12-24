import { createResource, For } from "solid-js";
import { getFarmFieldGroupsWithFields } from "./requests";

import styles from './Admin.module.css';
import { List, ListItem } from "@suid/material";

export default function FieldsList() {
    const [farm_field_groups, { mutate, refetch }] = createResource(
        getFarmFieldGroupsWithFields
    );

    return (
        <main class={styles.container}>
            <List>
                <For each={farm_field_groups()}>{(fg,i) => {
                    return (
                        <ListItem>
                            {fg[0].name}
                        </ListItem>
                    )
                }}
                </For>

            </List>

        </main>
    );
}