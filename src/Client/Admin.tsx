import { ArrowBack } from "@suid/icons-material";
import { Button, IconButton, Typography } from "@suid/material";
import { createResource, createSignal, Match, Show, Switch } from "solid-js";

import styles from './Admin.module.css';
import { jwt_token } from "./App";
import { FarmField } from "./bindings/FarmField";
import { FarmFieldGroup } from "./bindings/FarmFieldGroup";
import { FieldForm } from "./FarmFieldForm";
import { FieldGroupForm } from "./FarmFieldGroupForm";
import { getFarmFieldGroups, getFarmFieldGroupsWithFields } from "./requests";


export default function Admin() {
    const [currentView, setCurrentView] = createSignal<string>("admin");
    const [farmFieldGroups, {mutate, refetch}] = 
        createResource(getFarmFieldGroupsWithFields);
    
    function navButton(label:string, navstring:string) {
        return (
            <Button
                size="small"
                variant="contained"
                onClick={() => setCurrentView(navstring)}
            >
                {label}
            </Button>
        )
    }

    function backButton() {
        return (
            <IconButton
                size="large"
                edge="start"
                color="inherit"
                aria-label="return"
                sx={{fontSize:"16px", borderRadius: "15px"}}
                onClick={() => {
                    setCurrentView("admin");
            }}>
                <ArrowBack/> Tilbake
            </IconButton>
        )
    }

    return (
        <main class={styles.container}>
            <Show when={jwt_token()} 
                fallback={<p>Du har ikke tilattelse til å se denne siden.</p>}
            >

            <Typography variant="h6">Admin</Typography>
            <Switch >
                <Match when={currentView() === "admin"}>
                    <div class={styles.admin_buttons}>
                        {navButton("Ny mark", "add-field")}
                        {navButton("Ny jordegruppe", "add-field-group")}
                    </div>
                </Match>
                <Match when={currentView() === "add-field"}>
                    {backButton}

                    {FieldForm((f) => {
                        const ffg = farmFieldGroups();
                        if (ffg) {
                            mutate(
                                ffg.map((x) => {
                                    if (x[0].id === f.farm_field_group_id) {
                                        const y = [...x[1], f]
                                        const n : [FarmFieldGroup, FarmField []] = 
                                            [x[0], y]
                                        return n;
                                    } else {
                                        return x;
                                    }
                                })
                            )
                            const groupForFieldIdx = 
                                ffg.findIndex(([x,_]) => 
                                    x.id === f.farm_field_group_id);
                            if (groupForFieldIdx < 0) {
                                return;
                            } else {
                                const c = 
                                    [
                                        ffg[groupForFieldIdx][0]
                                        , [...ffg[groupForFieldIdx][1], f]
                                    ];
                                


                            }
                                

                            setCurrentView("admin");
                        }
                    }

                    )}
                </Match>
                <Match when={currentView() === "add-field-group"}>
                    {backButton}

                    {FieldGroupForm((fg) => {
                        const ffg = farmFieldGroups();
                        if (ffg) {
                            mutate(
                                [...ffg, [fg, []]]
                            )
                            setCurrentView("admin");
                        }
                    }
                    )}

                </Match>

            </Switch>

            

            </Show>
        </main>
    )
}
