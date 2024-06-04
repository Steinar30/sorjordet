import MenuIcon from "@suid/icons-material/Menu";
import {
    AppBar,
    Box,
    Button,
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemText,
    Toolbar,
    Typography
} from "@suid/material";
import { A } from "@solidjs/router";
import { createSignal, mapArray, Show } from 'solid-js';
import { createMediaQuery } from "@solid-primitives/media";


import logo from './farm-logo.svg';
import styles from './TopBar.module.css';
import { jwt_localstore_key, jwt_token, set_jwt_token } from "./App";

export default function TopAppBar() {
    const isSmall = createMediaQuery("(max-width:600px)");

    const [isOpen, setIsOpen] = createSignal(false);


    const navHome = () => 
        <A href="/" class={styles.header_image_button} >
            <img src={logo} alt="logo" />
            <Typography variant="h6" class={styles.header_image_text} component="div">
                Sørjordet
            </Typography>
        </A>

    const navAdmin = 
        <Show when={jwt_token() != null}>
            <A class={styles.header_link} href="/admin">Admin</A>
        </Show>
    const navFields = <A class={styles.header_link} href="/fields">Jorder</A>
    const navAbout  = <A class={styles.header_link} href="/about">Om siden</A>
    const navLogin  = 
        <Show when={jwt_token() != null}
            fallback={
                <A class={styles.header_link} href="/login">Logg inn</A>
            }
        >
            <button 
                onclick={() => {
                    window.localStorage.removeItem(jwt_localstore_key);
                    set_jwt_token(null);
                }}
                class={styles.header_link}>
                Logg ut
            </button>
        </Show>

    return (
        
            <AppBar position="static" class={styles.header_container}>
                <Toolbar>
                    {navHome()}

                    <Show
                        when={isSmall()}
                        fallback={
                            <div style={{"margin-left":"auto"}}>
                                {navFields}
                                {navAbout}
                                {navAdmin}
                                {navLogin}
                            </div>
                        }
                    >
                        <IconButton
                            size="large"
                            edge="start"
                            color="inherit"
                            aria-label="menu"
                            onClick={() => {
                                setIsOpen(!isOpen());
                            }}
                            sx={{ ml: "auto", mr: "-10px" }}
                        >
                            <MenuIcon />

                        </IconButton>
                        <Drawer
                            class={styles.header_container}
                            anchor="left"
                            open={isOpen()}
                            onClose={() => {
                                setIsOpen(false);
                            }}
                            onClick={() => setIsOpen(false)}
                        >
                            <div 
                                style={{padding:"10px"}}>
                                {navHome()}
                                <List>
                                    <ListItem>
                                        {navFields}                               
                                    </ListItem>
                                    <ListItem>                                        
                                        {navAbout}
                                    </ListItem>
                                    <ListItem>
                                        {navAdmin}
                                    </ListItem>
                                    <ListItem>
                                        {navLogin}
                                    </ListItem>
                                </List>
                            </div>
                        </Drawer>
                    </Show>
                </Toolbar>
            </AppBar>
        
    );
}
