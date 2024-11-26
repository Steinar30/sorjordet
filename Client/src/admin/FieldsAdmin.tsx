import { createSignal, Match, Switch } from "solid-js";
import { Button } from "@suid/material";
import FieldsList from "../fields/FieldsList";
import { FieldForm } from "./FarmFieldForm";
import { FarmField } from "../../bindings/FarmField";
import { FieldUpdateForm } from "./FieldEditForm";

export default function FieldsAdmin() {
  const [showForm, setShowForm] = createSignal(false);
  const [editForm, setEditForm] = createSignal<FarmField | undefined>(
    undefined,
  );

  return (
    <main
      style={{
        padding: "10px",
        "max-width": "800px",
        margin: "0 auto",
        width: "calc(100% - 40px)",
      }}
    >
      <Switch>
        <Match when={showForm()}>
          <Button variant="outlined" onClick={() => setShowForm(false)}>
            Cancel
          </Button>
          <FieldForm onCreate={() => setShowForm(false)} />
        </Match>
        <Match when={editForm()}>
          {(field) => (
            <>
              <Button variant="outlined" onClick={() => setEditForm(undefined)}>
                Cancel
              </Button>
              <FieldUpdateForm
                onSave={() => setEditForm(undefined)}
                initial={field()}
              />
            </>
          )}
        </Match>
        <Match when={!showForm()}>
          <FieldsList
            showDelete
            addButton={() => (
              <Button
                variant="contained"
                sx={{ textWrap: "nowrap" }}
                onClick={() => setShowForm(true)}
              >
                New field
              </Button>
            )}
            setEdit={setEditForm}
          />
        </Match>
      </Switch>
    </main>
  );
}
