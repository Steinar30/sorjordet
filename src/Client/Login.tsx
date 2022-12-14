import { Paper, Typography, TextField, Button, Box } from '@suid/material';
import { createStore } from "solid-js/store";

import logo from './farm-logo.svg';
import styles from './App.module.css';
import { LoginRequest } from './bindings/LoginRequest';


const submit = (form:LoginRequest) => {


    const response = fetch("/api/login", {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(form)
    });

    console.log("response", response);
}

export default function Login() {

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
        submit(form);
    };


    return (
        <div class={styles.login_container}>
            <Paper class={styles.login_paper}>
                <img src={logo} class={styles.login_logo} alt="logo" />

                <Typography variant='h5'>Sørjordet gård</Typography>
                
                <Box
                    component="form"
                    class={styles.login_paper}
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
            </Paper>
        </div>
    )
}