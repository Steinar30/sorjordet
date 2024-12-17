import { createQuery } from "@tanstack/solid-query";
import { createSignal, Show} from "solid-js";
import { HarvestType } from "../../../bindings/HarvestType";
import { Button, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@suid/material";
import { Edit } from "@suid/icons-material";

export default function HarvestEvents() {
  const [showAddForm, setShowAddForm] = createSignal(false);
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
      <div style={{ display: "flex", "justify-content": "space-between" }}>
        <Button 
          variant="contained"
          sx={{ textWrap: "nowrap" }}
          onClick={() => setShowAddForm(true)}
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
                    <IconButton onClick={() => setEditForm(harvestType)}>
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
