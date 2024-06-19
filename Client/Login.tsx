import { Paper, Typography, TextField, Button, Box, Alert } from '@suid/material';
import { createStore } from "solid-js/store";

import logo from './farm-logo.svg';
import styles from './App.module.css';
import { LoginRequest } from './bindings/LoginRequest';
import { LoginResponse } from './bindings/LoginResponse';
import { jwt_localstore_key, set_jwt_token } from './App';
import { createSignal, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';


const submit = async (
    form: LoginRequest,
    err_callback: (message: string) => void,
    succ_callback: (token: string) => void
) => {

    const response = await fetch("/api/auth/login", {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(form)
    });
    try {

        const login_resp: LoginResponse = await response.clone().json();

        if (login_resp.result) {
            succ_callback(login_resp.token)
        } else {
            err_callback(login_resp.message)
        }
    }
    catch (e) {
        const body_text = await response.text();
        err_callback(body_text);
    }
}

export default function Login() {
    
    const navigate = useNavigate()
    const [error, set_error] = createSignal<string | null>(null);

    const [form, setForm] = createStore<LoginRequest>({
        username:"",
        password:""
    });

    const updateField = (fieldName:string) => (event:Event) => {
        const inputElement = event.currentTarget as HTMLInputElement;
        setForm({
            [fieldName]: inputElement.value
        })
    };

    const handleSubmit = (event: Event): void => {
        event.preventDefault();
        submit(form, set_error, (token: string) => {
            window.localStorage.setItem(jwt_localstore_key, token);
            set_jwt_token(token)
            navigate("/")
        });
    };


    return (
        <div class={styles.loginContainer}>
            <Paper class={styles.loginPaper}>
                <img src={logo} class={styles.loginLogo} alt="logo" />

                <Typography variant='h5'>Sørjordet gård</Typography>
                
                <Box
                    component="form"
                    class={styles.loginPaper}
                    sx={{ margin: 0, p: 0, pb: "1rem", pt: "1rem" }}
                    onsubmit={handleSubmit}
                >
                    <TextField
                        id="username-field"
                        label="Brukernavn"
                        variant="outlined"
                        size="small"
                        onChange={updateField("username")}
                    ></TextField>
                    <TextField
                        id="password-field"
                        label="Passord"
                        variant="outlined"
                        size="small"
                        type="password"
                        onChange={updateField("password")}
                    ></TextField>
                    <Button
                        id="login-button"
                        variant="contained"
                        type="submit"
                    >
                    Logg inn
                    </Button>
                </Box>

                <Show when={error() != null}>
                    <Alert severity='error' onClose={() => set_error(null)}>
                        {error?.toString()}
                    </Alert>
                </Show>
            </Paper>
        </div>
    )
}