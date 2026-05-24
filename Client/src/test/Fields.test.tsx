import { render, screen, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Router, Route } from "@solidjs/router";
import Fields from "../fields/Fields";

// Mock the requests module
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
      map_polygon_string: `{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[0,0],[0,1],[1,1],[1,0],[0,0]]]}}`,
      farm_field_group_id: 1,
    },
    {
      id: 11,
      name: "Eng B",
      map_polygon_string: `{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[0,0],[0,1],[1,1],[1,0],[0,0]]]}}`,
      farm_field_group_id: 2,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Intercept standard fetch for fields list
    vi.spyOn(global, "fetch").mockResolvedValue(mockResponse(mockFields));
  });

  it("renders search field and skeleton initially, then renders fields table", async () => {
    const { container } = render(() => (
      <Router>
        <Route path="/" component={Fields} />
      </Router>
    ));

    // Skeleton loader should be visible first
    const skeleton = container.querySelector(".MuiSkeleton-root");
    expect(skeleton).toBeInTheDocument();

    // Table rows should appear after resolving requests
    const rowA = await screen.findByText("Jordet A");
    const rowB = await screen.findByText("Eng B");

    expect(rowA).toBeInTheDocument();
    expect(rowB).toBeInTheDocument();

    // Check that group names are correctly linked from groups mock
    expect(screen.getByText("Nordmarka")).toBeInTheDocument();
    expect(screen.getByText("Sørmarka")).toBeInTheDocument();
  });

  it("filters fields when search input is typed in", async () => {
    render(() => (
      <Router>
        <Route path="/" component={Fields} />
      </Router>
    ));

    // Wait for the fields to render
    await screen.findByText("Jordet A");

    const searchInput = screen.getByLabelText("Search") as HTMLInputElement;

    // Filter by "Jordet"
    fireEvent.input(searchInput, { target: { value: "Jordet" } });
    expect(screen.getByText("Jordet A")).toBeInTheDocument();
    expect(screen.queryByText("Eng B")).not.toBeInTheDocument();

    // Filter by group name "Sør"
    fireEvent.input(searchInput, { target: { value: "Sør" } });
    expect(screen.queryByText("Jordet A")).not.toBeInTheDocument();
    expect(screen.getByText("Eng B")).toBeInTheDocument();
  });
});
