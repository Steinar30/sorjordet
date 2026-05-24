import {
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  TextField,
  Typography,
} from "@suid/material";
import { createStore } from "solid-js/store";
import { prepareAuth } from "../../requests";
import { UserInfo } from "../../../bindings/UserInfo";
import { createSignal, Show } from "solid-js";
import { RestartAlt } from "@suid/icons-material";
import { User } from "../../../bindings/User";
import styles from "../AdminForm.module.css";

function validateInput(group: UserInfo): boolean {
  return group.name.length > 0 && group.email.length > 0;
}

const createUser = async (
  user: UserInfo,
  password: string,
): Promise<UserInfo | null> => {
  const authHeaders = prepareAuth(true);
  if (authHeaders === null) {
    console.log("not allowed to post without bearer token");
    return null;
  }
  const body: User = {
    ...user,
    password: password ?? "",
  };
  const result = await fetch("/api/users", {
    method: "POST",
    body: JSON.stringify(body),
    headers: authHeaders,
  });

  if (result.status === 200) {
    return result.json();
  } else {
    return null;
  }
};

const generateRandomPassword = () => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 20; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

const updateUser = async (
  user: UserInfo,
  password: string | undefined,
): Promise<UserInfo | null> => {
  const authHeaders = prepareAuth(true);
  if (authHeaders === null) {
    console.log("not allowed to post without bearer token");
    return null;
  }
  const body: User = {
    ...user,
    password: password ?? "",
  };
  const result = await fetch("/api/users/" + user.id, {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: authHeaders,
  });

  if (result.status === 200) {
    return result.json();
  } else {
    return null;
  }
};

export function UserForm(props: {
  onCreate: (user: UserInfo) => void;
  toEdit?: UserInfo;
}) {
  const [form, setForm] = createStore<UserInfo>(
    props.toEdit || {
      id: -1,
      name: "",
      email: "",
    },
  );
  const [password, setPassword] = createSignal(generateRandomPassword());

  const updateField = (fieldName: string) => (event: Event) => {
    const inputElement = event.currentTarget as HTMLInputElement;
    setForm({
      [fieldName]: inputElement.value,
    });
  };

  const [newPassword, setNewPassword] = createSignal(
    props.toEdit === undefined,
  );

  const PasswordContainer = () => {
    return (
      <div class={styles.passwordRow}>
        <div class={styles.passwordHeader}>
          <p class={styles.passwordLabel}>Generated password</p>
          <p class={styles.passwordValue}>{password()}</p>
        </div>
        <IconButton
          sx={{ width: "40px", height: "40px" }}
          onClick={() => {
            setPassword(generateRandomPassword());
          }}
        >
          <RestartAlt />
        </IconButton>
      </div>
    );
  };

  return (
    <div class={styles.formShell}>
      <div class={styles.header}>
        <p class={styles.eyebrow}>Admin editor</p>
        <Typography variant="h6">
          {props.toEdit ? "Edit user" : "Add user"}
        </Typography>
      </div>
      <p class={styles.intro}>
        {props.toEdit
          ? "Update the account details and optionally roll a fresh password."
          : "Create a new account with a generated password you can hand off right away."}
      </p>

      <TextField
        id="username"
        label="Username"
        variant="outlined"
        size="small"
        value={form.name}
        onChange={updateField("name")}
      />

      <TextField
        id="email"
        label="Email"
        variant="outlined"
        size="small"
        value={form.email}
        onChange={updateField("email")}
      />

      <Show
        when={props.toEdit !== undefined}
        fallback={<PasswordContainer />}
      >
        <FormControlLabel
          control={
            <Checkbox
              checked={newPassword()}
              onChange={() => {
                setNewPassword(!newPassword());
              }}
            />
          }
          label="Generate new password"
        />

        <Show when={newPassword()}>
          <PasswordContainer />
        </Show>
      </Show>

      <Button
        disabled={!validateInput(form)}
        variant="contained"
        onClick={async () => {
          if (props.toEdit !== undefined) {
            const result = await updateUser(
              form,
              newPassword() ? password() : undefined,
            );
            if (result) {
              props.onCreate(result);
            }
          } else {
            const result = await createUser(form, password());
            if (result) {
              props.onCreate(result);
            }
          }
        }}
      >
        Save user
      </Button>
    </div>
  );
}
