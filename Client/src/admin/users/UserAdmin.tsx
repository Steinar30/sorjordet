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
import { UserInfo } from "../../../bindings/UserInfo";
import { UserForm } from "./UserForm";
import { prepareAuth } from "../../requests";
import styles from "../AdminSurface.module.css";

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
      <>
        <div class={styles.tableCard}>
          <TableContainer class={styles.tableWrap}>
            <Table class={styles.table}>
              <TableHead>
                <TableRow>
                  <TableCell>Username</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell class={styles.mobileActionCell}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <For each={users.data}>
                  {(user) => (
                    <TableRow
                      class={`${styles.row} ${styles.clickableRow}`}
                      onClick={() => setEditForm(user)}
                    >
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell class={styles.mobileActionCell}>
                        <IconButton
                          onClick={(event) => {
                            event.stopPropagation();
                            setEditForm(user);
                          }}
                        >
                          <Edit />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  )}
                </For>
              </TableBody>
            </Table>
          </TableContainer>
        </div>
        <div class={styles.mobileCards}>
          <For each={users.data}>
            {(user) => (
              <article
                class={styles.mobileCard}
                onClick={() => setEditForm(user)}
              >
                <div class={styles.mobileCardTop}>
                  <div>
                    <h3 class={styles.mobileCardTitle}>{user.name}</h3>
                    <p class={styles.mobileCardMeta}>Tap to edit account</p>
                  </div>
                </div>
                <div class={styles.mobileCardFacts}>
                  <div>
                    <p>Email</p>
                    <span>{user.email}</span>
                  </div>
                </div>
              </article>
            )}
          </For>
        </div>
      </>
    );
  };

  const RenderUsers = () => {
    return (
      <div class={styles.page}>
        <section class={styles.hero}>
          <div class={styles.heroContent}>
            <p class={styles.eyebrow}>Admin editor</p>
            <h2>Users</h2>
          </div>
          <Button
            class={styles.heroAction}
            size="small"
            variant="contained"
            onClick={() => setNewForm(true)}
          >
            New user
          </Button>
        </section>
        <RenderUsersList />
      </div>
    );
  };

  return (
    <main class={styles.page}>
      <Switch fallback={<RenderUsers />}>
        <Match when={editForm()}>
          {(form) => (
            <>
              <Button variant="outlined" onClick={() => setEditForm(undefined)}>
                Cancel
              </Button>
              <UserForm
                onCreate={() => {
                  users.refetch();
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
            onCreate={() => {
              users.refetch();
              setNewForm(false);
            }}
          />
        </Match>
      </Switch>
    </main>
  );
}
