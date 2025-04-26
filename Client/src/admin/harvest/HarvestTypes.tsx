import { createQuery } from "@tanstack/solid-query";
import { createSignal, Show } from "solid-js";
import { HarvestType } from "../../../bindings/HarvestType";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from "@suid/material";
import { Edit } from "@suid/icons-material";
import { prepareAuth } from "../../requests";

// apicalls dont return a new object, using refetch instead
const updateHarvestType = (harvestType: HarvestType) => {
  const authHeaders = prepareAuth(true);
  if (authHeaders === null) {
    console.log("not allowed to post without bearer token");
    return null;
  }
  return fetch(`/api/harvest_type/${harvestType.id}`, {
    method: "PATCH",
    body: JSON.stringify(harvestType),
    headers: authHeaders
  });
};

const createHarvestType = (harvestType: HarvestType) => {
  const authHeaders = prepareAuth(true);
  if (authHeaders === null) {
    console.log("not allowed to post without bearer token");
    return null;
  }
  return fetch(`/api/harvest_type`, {
    method: "POST",
    body: JSON.stringify(harvestType),
    headers: authHeaders
  });
};

export default function HarvestTypes() {
  const [addForm, setAddForm] = createSignal<HarvestType | undefined>(undefined);
  const [editForm, setEditForm] = createSignal<HarvestType | undefined>(undefined);

  const harvestTypes = createQuery<HarvestType[]>(() => ({
    queryKey: ["harvest_types"],
    queryFn: () => fetch("/api/harvest_type").then((a) => a.json()),
  }));

  return (
    <main
      style={{
        padding: "10px",
        "max-width": "800px",
        margin: "0 auto",
        width: "calc(100% - 40px)",
      }}
    >
      <Dialog
        open={addForm() !== undefined || editForm() !== undefined}
        onClose={() => addForm() != undefined ? setAddForm(undefined) : setEditForm(undefined)}
      >
        <DialogTitle style={{ "padding-bottom": "" }}>
          <Show when={editForm()} fallback={<p>Add New type</p>}>
            <p>Update "{editForm()?.name}</p>
          </Show>
        </DialogTitle>
        <DialogContent style={{ "padding-top": "10px" }}>
          <Show when={addForm()}>
            <TextField
              id="name"
              label="Name"
              variant="outlined"
              size="small"
              value={addForm()?.name}
              onChange={(x) => setAddForm({ id: -1, name: x.target.value })}
            />
          </Show>
          <Show when={editForm()}>
            <TextField
              id="name"
              label="Name"
              variant="outlined"
              size="small"
              value={editForm()?.name}
              onChange={(x) => setEditForm({ id: editForm()!.id, name: x.target.value })}
            />
          </Show>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => addForm() ? setAddForm(undefined) : setEditForm(undefined)}>Cancel</Button>
          <Show when={addForm()}>
            {(toAdd =>
              <Button
                variant="contained"
                onClick={async () => {
                  const n = await createHarvestType(toAdd());
                  if (n?.ok) {
                    setAddForm(undefined);
                    harvestTypes.refetch();
                  }
                }}
              >
                Save
              </Button>
            )}
          </Show>
          <Show when={editForm()}>
            {update => (<Button
              variant="contained"
              onClick={async () => {
                const n = await updateHarvestType(update());
                if (n?.ok) {
                  setEditForm(undefined);
                  harvestTypes.refetch();
                }
              }}
            >
              Save
            </Button>)}
          </Show>
        </DialogActions>
      </Dialog>
      <div style={{ display: "flex", "justify-content": "space-between" }}>
        <Button
          variant="contained"
          sx={{ textWrap: "nowrap" }}
          onClick={() => setAddForm({ id: -1, name: "" })}
        >
          New type
        </Button>
      </div>
      <Show when={harvestTypes.isSuccess && harvestTypes.data}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Id</TableCell>
                <TableCell>Harvest Type</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {harvestTypes.data?.map((harvestType) => (
                <TableRow>
                  <TableCell>{harvestType.id}</TableCell>
                  <TableCell>{harvestType.name}</TableCell>
                  <TableCell>
                    <IconButton
                      onClick={() => setEditForm(harvestType)}
                    >
                      <Edit />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Show>
    </main>
  );
}
