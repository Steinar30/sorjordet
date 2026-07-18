import { fireEvent, render, screen, waitFor, within } from "@solidjs/testing-library";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@rnwonder/solid-date-picker", () => ({
  default: () => <button type="button">Select date</button>,
}));

import FieldEvents from "../fields/FieldEvents";

describe("FieldEvents", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("selects an event type in the add field event modal", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation((input: string | URL | Request) => {
      const url = input.toString();

      if (url.includes("/api/farm_field_groups/meta")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: 2,
                name: "North farm",
                fields: [{ id: 42, name: "Hill field" }],
              },
            ]),
        } as Response);
      }

      if (url.includes("/api/field_event_type")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: 7,
                name: "Fertilizing",
                fields: [
                  {
                    id: 1,
                    name: "amount",
                    value_kind: "unit_int",
                    unit: "kg/daa",
                  },
                ],
              },
            ]),
        } as Response);
      }

      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response);
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(() => (
      <QueryClientProvider client={queryClient}>
        <FieldEvents />
      </QueryClientProvider>
    ));

    fireEvent.click(screen.getByText("New field event"));

    const dialogTitle = await screen.findByText("Add field event");
    const dialog = dialogTitle.closest<HTMLElement>('[role="dialog"]');
    if (!dialog) {
      throw new Error("Add field event dialog did not open");
    }
    fireEvent.mouseDown(within(dialog).getByText("Select type"));
    fireEvent.click(await screen.findByText("Fertilizing"));

    await waitFor(() => {
      expect(within(dialog).getByText("Fertilizing")).toBeInTheDocument();
      expect(within(dialog).getByLabelText("amount (kg/daa)")).toBeInTheDocument();
    });
  });
});
