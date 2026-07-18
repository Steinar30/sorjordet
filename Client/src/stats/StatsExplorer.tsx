import { createMemo, createResource, createSignal, For, Show } from "solid-js";
import { Button, FormControl, InputLabel, MenuItem, Select } from "@suid/material";
import { SolidApexCharts } from "solid-apexcharts";
import { HarvestEvent } from "../../bindings/HarvestEvent";
import { HarvestPagination } from "../../bindings/HarvestPagination";
import { FarmFieldGroupMeta } from "../../bindings/FarmFieldGroupMeta";
import { FarmField } from "../../bindings/FarmField";
import { getMapPolygonArea } from "../maps/Map";
import { getYearRangeSinceYearToCurrent, rgbToHex } from "../Utils";
import styles from "./Stats.module.css";

type DimensionKey = "year" | "month" | "group_name" | "field_name" | "type_name" | "dryness_label";
type CompareKey = "none" | DimensionKey;
type MetricKey = "bales" | "events" | "average_bales" | "average_dryness" | "bales_per_dekar";

type ExplorerRow = {
  field_id: number;
  value: number;
  area_dekar: number | null;
  year: number;
  month: string;
  group_name: string;
  group_color: string;
  field_name: string;
  type_name: string;
  dryness_label: string;
  dryness_value: number | null;
};

type SummaryRow = {
  group: string;
  compare: string;
  value: number;
  count: number;
};

type ExplorerPreset = {
  label: string;
  metric: MetricKey;
  groupBy: DimensionKey;
  compareBy: CompareKey;
};

type ExplorerInsight = {
  eyebrow: string;
  title: string;
  detail: string;
};

const years = getYearRangeSinceYearToCurrent(2022);
const pageSize = 500;

const dimensions: { key: DimensionKey; label: string }[] = [
  { key: "year", label: "Year" },
  { key: "month", label: "Month" },
  { key: "group_name", label: "Group" },
  { key: "field_name", label: "Field" },
  { key: "type_name", label: "Harvest type" },
  { key: "dryness_label", label: "Dryness" },
];

const metrics: { key: MetricKey; label: string; axis: string }[] = [
  { key: "bales", label: "Total bales", axis: "Bales" },
  { key: "events", label: "Event count", axis: "Events" },
  { key: "average_bales", label: "Average bales / event", axis: "Bales / event" },
  { key: "average_dryness", label: "Average dryness", axis: "Dryness rating" },
  { key: "bales_per_dekar", label: "Bales / dekar", axis: "Bales / dekar" },
];

const presets: ExplorerPreset[] = [
  {
    label: "Group production",
    metric: "bales",
    groupBy: "group_name",
    compareBy: "type_name",
  },
  {
    label: "Monthly bales",
    metric: "bales",
    groupBy: "month",
    compareBy: "type_name",
  },
  {
    label: "Yearly mix",
    metric: "bales",
    groupBy: "year",
    compareBy: "type_name",
  },
  {
    label: "Year-over-year groups",
    metric: "bales",
    groupBy: "group_name",
    compareBy: "year",
  },
  {
    label: "Year-over-year fields",
    metric: "bales",
    groupBy: "field_name",
    compareBy: "year",
  },
  {
    label: "Yield density",
    metric: "bales_per_dekar",
    groupBy: "group_name",
    compareBy: "type_name",
  },
  {
    label: "Bales / event",
    metric: "average_bales",
    groupBy: "group_name",
    compareBy: "type_name",
  },
  {
    label: "Dryness trend",
    metric: "average_dryness",
    groupBy: "month",
    compareBy: "type_name",
  },
  {
    label: "Dryness coverage",
    metric: "events",
    groupBy: "group_name",
    compareBy: "dryness_label",
  },
  {
    label: "Output by dryness",
    metric: "bales",
    groupBy: "dryness_label",
    compareBy: "type_name",
  },
];

function drynessLabel(rating: number | null) {
  switch (rating) {
    case 1:
      return "1 / Very wet";
    case 2:
      return "2 / Wet";
    case 3:
      return "3 / Average";
    case 4:
      return "4 / Dry";
    case 5:
      return "5 / Very dry";
    default:
      return "Unset";
  }
}

async function fetchHarvestYear(year: number) {
  const events: HarvestEvent[] = [];
  let page = 1;

  while (true) {
    const response = await fetch(
      `/api/harvest_event?page_size=${pageSize}&page=${page}&year=${year}`,
    );
    if (!response.ok) {
      throw new Error(`Could not load harvest events for ${year}`);
    }
    const data = (await response.json()) as HarvestPagination;
    events.push(...data.events);

    if (data.events.length < pageSize) {
      break;
    }
    page += 1;
  }

  return events;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load ${url}`);
  }
  return response.json() as Promise<T>;
}

function formatValue(value: number, metric: MetricKey) {
  if (!Number.isFinite(value)) {
    return "-";
  }
  if (metric === "events" || metric === "bales") {
    return Math.round(value).toLocaleString("nb-NO");
  }
  return value.toLocaleString("nb-NO", {
    maximumFractionDigits: 2,
  });
}

function getDimensionValue(row: ExplorerRow, dimension: DimensionKey) {
  return String(row[dimension] ?? "-");
}

export default function StatsExplorer() {
  const [fromYear, setFromYear] = createSignal(years[Math.max(0, years.length - 2)]);
  const [toYear, setToYear] = createSignal(years[years.length - 1]);
  const [metric, setMetric] = createSignal<MetricKey>("bales");
  const [groupBy, setGroupBy] = createSignal<DimensionKey>("group_name");
  const [compareBy, setCompareBy] = createSignal<CompareKey>("type_name");

  const effectiveCompare = createMemo<CompareKey>(() =>
    compareBy() === groupBy() ? "none" : compareBy(),
  );

  const activePreset = createMemo(() =>
    presets.find(
      (preset) =>
        preset.metric === metric() &&
        preset.groupBy === groupBy() &&
        preset.compareBy === effectiveCompare(),
    ),
  );

  const applyPreset = (preset: ExplorerPreset) => {
    setMetric(preset.metric);
    setGroupBy(preset.groupBy);
    setCompareBy(preset.compareBy);
  };

  const selectedYears = createMemo(() =>
    years.filter(
      (year) => year >= Math.min(fromYear(), toYear()) && year <= Math.max(fromYear(), toYear()),
    ),
  );

  const [groups] = createResource<FarmFieldGroupMeta[]>(() =>
    fetchJson("/api/farm_field_groups/meta"),
  );

  const [fields] = createResource<FarmField[]>(() => fetchJson("/api/farm_fields/all"));

  const [harvestEvents] = createResource(selectedYears, async (range) =>
    (await Promise.all(range.map(fetchHarvestYear))).flat(),
  );

  const rows = createMemo<ExplorerRow[]>(() => {
    if (groups.error || fields.error || harvestEvents.error) {
      return [];
    }
    const groupData = groups();
    const events = harvestEvents();
    if (!groupData || !events) {
      return [];
    }

    const fieldLookup = new Map<
      number,
      {
        fieldName: string;
        groupName: string;
        groupColor: string;
      }
    >();
    const fieldAreaLookup = new Map<number, number>();

    fields()?.forEach((field) => {
      const area = getMapPolygonArea(field.map_polygon_string) / 1000;
      if (area > 0) {
        fieldAreaLookup.set(field.id, area);
      }
    });

    groupData.forEach((group) => {
      group.fields.forEach((field) => {
        fieldLookup.set(field.id, {
          fieldName: field.name,
          groupName: group.name,
          groupColor: rgbToHex(group.draw_color),
        });
      });
    });

    return events.map((event) => {
      const time = new Date(event.time);
      const field = fieldLookup.get(event.field_id);
      return {
        field_id: event.field_id,
        value: event.value,
        area_dekar: fieldAreaLookup.get(event.field_id) ?? null,
        year: time.getFullYear(),
        month: `${time.getFullYear()}-${String(time.getMonth() + 1).padStart(2, "0")}`,
        group_name: field?.groupName ?? "Unknown group",
        group_color: field?.groupColor ?? "#6b7f76",
        field_name: field?.fieldName ?? `Field ${event.field_id}`,
        type_name: event.type_name,
        dryness_label: drynessLabel(event.dryness_rating),
        dryness_value: event.dryness_rating,
      };
    });
  });

  const summaryRows = createMemo<SummaryRow[]>(() => {
    const data = rows();
    if (data.length === 0) {
      return [];
    }

    const compare = effectiveCompare();
    const keys = compare === "none" ? [groupBy()] : [groupBy(), compare];
    const currentMetric = metric();

    if (currentMetric === "bales_per_dekar") {
      const buckets = new Map<
        string,
        {
          group: string;
          compare: string;
          value: number;
          count: number;
          fieldAreas: Map<number, number>;
        }
      >();

      data.forEach((row) => {
        const group = getDimensionValue(row, groupBy());
        const comparison =
          compare === "none"
            ? (metrics.find((entry) => entry.key === currentMetric)?.label ?? "Value")
            : getDimensionValue(row, compare);
        const key = JSON.stringify([group, comparison]);
        const bucket = buckets.get(key) ?? {
          group,
          compare: comparison,
          value: 0,
          count: 0,
          fieldAreas: new Map<number, number>(),
        };

        bucket.value += row.value;
        bucket.count += 1;
        if (row.area_dekar != null) {
          bucket.fieldAreas.set(row.field_id, row.area_dekar);
        }
        buckets.set(key, bucket);
      });

      return Array.from(buckets.values())
        .map((bucket) => {
          const area = Array.from(bucket.fieldAreas.values()).reduce(
            (sum, value) => sum + value,
            0,
          );
          return {
            group: bucket.group,
            compare: bucket.compare,
            value: area > 0 ? bucket.value / area : Number.NaN,
            count: bucket.count,
          };
        })
        .filter((row) => Number.isFinite(row.value))
        .sort((a, b) => b.value - a.value);
    }

    const buckets = new Map<
      string,
      { group: string; compare: string; total: number; count: number; metricCount: number }
    >();

    data.forEach((row) => {
      const group = getDimensionValue(row, groupBy());
      const comparison =
        compare === "none"
          ? (metrics.find((entry) => entry.key === currentMetric)?.label ?? "Value")
          : getDimensionValue(row, compare);
      const key = JSON.stringify(keys.map((dimension) => getDimensionValue(row, dimension)));
      const bucket = buckets.get(key) ?? {
        group,
        compare: comparison,
        total: 0,
        count: 0,
        metricCount: 0,
      };

      bucket.count += 1;
      if (currentMetric === "average_dryness") {
        if (row.dryness_value != null) {
          bucket.total += row.dryness_value;
          bucket.metricCount += 1;
        }
      } else {
        bucket.total += currentMetric === "events" ? 1 : row.value;
        bucket.metricCount += 1;
      }
      buckets.set(key, bucket);
    });

    return Array.from(buckets.values())
      .map((bucket) => ({
        group: bucket.group,
        compare: bucket.compare,
        value:
          currentMetric === "average_bales" || currentMetric === "average_dryness"
            ? bucket.total / bucket.metricCount
            : bucket.total,
        count: bucket.count,
      }))
      .filter((row) => Number.isFinite(row.value))
      .sort((a, b) => b.value - a.value);
  });

  const insights = createMemo<ExplorerInsight[]>(() => {
    const data = rows();
    const summaries = summaryRows();
    if (data.length === 0 || summaries.length === 0) {
      return [];
    }

    const cards: ExplorerInsight[] = [];
    const leader = summaries[0];
    const leaderLabel =
      effectiveCompare() === "none" ? leader.group : `${leader.group} · ${leader.compare}`;
    const isAdditive = metric() === "bales" || metric() === "events";
    const total = summaries.reduce((sum, row) => sum + row.value, 0);
    const share = isAdditive && total > 0 ? Math.round((leader.value / total) * 100) : null;

    cards.push({
      eyebrow: "Leading segment",
      title: `${leaderLabel}: ${formatValue(leader.value, metric())}`,
      detail: `${leader.count} ${leader.count === 1 ? "event" : "events"}${
        share == null ? "" : ` · ${share}% of the displayed total`
      }`,
    });

    if (effectiveCompare() === "year" && isAdditive) {
      const changes = new Map<string, SummaryRow[]>();
      summaries.forEach((row) => {
        const entries = changes.get(row.group) ?? [];
        entries.push(row);
        changes.set(row.group, entries);
      });
      const movers = Array.from(changes.entries())
        .map(([group, entries]) => {
          const ordered = entries.sort((a, b) => Number(a.compare) - Number(b.compare));
          const first = ordered[0];
          const last = ordered[ordered.length - 1];
          if (ordered.length < 2 || first.value === 0) {
            return null;
          }
          return {
            group,
            first,
            last,
            percent: ((last.value - first.value) / first.value) * 100,
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry != null)
        .sort((a, b) => Math.abs(b.percent) - Math.abs(a.percent));
      const mover = movers[0];
      if (mover) {
        const delta = mover.last.value - mover.first.value;
        cards.push({
          eyebrow: "Biggest year-over-year move",
          title: `${mover.group}: ${delta >= 0 ? "+" : ""}${formatValue(delta, metric())}`,
          detail: `${mover.first.compare}–${mover.last.compare} · ${
            mover.percent >= 0 ? "+" : ""
          }${Math.round(mover.percent)}%`,
        });
      }
    } else {
      const totalBales = data.reduce((sum, row) => sum + row.value, 0);
      const fieldCount = new Set(data.map((row) => row.field_id)).size;
      cards.push({
        eyebrow: "Selection",
        title: `${formatValue(totalBales, "bales")} bales across ${data.length} events`,
        detail: `${fieldCount} ${fieldCount === 1 ? "field" : "fields"} in the selected period`,
      });
    }

    const ratedEvents = data.filter((row) => row.dryness_value != null).length;
    const harvestedFieldIds = new Set(data.map((row) => row.field_id));
    const fieldsWithArea = new Set(
      data.filter((row) => row.area_dekar != null).map((row) => row.field_id),
    ).size;
    const drynessCoverage = Math.round((ratedEvents / data.length) * 100);
    const areaCoverage = Math.round((fieldsWithArea / harvestedFieldIds.size) * 100);
    cards.push({
      eyebrow: "Data coverage",
      title: `Dryness ${drynessCoverage}% · area ${areaCoverage}%`,
      detail: `${ratedEvents}/${data.length} events rated · ${fieldsWithArea}/${harvestedFieldIds.size} fields mapped`,
    });

    return cards;
  });

  const categories = createMemo(() =>
    Array.from(new Set(summaryRows().map((row) => row.group))).sort(),
  );

  const chartSeries = createMemo(() => {
    const compare = effectiveCompare();
    const rows = summaryRows();

    if (compare === "none") {
      return [
        {
          name: metrics.find((entry) => entry.key === metric())?.label ?? "Value",
          data: categories().map(
            (category) => rows.find((row) => row.group === category)?.value ?? 0,
          ),
        },
      ];
    }

    const compareValues = Array.from(new Set(rows.map((row) => row.compare))).sort();
    return compareValues.map((compareValue) => ({
      name: compareValue,
      data: categories().map(
        (category) =>
          rows.find((row) => row.group === category && row.compare === compareValue)?.value ?? 0,
      ),
    }));
  });

  const metricMeta = createMemo(
    () => metrics.find((entry) => entry.key === metric()) ?? metrics[0],
  );

  return (
    <div class={styles.explorer}>
      <div class={styles.explorerPresets} aria-label="Chart presets">
        <For each={presets}>
          {(preset) => (
            <Button
              size="small"
              variant={activePreset()?.label === preset.label ? "contained" : "outlined"}
              class={styles.explorerPresetButton}
              aria-pressed={activePreset()?.label === preset.label}
              onClick={() => applyPreset(preset)}
            >
              {preset.label}
            </Button>
          )}
        </For>
      </div>

      <div class={styles.explorerControls}>
        <FormControl size="small" class={styles.explorerControl}>
          <InputLabel shrink id="stats-from-year">
            From
          </InputLabel>
          <Select
            labelId="stats-from-year"
            label="From"
            value={fromYear().toString()}
            notched
            onChange={(event) => setFromYear(Number(event.target.value))}
          >
            <For each={years}>{(year) => <MenuItem value={year}>{year}</MenuItem>}</For>
          </Select>
        </FormControl>

        <FormControl size="small" class={styles.explorerControl}>
          <InputLabel shrink id="stats-to-year">
            To
          </InputLabel>
          <Select
            labelId="stats-to-year"
            label="To"
            value={toYear().toString()}
            notched
            onChange={(event) => setToYear(Number(event.target.value))}
          >
            <For each={years}>{(year) => <MenuItem value={year}>{year}</MenuItem>}</For>
          </Select>
        </FormControl>

        <FormControl size="small" class={styles.explorerControlWide}>
          <InputLabel shrink id="stats-metric">
            Metric
          </InputLabel>
          <Select
            labelId="stats-metric"
            label="Metric"
            value={metric()}
            notched
            onChange={(event) => setMetric(event.target.value as MetricKey)}
          >
            <For each={metrics}>
              {(entry) => <MenuItem value={entry.key}>{entry.label}</MenuItem>}
            </For>
          </Select>
        </FormControl>

        <FormControl size="small" class={styles.explorerControlWide}>
          <InputLabel shrink id="stats-group-by">
            Group by
          </InputLabel>
          <Select
            labelId="stats-group-by"
            label="Group by"
            value={groupBy()}
            notched
            onChange={(event) => setGroupBy(event.target.value as DimensionKey)}
          >
            <For each={dimensions}>
              {(entry) => <MenuItem value={entry.key}>{entry.label}</MenuItem>}
            </For>
          </Select>
        </FormControl>

        <FormControl size="small" class={styles.explorerControlWide}>
          <InputLabel shrink id="stats-compare-by">
            Compare
          </InputLabel>
          <Select
            labelId="stats-compare-by"
            label="Compare"
            value={effectiveCompare()}
            notched
            onChange={(event) => setCompareBy(event.target.value as CompareKey)}
          >
            <MenuItem value="none">No comparison</MenuItem>
            <For each={dimensions.filter((entry) => entry.key !== groupBy())}>
              {(entry) => <MenuItem value={entry.key}>{entry.label}</MenuItem>}
            </For>
          </Select>
        </FormControl>
      </div>

      <Show when={insights().length > 0}>
        <section class={styles.explorerInsights} aria-label="Insights for the current selection">
          <For each={insights()}>
            {(insight) => (
              <article class={styles.explorerInsightCard}>
                <p>{insight.eyebrow}</p>
                <strong>{insight.title}</strong>
                <span>{insight.detail}</span>
              </article>
            )}
          </For>
        </section>
      </Show>

      <div class={styles.explorerBody}>
        <div
          class={styles.explorerChart}
          role="img"
          aria-label={`${metricMeta().label} grouped by ${
            dimensions.find((entry) => entry.key === groupBy())?.label ?? groupBy()
          }`}
        >
          <Show
            when={!harvestEvents.loading && !groups.loading && !fields.loading}
            fallback={
              <p class={styles.explorerEmpty} role="status">
                Loading harvest data...
              </p>
            }
          >
            <Show
              when={!harvestEvents.error && !groups.error && !fields.error}
              fallback={
                <p class={styles.explorerEmpty} role="alert">
                  Harvest data could not be loaded. Please try again.
                </p>
              }
            >
              <Show
                when={summaryRows().length > 0}
                fallback={<p class={styles.explorerEmpty}>No harvest data for this selection.</p>}
              >
                <SolidApexCharts
                  options={{
                    chart: {
                      type: "bar",
                      stacked:
                        effectiveCompare() !== "none" &&
                        (metric() === "bales" || metric() === "events"),
                      toolbar: {
                        show: true,
                      },
                    },
                    plotOptions: {
                      bar: {
                        horizontal: groupBy() === "field_name" || groupBy() === "group_name",
                      },
                    },
                    dataLabels: {
                      enabled: false,
                    },
                    xaxis: {
                      categories: categories(),
                    },
                    yaxis: {
                      title: {
                        text: metricMeta().axis,
                      },
                    },
                    fill: {
                      opacity: 0.86,
                    },
                    legend: {
                      position: "top",
                    },
                  }}
                  series={chartSeries()}
                  type="bar"
                  width="100%"
                  height="100%"
                />
              </Show>
            </Show>
          </Show>
        </div>

        <div class={styles.explorerTableWrap}>
          <table class={styles.explorerTable} aria-label="Explorer results">
            <caption>Top 12 results for the current selection</caption>
            <thead>
              <tr>
                <th>{dimensions.find((entry) => entry.key === groupBy())?.label}</th>
                <th>
                  {effectiveCompare() === "none"
                    ? "Metric"
                    : dimensions.find((entry) => entry.key === effectiveCompare())?.label}
                </th>
                <th>{metricMeta().label}</th>
                <th>Events</th>
              </tr>
            </thead>
            <tbody>
              <For each={summaryRows().slice(0, 12)}>
                {(row) => (
                  <tr>
                    <td>{row.group}</td>
                    <td>{row.compare}</td>
                    <td>{formatValue(row.value, metric())}</td>
                    <td>{row.count}</td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
