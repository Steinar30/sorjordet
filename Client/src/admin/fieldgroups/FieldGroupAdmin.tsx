import { createQuery } from "@tanstack/solid-query";
import { createSignal, For, Match, Switch } from "solid-js";
import {
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@suid/material";
import { FarmFieldGroupMeta } from "../../../bindings/FarmFieldGroupMeta";
import { FieldGroupForm } from "./FieldGroupForm";
import { Edit } from "@suid/icons-material";

export default function FieldGroupAdmin() {
  const [editForm, setEditForm] = createSignal<FarmFieldGroupMeta | undefined>(
    undefined,
  );
  const [newForm, setNewForm] = createSignal(false);

  const groups = createQuery<FarmFieldGroupMeta[]>(() => ({
    queryKey: ["field_groups"],
    queryFn: () => fetch("/api/farm_field_groups/meta").then((a) => a.json()),
  }));

  const RenderGroupsList = () => {
    return (
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell></TableCell>
              <TableCell>ID</TableCell>
              <TableCell>Group</TableCell>
              <TableCell>Fields</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <For each={groups.data}>
              {(group) => (
                <TableRow>
                  <TableCell sx={{ width: "20px" }}>
                    <span
                      style={{
                        display: "block",
                        "background-color": group.draw_color,
                        width: "20px",
                        height: "20px",
                        "border-radius": "50%",
                        border: "1px solid gray",
                      }}
                    />
                  </TableCell>
                  <TableCell>{group.id}</TableCell>
                  <TableCell>{group.name}</TableCell>
                  <TableCell>{group.fields.length}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => setEditForm(group)}>
                      <Edit />
                    </IconButton>
                  </TableCell>
                </TableRow>
              )}
            </For>
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const RenderGroups = () => {
    return (
      <>
        <Button
          variant="contained"
          sx={{ textWrap: "nowrap", marginBottom: "16px" }}
          onClick={() => setNewForm(true)}
        >
          New group
        </Button>
        <RenderGroupsList />
      </>
    );
  };

  return (
    <main
      style={{
        padding: "10px",
        "max-width": "800px",
        margin: "0 auto",
        width: "calc(100% - 40px)",
      }}
    >
      <Switch fallback={<RenderGroups />}>
        <Match when={editForm()}>
          {(form) => (
            <>
              <Button variant="outlined" onClick={() => setEditForm(undefined)}>
                Cancel
              </Button>
              <FieldGroupForm
                onSave={() =>{
                  setEditForm(undefined); 
                  groups.refetch();
                }}
                toEdit={form()}
              />
            </>
          )}
        </Match>
        <Match when={newForm()}>
          <Button variant="outlined" onClick={() => setNewForm(false)}>
            Cancel
          </Button>
          <FieldGroupForm onSave={() => setNewForm(false)} />
        </Match>
      </Switch>
    </main>
  );
}
