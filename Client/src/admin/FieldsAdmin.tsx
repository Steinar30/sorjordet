import { createQuery } from "@tanstack/solid-query";
import { FarmFieldMeta } from "../../bindings/FarmFieldMeta";
import { createSignal, For, Match, Show, Switch } from "solid-js";
import { Button, List, ListItem } from "@suid/material";
import { prepareAuth } from "../requests";
import FieldsList from "../fields/FieldsList";
import { FieldForm } from "./FarmFieldForm";

export default function FieldsAdmin() {
  const [showForm, setShowForm] = createSignal(false);

  return (
    <main style={{ padding: "10px", "max-width": "800px", margin: "0 auto", width: "calc(100% - 40px)" }}>
      <Switch>
        <Match when={showForm()}>
          <Button variant="outlined" onClick={() => setShowForm(false)}>Cancel</Button>
          <FieldForm onCreate={() => setShowForm(false)} />
        </Match>
        <Match when={!showForm()}>
          <FieldsList 
            showDelete 
            addButton={() => 
              <Button variant="contained" sx={{textWrap: "nowrap"}} onClick={() => setShowForm(true)}>New field</Button>
            } 
          />
        </Match>
      </Switch>
    </main>
  )
}