import { createMemo, createResource, Show } from "solid-js";
import { SolidApexCharts } from "solid-apexcharts";
import { GroupHarvestAgg } from "../../bindings/GroupHarvestAgg";
import { rgbToHex } from "../Utils";
import { createQuery } from "@tanstack/solid-query";
import { FarmField } from "../../bindings/FarmField";
import { getMapPolygonArea } from "../maps/Map";

export default function BalesPerAreaChart() {
  const [harvestsByYear] = createResource<GroupHarvestAgg[]>(() =>
    fetch("/api/harvest_event/aggregated_group_harvests").then((a) => a.json()),
  );

  const fields = createQuery<FarmField[]>(() => ({
    queryKey: ["fields_all"],
    queryFn: () => fetch("/api/farm_fields/all").then((a) => a.json() as Promise<FarmField[]>),
  }));

  const groupArea = createMemo<Map<number, number>>(() => {
    // make mapping from groupId to 
    const m = fields.data?.reduce((acc, field) => {
      const groupId = field.farm_field_group_id;
      if (!groupId) return acc;

      const current = acc.get(groupId) ?? 0;
      acc.set(groupId, current + getMapPolygonArea(field.map_polygon_string) / 1000);
      return acc;
    }, new Map<number, number>());

    return m || new Map();
  });

  const chartSeries = createMemo(() => {
    if (!harvestsByYear()) {
      return [];
    }
    return [
      {
        name: "Bales",
        data: harvestsByYear()!.map((agg) => {
          const area = groupArea().get(agg.group_id);
          const y = area ? Number(agg.value) / area : 0;

          return ({
            x: agg.group_name,
            y: y.toPrecision(2),
            fillColor: rgbToHex(agg.group_color),
          })
        }
        ),
      },
    ];
  })

  return (
    <Show when={harvestsByYear()}>
      <SolidApexCharts
        options={{
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
              text: "Bales per Dekar",
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
