import { Box, Typography } from "@suid/material";

import styles from './About.module.css';

export default function About() {
    return (
        <main class={styles.aboutContainer}>
            <Box>

                <Typography variant="h3">Om siden</Typography>

                <Typography>
                    Denne siden er ment som en oversiktsside for gården jeg kommer fra. Jeg brukte det også som en mulighet for å teste teknologi jeg ikke har brukt så mye før.
                </Typography>
                <Typography>
                    Frontend er bygd med Solid.js i typescript. Jeg har mest erfaring med F# og React som er ganske annerledes men når jeg fikk satt meg inn i primitivene jeg trengte var det ikke så ille.
                    Til komponenter brukte jeg SUID, som er en SolidJs implementasjon av MaterialUI.

                    Backend er bygd med Axum i Rust. Jeg har brukt Rust en del men har ikke brukt Axum før. En kul og litt mystisk del av bibloteket er extractors, som jeg bruker til å verifisere JWT tokens i type signaturen til funksjoner.
                    Jeg brukte sqlx for å sende sql spørringer til en POSTGRESQL database.

                    All kode for nettsiden ligger åpent på min <a href="https://github.com/Steinar30/sorjordet">Github</a>
                </Typography>
                
            </Box>
        </main>

    );
}