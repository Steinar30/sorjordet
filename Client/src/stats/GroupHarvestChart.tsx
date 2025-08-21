import { createMemo, createResource, Show } from "solid-js";
import { SolidApexCharts } from "solid-apexcharts";
import { GroupHarvestAgg } from "../../bindings/GroupHarvestAgg";
import { rgbToHex } from "../Utils";

export default function GroupHarvestChart() {
  const [harvestsByYear] = createResource<GroupHarvestAgg[]>(() =>
    fetch("/api/harvest_event/aggregated_group_harvests").then((a) => a.json()),
  );

  const chartSeries = createMemo(() => {
    if (!harvestsByYear()) {
      return [];
    }
    return [
      {
        name: "Bales",        
        data: harvestsByYear()!.map((agg) => ({
          x: agg.group_name,
          y: agg.value,
          fillColor: rgbToHex(agg.group_color),
        })),
      },
    ];
  })

  return (
    <Show when={harvestsByYear()}>
      <SolidApexCharts
        options={{
          dataLabels: {
            style: {
              colors: ["#333"],              
            }
          },
          plotOptions: {
            bar: {
              horizontal: false,
            },
          },
          chart: {
            type: "bar",
            height: 350,
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
        vertical
        width="100%"
        height="100%"
      />
    </Show>
  );
}
