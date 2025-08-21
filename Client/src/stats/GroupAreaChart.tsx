import { createMemo, Show } from "solid-js";
import { SolidApexCharts } from "solid-apexcharts";
import { rgbToHex } from "../Utils";
import { createQuery } from "@tanstack/solid-query";
import { FarmField } from "../../bindings/FarmField";
import { getMapPolygonArea } from "../maps/Map";
import { FarmFieldGroupMeta } from "../../bindings/FarmFieldGroupMeta";

export default function GroupAreaChart() {

  const fields = createQuery<FarmField[]>(() => ({
    queryKey: ["fields_all"],
    queryFn: () => fetch("/api/farm_fields/all").then((a) => a.json() as Promise<FarmField[]>),
  }));

  const groups = createQuery<FarmFieldGroupMeta[]>(() => ({
    queryKey: ["field_groups"],
    queryFn: () => fetch("/api/farm_field_groups/meta").then((a) => a.json()),
  }));

  const chartSeries = createMemo(() => {
    if (!fields.data || !groups.data) {
      return [];
    }

    const m = fields.data.reduce((acc, field) => {
      const groupId = field.farm_field_group_id;
      if (!groupId) return acc;

      const current = acc.get(groupId) ?? 0;
      acc.set(groupId, current + getMapPolygonArea(field.map_polygon_string) / 1000);
      return acc;
    }, new Map<number, number>());

    return [
      {
        name: "Dekar",
        data: groups.data.map(group => {
          const area = m.get(group.id) ?? 0;
          return ({
            x: group.name,
            y: area.toFixed(2),
            fillColor: rgbToHex(group.draw_color),
          })
        }),
      },
    ];
  })

  return (
    <Show when={fields.data && groups.data}>
      <SolidApexCharts
        options={{
          dataLabels: {
            style: {
              colors: ["#333"],
            }
          },
          plotOptions: {
            bar: {
              horizontal: true,
            },
          },
          chart: {
            type: "bar",
            height: 400,
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
