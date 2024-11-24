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
import { Edit } from "@suid/icons-material";
import { UserInfo } from "../../bindings/UserInfo";
import { UserForm } from "./UserForm";
import { prepareAuth } from "../requests";

const getUsers: () => Promise<UserInfo[]> = async () => {
  const authHeaders = prepareAuth(false);
  if (authHeaders === null) {
    console.log("not allowed to fetch users without bearer token");
    return null;
  }
  return fetch("/api/users", {
    headers: authHeaders,
  }).then((a) => a.json());
};

export default function UserAdmin() {
  const [editForm, setEditForm] = createSignal<UserInfo | undefined>(undefined);
  const [newForm, setNewForm] = createSignal(false);

  const users = createQuery<UserInfo[]>(() => ({
    queryKey: ["users"],
    queryFn: getUsers,
  }));

  const RenderUsersList = () => {
    return (
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Username</TableCell>
              <TableCell>Email</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <For each={users.data}>
              {(user) => (
                <TableRow>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => setEditForm(user)}>
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

  const RenderUsers = () => {
    return (
      <>
        <Button
          variant="contained"
          sx={{ textWrap: "nowrap" }}
          onClick={() => setNewForm(true)}
        >
          New user
        </Button>
        <RenderUsersList />
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
      <Switch fallback={<RenderUsers />}>
        <Match when={editForm()}>
          {(form) => (
            <>
              <Button variant="outlined" onClick={() => setEditForm(undefined)}>
                Cancel
              </Button>
              <UserForm
                onCreate={(x) => {
                  users.data?.map((u) => (u.id === x.id ? x : u));
                  setEditForm(undefined);
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
          <UserForm
            onCreate={(x) => {
              users.data?.push(x);
              setNewForm(false);
            }}
          />
        </Match>
      </Switch>
    </main>
  );
}
