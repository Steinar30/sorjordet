import { Box, Typography } from "@suid/material";

import styles from './About.module.css';

export default function About() {
    return (
        <main class={styles.about_container}>
            <Box>

                <Typography variant="h3">Hei og god jul!</Typography>

                <img src="/assets/santa-dog-laptop.jpg"/>

                <Typography>
                    Dette startet som et leke-prosjekt i høst, men nu som det nerma seg jul tenkte æ at detta va en fin julegave!
                </Typography>
                <Typography>
                    Muligens ikke helt ferdig ennu, men planen er at vi skal kunne legge inn marker på kartet, og registrere data om markene etterhvert.
                    Tenkte å legge inn mulighet for å registrere antall rundballer og kanskje kg gjødsel i romjula men er åpen for ideer.
                </Typography>
                <Typography>
                    Litt om siden: På startsiden ser vi et kart med en del marker markert. La inn et par til å starte med men har ikke lagt til alle.
                    Fargen på markene avhenger av hvilken gruppe de er en del av.
                </Typography>

                <Typography>
                    På Jorder siden vises en liste over markene, delt opp i hvilke grupper de tilhører. 
                    Eksempler på grupper kan være Roksøya eller Hongfjord og de kan da inneholde flere marker.
                </Typography>

                <br />
                <Typography>
                    Hilsen Steinar, god jul!
                </Typography>
            </Box>
        </main>

    );
}