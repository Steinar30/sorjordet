import HarvestChart from "./HarvestChart";

import styles from "./Stats.module.css";
import GroupHarvestChart from "./GroupHarvestChart";
import BalesPerAreaChart from "./BalesPerAreaChart";
import GroupAreaChart from "./GroupAreaChart";

export default function Stats() {
  const charts = [
    {
      title: "Harvests by year",
      eyebrow: "Season timeline",
      chart: <HarvestChart />,
    },
    {
      title: "Harvests by field group",
      eyebrow: "Group totals",
      chart: <GroupHarvestChart />,
    },
    {
      title: "Bales / Dekar",
      eyebrow: "Yield density",
      chart: <BalesPerAreaChart />,
    },
    {
      title: "Dekar per Group",
      eyebrow: "Field coverage",
      chart: <GroupAreaChart />,
      wide: true,
    },
  ];

  return (
    <main class={styles.page}>
      <section class={styles.hero}>
        <p class={styles.eyebrow}>Farm analytics</p>
        <h1>Harvest overview</h1>
      </section>

      <section class={styles.chartGrid} aria-label="Farm statistics charts">
        {charts.map((item) => (
          <article class={`${styles.card} ${item.wide ? styles.wideCard : ""}`}>
            <div class={styles.cardHeader}>
              <p>{item.eyebrow}</p>
              <h2>{item.title}</h2>
            </div>
            <div class={styles.chartFrame}>{item.chart}</div>
          </article>
        ))}
      </section>
    </main>
  );
}
