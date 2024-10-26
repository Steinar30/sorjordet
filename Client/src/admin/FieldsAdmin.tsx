import { createQuery } from "@tanstack/solid-query";
import { FarmFieldMeta } from "../../bindings/FarmFieldMeta";
import { For, Show } from "solid-js";
import { Button, List, ListItem } from "@suid/material";
import { prepareAuth } from "../requests";

const deleteField = async (id: number) => {
  const authHeaders = prepareAuth(true);
  if (authHeaders === null) {
    console.log('not allowed to post without bearer token');
    return;
  }
  const response = await fetch(`/api/farm_fields/${id}`, {
    method: 'DELETE',
    headers: authHeaders
  });
  if (response.status === 200) {
    return;
  }
}

export default function FieldsAdmin() {

  const fields = createQuery<FarmFieldMeta[]>(() => ({
    queryKey: ['fields'],
    queryFn: () => fetch('/api/farm_fields').then(a => a.json())
  }));

  return (
    <main>
      <h1>Fields Admin</h1>

      <Show when={fields.data}>
        <List>
          <For each={fields.data}>{(field) => {
            return (
              <ListItem>
                {field.id}
                {field.name}
                <Button onClick={async () => {
                  await deleteField(field.id);
                  fields.data?.filter(f => f.id !== field.id);
                }
                } variant="contained">Delete</Button>
              </ListItem>
            )
          }}
          </For>
        </List>
      </Show>

    </main>
  )
}