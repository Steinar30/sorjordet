import { render } from "@solidjs/testing-library";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { Router, Route } from "@solidjs/router";
import { FieldDetails } from "../fields/FieldDetails";
import styles from "../fields/FieldDetails.module.css";

describe("FieldDetails Component", () => {
  const mockResponse = (data: unknown): Response =>
    ({
      json: () => Promise.resolve(data),
      ok: true,
      status: 200,
    }) as Response;

  beforeEach(() => {
    vi.spyOn(global, "fetch").mockImplementation((url: string | URL | Request) => {
      const urlStr = url.toString();

      if (urlStr.includes("/api/farm_fields/42")) {
        return Promise.resolve(
          mockResponse({
            id: 42,
            name: "Nordjordet",
            map_polygon_string:
              '{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[0,0],[0,1],[1,1],[1,0],[0,0]]]}}',
            farm_id: 1,
            farm_field_group_id: 2,
          }),
        );
      }

      if (urlStr.includes("/api/farm_field_groups")) {
        return Promise.resolve(
          mockResponse([
            {
              id: 2,
              name: "Nordmarka",
              draw_color: "#00aa55",
              farm_id: 1,
            },
          ]),
        );
      }

      return Promise.resolve(mockResponse([]));
    });
  });

  it("renders without crashing and contains main element", () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const { container } = render(() => (
      <Router>
        <Route
          path="/"
          component={() => (
            <QueryClientProvider client={queryClient}>
              <FieldDetails fieldId={42} />
            </QueryClientProvider>
          )}
        />
      </Router>
    ));

    // Assert that the main element with styles is rendered
    const mainEl = container.querySelector("main");
    expect(mainEl).toBeInTheDocument();
    expect(mainEl).toHaveClass(styles.page);
  });
});
