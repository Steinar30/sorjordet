import { Button } from "@suid/material";
import { A } from "@solidjs/router";
import ArrowBackIcon from "@suid/icons-material/ArrowBack";
import StatsExplorer from "./StatsExplorer";
import styles from "./Stats.module.css";

export default function StatsExplorerPage() {
  return (
    <main class={styles.page}>
      <section class={`${styles.hero} ${styles.heroWithActions}`}>
        <div>
          <p class={styles.eyebrow}>Interactive analysis</p>
          <h1>Harvest explorer</h1>
        </div>
        <Button component={A} href="/stats" variant="outlined" startIcon={<ArrowBackIcon />}>
          Back to stats
        </Button>
      </section>

      <section class={styles.explorerPageCard}>
        <StatsExplorer />
      </section>
    </main>
  );
}
