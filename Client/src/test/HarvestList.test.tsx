import { render, screen, fireEvent, within } from "@solidjs/testing-library";
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
        { id: 12, name: "Jordet 3" },
      ],
    },
  ];

  const mockHarvestEvents = {
    events: [
      {
        id: 100,
        value: 45,
        time: "2026-05-24T10:00:00Z",
        field_id: 10,
        type_name: "Gress",
        type_id: 1,
        dryness_rating: null,
      },
      {
        id: 101,
        value: 30,
        time: "2026-06-24T10:00:00Z",
        field_id: 10,
        type_name: "Gress",
        type_id: 1,
        dryness_rating: 2,
      },
      {
        id: 102,
        value: 25,
        time: "2026-07-24T10:00:00Z",
        field_id: 11,
        type_name: "Gress",
        type_id: 1,
        dryness_rating: 3,
      },
    ],
  };

  const findDialogByTitle = async (title: string) => {
    const titleElement = await screen.findByText(title);
    const dialog = titleElement.closest<HTMLElement>('[role="dialog"]');
    if (!dialog) {
      throw new Error(`Could not find dialog containing "${title}"`);
    }
    return dialog;
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

    vi.spyOn(globalThis, "fetch").mockImplementation((url: string | URL | Request) => {
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
    const harvestVals = await screen.findAllByText("45");
    expect(harvestVals.length).toBeGreaterThan(0);

    // Verify it links the names correctly via meta groups lookup map
    expect(screen.getAllByText("Jordet 1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Nordmarka").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Gress").length).toBeGreaterThan(0);

    const summary = await screen.findByRole("region", { name: "Harvest summary for 2026" });
    expect(within(summary).getByText("100")).toBeInTheDocument();
    expect(within(summary).getByText("2 / 3")).toBeInTheDocument();
    expect(within(summary).getByText("1 / 3")).toBeInTheDocument();
    expect(within(summary).getByText("1 field without a harvest")).toBeInTheDocument();
  });

  it("lists fields missing their first harvest and starts a preselected harvest", async () => {
    set_jwt_token("mock-token-admin");

    render(() => (
      <QueryClientProvider client={queryClient}>
        <HarvestList />
      </QueryClientProvider>
    ));

    const summary = await screen.findByRole("region", { name: "Harvest summary for 2026" });
    await within(summary).findByText("1 field without a harvest");
    fireEvent.click(within(summary).getByRole("button", { name: /At least one harvest/i }));

    const targetDialog = await findDialogByTitle("Fields without a first harvest");
    expect(await within(targetDialog).findByText("Jordet 3")).toBeInTheDocument();
    expect(within(targetDialog).queryByText("Jordet 1")).not.toBeInTheDocument();
    expect(within(targetDialog).queryByText("Jordet 2")).not.toBeInTheDocument();

    fireEvent.click(within(targetDialog).getByText("Add harvest"));

    const harvestDialog = await findDialogByTitle("New harvest");
    expect(within(harvestDialog).getByLabelText("Select Field")).toHaveTextContent("Jordet 3");
  });

  it("lists fields that have not reached a second harvest", async () => {
    set_jwt_token("mock-token-admin");

    render(() => (
      <QueryClientProvider client={queryClient}>
        <HarvestList />
      </QueryClientProvider>
    ));

    const summary = await screen.findByRole("region", { name: "Harvest summary for 2026" });
    await within(summary).findByText("1 field without a harvest");
    fireEvent.click(within(summary).getByRole("button", { name: /Two or more harvests/i }));

    const targetDialog = await findDialogByTitle("Fields without a second harvest");
    expect(within(targetDialog).queryByText("Jordet 1")).not.toBeInTheDocument();
    expect(await within(targetDialog).findByText("Jordet 2")).toBeInTheDocument();
    expect(within(targetDialog).getByText("Jordet 3")).toBeInTheDocument();
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
