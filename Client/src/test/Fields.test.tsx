import { render, screen, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Router, Route } from "@solidjs/router";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import Fields from "../fields/Fields";

vi.mock("../requests", () => {
  return {
    getFarmFieldGroups: vi.fn().mockResolvedValue([
      {
        id: 1,
        name: "Nordmarka",
        draw_color: "#FF0000",
        farm_id: 1,
      },
      {
        id: 2,
        name: "Sørmarka",
        draw_color: "#00FF00",
        farm_id: 1,
      },
    ]),
    prepareAuth: vi.fn().mockReturnValue(null),
  };
});

describe("Fields Component", () => {
  const mockResponse = (data: unknown): Response =>
    ({
      json: () => Promise.resolve(data),
      ok: true,
      status: 200,
    }) as Response;

  const mockFields = [
    {
      id: 10,
      name: "Jordet A",
      map_polygon_string:
        '{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[0,0],[0,1],[1,1],[1,0],[0,0]]]}}',
      farm_field_group_id: 1,
    },
    {
      id: 11,
      name: "Eng B",
      map_polygon_string:
        '{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[0,0],[0,1],[1,1],[1,0],[0,0]]]}}',
      farm_field_group_id: 2,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(global, "fetch").mockResolvedValue(mockResponse(mockFields));
  });

  it("renders search field and skeleton initially, then renders fields table", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const { container } = render(() => (
      <QueryClientProvider client={queryClient}>
        <Router>
          <Route path="/" component={Fields} />
        </Router>
      </QueryClientProvider>
    ));

    const skeleton = container.querySelector(".MuiSkeleton-root");
    expect(skeleton).toBeInTheDocument();

    const rowA = await screen.findAllByRole("link", { name: "Jordet A" });
    const rowB = await screen.findAllByRole("link", { name: "Eng B" });

    expect(rowA.length).toBeGreaterThan(0);
    expect(rowB.length).toBeGreaterThan(0);
    expect(screen.getAllByText("Nordmarka").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sørmarka").length).toBeGreaterThan(0);
  });

  it("filters fields when search input is typed in", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    render(() => (
      <QueryClientProvider client={queryClient}>
        <Router>
          <Route path="/" component={Fields} />
        </Router>
      </QueryClientProvider>
    ));

    await screen.findAllByRole("link", { name: "Jordet A" });

    const searchInput = screen.getByLabelText("Search") as HTMLInputElement;

    fireEvent.input(searchInput, { target: { value: "Jordet" } });
    expect(screen.getAllByRole("link", { name: "Jordet A" }).length).toBeGreaterThan(0);
    expect(screen.queryAllByRole("link", { name: "Eng B" })).toHaveLength(0);

    fireEvent.input(searchInput, { target: { value: "Sør" } });
    expect(screen.queryAllByRole("link", { name: "Jordet A" })).toHaveLength(0);
    expect(screen.getAllByRole("link", { name: "Eng B" }).length).toBeGreaterThan(0);
  });
});
