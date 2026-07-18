import { render, screen, fireEvent, waitFor } from "@solidjs/testing-library";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { describe, it, expect, vi, beforeEach } from "vitest";
type DatePickerProps = {
  setValue: (value: { value: { selected: string }; label: string }) => void;
};

vi.mock("@rnwonder/solid-date-picker", () => ({
  default: (props: DatePickerProps) => (
    <button
      type="button"
      onClick={() =>
        props.setValue({
          value: { selected: "2026-07-09T10:00:00.000Z" },
          label: "09.07.2026",
        })
      }
    >
      Select date
    </button>
  ),
}));

vi.mock("../requests", () => ({
  prepareAuth: () =>
    new Headers({
      "Content-Type": "application/json",
      Authorization: "Bearer test-token",
    }),
}));

import { FieldEventForm } from "../fields/FieldEventForm";

describe("FieldEventForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps dynamic field inputs editable and posts typed values", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input: string | URL | Request, init?: RequestInit) => {
        const url = input.toString();

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

        if (url.includes("/api/field_event")) {
          expect(init?.method).toBe("POST");
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(99),
          } as Response);
        }

        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        } as Response);
      });

    const onCreated = vi.fn();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(() => (
      <QueryClientProvider client={queryClient}>
        <FieldEventForm isOpen={() => true} fieldId={42} onClose={vi.fn()} onCreated={onCreated} />
      </QueryClientProvider>
    ));

    fireEvent.mouseDown(await screen.findByText("Select type"));
    fireEvent.click(await screen.findByText("Fertilizing"));

    fireEvent.click(screen.getByText("Select date"));
    const amountInput = await screen.findByLabelText("amount (kg/daa)");
    expect(amountInput).toHaveAttribute("inputmode", "decimal");
    fireEvent.input(amountInput, {
      target: { value: "23,75" },
    });
    fireEvent.input(screen.getByLabelText("Note"), {
      target: { value: "spread evenly" },
    });
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => expect(onCreated).toHaveBeenCalled());

    const postCall = fetchMock.mock.calls.find(
      ([url, init]) => url.toString().includes("/api/field_event") && init?.method === "POST",
    );
    expect(postCall).toBeTruthy();

    const payload = JSON.parse(postCall![1]!.body as string);
    expect(payload).toMatchObject({
      field_id: 42,
      type_id: 7,
      type_name: "Fertilizing",
      note: "spread evenly",
      values: {
        amount: { kind: "unit_int", value: 23.75, unit: "kg/daa" },
      },
    });
  });
});
