import FieldsList from "../fields/FieldsList";
import { Card } from "@suid/material";
import HarvestChart from "./HarvestChart";

import styles from "./Stats.module.css";
import GroupHarvestChart from "./GroupHarvestChart";
import BalesPerAreaChart from "./BalesPerAreaChart";
import GroupAreaChart from "./GroupAreaChart";

export default function Stats() {
  return (
    <main class={styles.wrappingContainer}>
      <Card style={{overflow: "auto"}} class={styles.card} variant="outlined">
        <h2 style={{ "text-align": "center", "font-weight": "normal" }}>
          Fields
        </h2>
        <FieldsList disableSearch />
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
      <Card class={styles.card} variant="outlined">
        <h2 style={{ "text-align": "center", "font-weight": "normal" }}>
          Bales / Dekar
        </h2>
        <BalesPerAreaChart />
      </Card>
      <Card class={styles.card} style={{ height: "500px" }} variant="outlined">
        <h2 style={{ "text-align": "center", "font-weight": "normal" }}>
          Dekar per Group
        </h2>
        <GroupAreaChart />
      </Card>
    </main>
  );
}
