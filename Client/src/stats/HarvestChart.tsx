import { createResource, Show } from "solid-js";
import { SolidApexCharts } from "solid-apexcharts";
import { HarvestAggregated } from "../../bindings/HarvestAggregated";

export default function HarvestChart() {
  const [harvestsByYear] = createResource<HarvestAggregated[]>(() =>
    fetch("/api/harvest_event/aggregated_harvests").then((a) => a.json()),
  );
  return (
    <Show when={harvestsByYear()}>
      {(harvestsByYear) => (
        <SolidApexCharts
          options={{
            chart: {
              type: "bar",
              height: 300,
            },
            dataLabels: {
              enabled: false,
            },
            xaxis: {
              categories: harvestsByYear()[0].harvests.map((h) => h.date),
            },
            yaxis: {
              title: {
                text: "Total Bales",
              },
            },
            fill: {
              opacity: 0.8,
            },
          }}
          series={harvestsByYear().map((h) => ({
            name: h.type_name,
            data: h.harvests.map((h) => h.total),
          }))}
          type="bar"
          width="100%"
          height="100%"
        />
      )}
    </Show>
  );
}
