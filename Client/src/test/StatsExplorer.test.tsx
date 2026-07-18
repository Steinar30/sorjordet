import { fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../maps/Map", () => ({
  getMapPolygonArea: (value: string) => Number(JSON.parse(value).areaM2 ?? -1),
}));

import StatsExplorer from "../stats/StatsExplorer";

const response = (data: unknown, ok = true) =>
  Promise.resolve({
    ok,
    json: () => Promise.resolve(data),
  } as Response);

const event = (
  id: number,
  year: number,
  fieldId: number,
  typeName: string,
  value: number,
  drynessRating: number | null,
) => ({
  id,
  value,
  time: `${year}-06-15T10:00:00.000Z`,
  field_id: fieldId,
  type_name: typeName,
  type_id: typeName === "Silage" ? 1 : 2,
  dryness_rating: drynessRating,
});

describe("StatsExplorer", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("surfaces leading segments, coverage, and year-over-year changes", async () => {
    const eventsByYear: Record<number, ReturnType<typeof event>[]> = {
      2025: [
        event(1, 2025, 10, "Silage", 20, 3),
        event(2, 2025, 10, "Silage", 10, null),
        event(3, 2025, 10, "Hay", 10, 4),
      ],
      2026: [event(4, 2026, 10, "Silage", 20, 3), event(5, 2026, 20, "Silage", 10, null)],
    };

    vi.spyOn(globalThis, "fetch").mockImplementation((input: string | URL | Request) => {
      const url = input.toString();
      if (url.includes("/api/farm_field_groups/meta")) {
        return response([
          {
            id: 1,
            farm_id: 1,
            name: "North",
            draw_color: "rgb(45, 90, 70)",
            fields: [{ id: 10, name: "North field", farm_id: 1 }],
          },
          {
            id: 2,
            farm_id: 1,
            name: "South",
            draw_color: "rgb(120, 140, 80)",
            fields: [{ id: 20, name: "South field", farm_id: 1 }],
          },
        ]);
      }
      if (url.includes("/api/farm_fields/all")) {
        return response([
          {
            id: 10,
            name: "North field",
            farm_id: 1,
            farm_field_group_id: 1,
            map_polygon_string: JSON.stringify({ areaM2: 2000 }),
          },
          {
            id: 20,
            name: "South field",
            farm_id: 1,
            farm_field_group_id: 2,
            map_polygon_string: JSON.stringify({}),
          },
        ]);
      }
      if (url.includes("/api/harvest_event")) {
        const year = Number(new URL(url, "http://localhost").searchParams.get("year"));
        return response({ params: {}, events: eventsByYear[year] ?? [] });
      }
      return response([]);
    });

    render(() => <StatsExplorer />);

    expect(await screen.findByText("North · Silage: 50")).toBeInTheDocument();
    expect(screen.getByText("3 events · 71% of the displayed total")).toBeInTheDocument();
    expect(screen.getByText("Dryness 60% · area 50%")).toBeInTheDocument();
    expect(screen.getByText("3/5 events rated · 1/2 fields mapped")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Explorer results" })).toBeInTheDocument();

    const yearPreset = screen.getByRole("button", { name: "Year-over-year groups" });
    expect(yearPreset).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(yearPreset);

    await waitFor(() => {
      expect(yearPreset).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByText("North: −20")).toBeInTheDocument();
      expect(screen.getByText("2025–2026 · -50%")).toBeInTheDocument();
    });
    expect(document.body).not.toHaveTextContent("Infinity");
    expect(document.body).not.toHaveTextContent("NaN");
  });

  it("shows a load error instead of an empty-data message", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input: string | URL | Request) => {
      if (input.toString().includes("/api/farm_fields/all")) {
        return response({}, false);
      }
      if (input.toString().includes("/api/harvest_event")) {
        return response({ params: {}, events: [] });
      }
      return response([]);
    });

    render(() => <StatsExplorer />);

    expect(
      await screen.findByText("Harvest data could not be loaded. Please try again."),
    ).toHaveAttribute("role", "alert");
    expect(screen.queryByText("No harvest data for this selection.")).not.toBeInTheDocument();
  });
});
