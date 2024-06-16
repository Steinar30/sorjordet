import MenuIcon from "@suid/icons-material/Menu";
import {
    AppBar,
    Drawer,
    IconButton,
    List,
    ListItem,
    Toolbar,
    Typography
} from "@suid/material";
import { createSignal, mapArray, Show } from 'solid-js';
import { createMediaQuery } from "@solid-primitives/media";


import logo from './farm-logo.svg';
import styles from './TopBar.module.css';
import { jwt_localstore_key, jwt_token, set_jwt_token } from "./App";

export default function TopAppBar() {
    const isSmall = createMediaQuery("(max-width:600px)");

    const [isOpen, setIsOpen] = createSignal(false);


    const navHome = () => 
        <a href="/" class={styles.headerImageButton} >
            <img src={logo} alt="logo" />
            <Typography variant="h6" class={styles.headerImageText} component="div">
                Sørjordet
            </Typography>
        </a>

    const navAdmin = 
        <Show when={jwt_token() != null}>
            <a class={styles.headerLink} href="/admin">Admin</a>
        </Show>
    const navFields = <a class={styles.headerLink} href="/fields">Jorder</a>
    const navAbout  = <a class={styles.headerLink} href="/about">Om siden</a>
    const navLogin  = 
        <Show when={jwt_token() != null}
            fallback={
                <a class={styles.headerLink} href="/login">Logg inn</a>
            }
        >
            <button 
                onclick={() => {
                    window.localStorage.removeItem(jwt_localstore_key);
                    set_jwt_token(null);
                }}
                class={styles.headerLink}>
                Logg ut
            </button>
        </Show>

    return (
        
            <AppBar position="static" class={styles.headerContainer}>
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
                            class={styles.headerContainer}
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
