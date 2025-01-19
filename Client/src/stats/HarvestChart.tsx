import { createMemo, createResource, Show } from "solid-js";
import { SolidApexCharts } from "solid-apexcharts";
import { HarvestAggregated } from "../../bindings/HarvestAggregated";

export default function HarvestChart() {
  const [harvestsByYear] = createResource<HarvestAggregated[]>(() =>
    fetch("/api/harvest_event/aggregated_harvests").then((a) => a.json()),
  );

  const getAllDates = (x: HarvestAggregated[]) => {
    const dates: Set<string> = new Set();
    x.forEach(a => a.harvests.forEach(h => dates.add(h.date)))
    // Sort date strings numerically
    return Array.from(dates).sort((a, b) => {
      const [ay, am] = a.split("-", 2);
      const [by, bm] = b.split("-", 2);
      if (ay === by) {
        return Number(am) - Number(bm);
      } else {
        return Number(ay) - Number(by);
      }
    })
  }

  const alignSeriesToDates = (dates: string[], series: HarvestAggregated[]) => {
    return series.sort((a, b) => a.type_id - b.type_id).map((agg) => {
      return {
        name: agg.type_name,
        data: dates.map((date) =>
          agg.harvests.find(a => a.date == date)?.total ?? 0
        )
      }
    });
  }

  const dates = createMemo(() =>
    getAllDates(harvestsByYear() ?? []), [harvestsByYear]
  );
  const chartSeries = createMemo(() =>
    alignSeriesToDates(dates(), harvestsByYear() ?? []), [dates, harvestsByYear]
  );

  return (
    <Show when={harvestsByYear()}>
      <SolidApexCharts
        options={{
          chart: {
            type: "bar",
            height: 300,
          },
          dataLabels: {
            enabled: true,
          },
          xaxis: {
            categories: dates(),
          },
          yaxis: {
            title: {
              text: "Number of bales",
            },
          },
          fill: {
            opacity: 0.8,
          },
        }}
        series={chartSeries()}
        type="bar"
        width="100%"
        height="100%"
      />
    </Show>
  );
}
