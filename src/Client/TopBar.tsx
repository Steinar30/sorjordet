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
import { style } from "solid-js/web";

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

    const navFields = <A class={styles.header_link} href="/fields">Jorder</A>
    const navAbout  = <A class={styles.header_link} href="/about">Om siden</A>
    const navLogin  = <A class={styles.header_link} href="/login">Logg inn</A>

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
                                        <ListItemText>
                                            {navFields}
                                        </ListItemText>
                                    </ListItem>
                                    <ListItem>
                                        <ListItemText>
                                            {navAbout}
                                        </ListItemText>
                                    </ListItem>
                                    <ListItem>
                                        <ListItemText>
                                            {navLogin}
                                        </ListItemText>
                                    </ListItem>
                                </List>
                            </div>
                        </Drawer>
                    </Show>
                </Toolbar>
            </AppBar>
        
    );
}
