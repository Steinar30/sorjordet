import FieldsList from "../fields/FieldsList";
import { Card } from "@suid/material";
import HarvestChart from "./HarvestChart";

import styles from "./Stats.module.css";
import GroupHarvestChart from "./GroupHarvestChart";

export default function Stats() {
  return (
    <main class={styles.wrappingContainer}>
      <Card class={styles.card} variant="outlined">
        <h2 style={{ "text-align": "center", "font-weight": "normal" }}>
          Fields
        </h2>
        <FieldsList maxItems={7} disableSearch />
      </Card>

      <Card class={styles.card} variant="outlined">
        <h2 style={{ "text-align": "center", "font-weight": "normal" }}>
          Harvests by year
        </h2>
        <HarvestChart />
      </Card>

      <Card class={styles.card} variant="outlined">
        <h2 style={{ "text-align": "center", "font-weight": "normal" }}>
          Harvests by field group
        </h2>
        <GroupHarvestChart />
      </Card>
    </main>
  );
}
