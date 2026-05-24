import { render, screen } from "@solidjs/testing-library";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { Router, Route } from "@solidjs/router";
import Stats from "../stats/Stats";

// Mock requests module
vi.mock("../requests", () => {
  return {
    getFarmFieldGroups: vi.fn().mockResolvedValue([
      {
        id: 1,
        name: "Nordmarka",
        draw_color: "#FF0000",
        farm_id: 1,
      },
    ]),
    prepareAuth: vi.fn().mockReturnValue(null),
  };
});

describe("Stats Component", () => {
  let queryClient: QueryClient;
  const mockResponse = (data: unknown): Response =>
    ({
      json: () => Promise.resolve(data),
      ok: true,
      status: 200,
    }) as Response;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    vi.spyOn(global, "fetch").mockImplementation((url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes("/api/farm_fields/all")) {
        return Promise.resolve(
          mockResponse([
            {
              id: 10,
              name: "Jordet 1",
              map_polygon_string: `{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[0,0],[0,1],[1,1],[1,0],[0,0]]]}}`,
              farm_field_group_id: 1,
            },
          ]),
        );
      }
      if (urlStr.includes("/api/harvest_event/aggregated_group_harvests")) {
        return Promise.resolve(
          mockResponse([
            {
              group_id: 1,
              group_name: "Nordmarka",
              group_color: "rgb(255, 0, 0)",
              value: 150,
            },
          ]),
        );
      }
      if (urlStr.includes("/api/harvest_event/aggregated_harvests")) {
        return Promise.resolve(
          mockResponse([
            {
              type_id: 1,
              type_name: "Gress",
              harvests: [
                {
                  date: "2026-05",
                  total: 300,
                },
              ],
            },
          ]),
        );
      }
      if (urlStr.includes("/api/farm_field_groups")) {
        return Promise.resolve(
          mockResponse([
            {
              id: 1,
              name: "Nordmarka",
              draw_color: "#FF0000",
              farm_id: 1,
            },
          ]),
        );
      }
      return Promise.resolve(mockResponse([]));
    });
  });

  it("renders all card titles and mocked charts", async () => {
    render(() => (
      <Router>
        <Route
          path="/"
          component={() => (
            <QueryClientProvider client={queryClient}>
              <Stats />
            </QueryClientProvider>
          )}
        />
      </Router>
    ));

    // Assert that the container header cards render properly
    expect(screen.getByRole("heading", { name: "Fields" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Harvests by year" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Harvests by field group" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Bales / Dekar" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Dekar per Group" })).toBeInTheDocument();

    // Verify mocked ApexCharts render on screen
    const charts = await screen.findAllByTestId("mock-apexchart");
    expect(charts.length).toBeGreaterThanOrEqual(3);
  });
});
