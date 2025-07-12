import { createQuery } from "@tanstack/solid-query";
import { Accessor, createSignal, Setter, Show } from "solid-js";
import { HarvestEvent } from "../../../bindings/HarvestEvent";
import { Button, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@suid/material";
import { Edit } from "@suid/icons-material";
import { FarmFieldGroupMeta } from "../../../bindings/FarmFieldGroupMeta";

function renderEventsTable(harvestEvents: HarvestEvent[], setEditForm: Setter<HarvestEvent | undefined>) {
  return (
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
          {harvestEvents.map((harvestType) => (
            <TableRow>
              <TableCell>{harvestType.id}</TableCell>
              <TableCell>{harvestType.type_name}</TableCell>
              <TableCell>
                <IconButton disabled onClick={() => setEditForm(harvestType)}>
                  <Edit />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default function HarvestTypes() {
  const [editForm, setEditForm] = createSignal<HarvestEvent | undefined>(undefined);
  const [deleteForm, setDeleteForm] = createSignal<HarvestEvent | undefined>(undefined);

  const groupsWithFields = createQuery<FarmFieldGroupMeta[]>(() => ({
    queryKey: ["field_groups"],
    queryFn: () => fetch("/api/farm_field_groups/meta").then((a) => a.json()),
  }));

  const harvestEvents = createQuery<HarvestEvent[]>(() => ({
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
      <div style={{ display: "flex", "justify-content": "space-between" }}>
        <Button
          variant="contained"
          sx={{ textWrap: "nowrap" }}
          onClick={() => setShowAddForm(true)}
          disabled
        >
          New type
        </Button>
      </div>
      <Show when={harvestEvents.isSuccess && harvestEvents.data}>
        {renderEventsTable(harvestEvents.data)}
      </Show>
    </main>
  );
}
