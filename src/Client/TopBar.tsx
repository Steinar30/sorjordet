import MenuIcon from "@suid/icons-material/Menu";
import {
    AppBar,
    Box,
    Button,
    IconButton,
    Toolbar,
    Typography
} from "@suid/material";
import { A } from "@solidjs/router";
import { Show } from 'solid-js';
import { createMediaQuery } from "@solid-primitives/media";


import logo from './farm-logo.svg';

export default function TopAppBar() {
    const isSmall = createMediaQuery("(max-width:600px)");

    return (
        
            <AppBar position="static">
                <Toolbar>
                    <Button href="/" >
                        <img src={logo} alt="logo" style={{ "max-height": "48px", "max-width": "48px", "padding-left": "5px" }} />
                        <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: "black", ml: "10px", mr: "10px"}}>
                            Sørjordet
                        </Typography>
                    </Button>

                    <Show
                        when={!isSmall()}
                        fallback={
                            <IconButton
                                size="large"
                                edge="start"
                                color="inherit"
                                aria-label="menu"
                                sx={{ ml: "auto", mr: "-10px" }}
                                >
                                <MenuIcon />
                            </IconButton>
                        }
                    >
                        <div style={{"margin-left":"auto"}}>
                            <A style={{ "margin-right": "5px" }} href="/">Marker</A>
                            <A style={{ "margin-right": "5px" }} href="/login">Logg inn</A>

                        </div>

                    </Show>


                    
                </Toolbar>
            </AppBar>
        
    );
}
