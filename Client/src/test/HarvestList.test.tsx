import { render, screen, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import HarvestList from "../harvest/HarvestList";
import { set_jwt_token } from "../App";

// Mock date functions in Utils to be deterministic
vi.mock("../Utils", async () => {
  const actual = await vi.importActual<typeof import("../Utils")>("../Utils");
  return {
    ...actual,
    getYearRangeSinceYearToCurrent: () => [2022, 2023, 2024, 2025, 2026],
    formatDate: () => "24.05.2026",
  };
});

describe("HarvestList Component", () => {
  let queryClient: QueryClient;
  const mockResponse = (data: unknown): Response =>
    ({
      json: () => Promise.resolve(data),
      ok: true,
      status: 200,
    }) as Response;

  const mockMetaGroups = [
    {
      id: 1,
      name: "Nordmarka",
      fields: [
        { id: 10, name: "Jordet 1" },
        { id: 11, name: "Jordet 2" },
      ],
    },
  ];

  const mockHarvestEvents = {
    events: [
      {
        id: 100,
        value: "45 Bales",
        time: "2026-05-24T10:00:00Z",
        field_id: 10,
        type_name: "Gress",
      },
    ],
  };

  beforeEach(() => {
    set_jwt_token(null);
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    vi.spyOn(global, "fetch").mockImplementation((url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes("/api/farm_field_groups/meta")) {
        return Promise.resolve(mockResponse(mockMetaGroups));
      }
      if (urlStr.includes("/api/harvest_event")) {
        return Promise.resolve(mockResponse(mockHarvestEvents));
      }
      return Promise.resolve(mockResponse([]));
    });
  });

  it("shows You don't have access message when logged out", () => {
    render(() => (
      <QueryClientProvider client={queryClient}>
        <HarvestList />
      </QueryClientProvider>
    ));

    expect(screen.getByText("You don't have access to this page")).toBeInTheDocument();
  });

  it("renders list filters, harvest table, and logs when logged in", async () => {
    set_jwt_token("mock-token-admin");

    render(() => (
      <QueryClientProvider client={queryClient}>
        <HarvestList />
      </QueryClientProvider>
    ));

    // Check filters are rendered
    expect(screen.getByLabelText("Select year")).toBeInTheDocument();
    expect(screen.getByLabelText("Select group")).toBeInTheDocument();
    expect(screen.getByText("New Harvest")).toBeInTheDocument();

    // Check table headers
    expect(screen.getByText("Value")).toBeInTheDocument();
    expect(screen.getByText("Field")).toBeInTheDocument();
    expect(screen.getByText("Type")).toBeInTheDocument();

    // Check mocked harvest event loads in row
    const harvestVals = await screen.findAllByText("45 Bales");
    expect(harvestVals.length).toBeGreaterThan(0);

    // Verify it links the names correctly via meta groups lookup map
    expect(screen.getAllByText("Jordet 1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Nordmarka").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Gress").length).toBeGreaterThan(0);
  });

  it("shows form overlay when New Harvest button is clicked", async () => {
    set_jwt_token("mock-token-admin");

    render(() => (
      <QueryClientProvider client={queryClient}>
        <HarvestList />
      </QueryClientProvider>
    ));

    const newBtn = screen.getByText("New Harvest");
    fireEvent.click(newBtn);

    // Wait and verify dialog modal elements or close button appear
    const addBtn = await screen.findByText("Add");
    expect(addBtn).toBeInTheDocument();
  });
});
