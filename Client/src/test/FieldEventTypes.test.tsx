import { fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../requests", () => ({
  prepareAuth: () =>
    new Headers({
      "Content-Type": "application/json",
      Authorization: "Bearer test-token",
    }),
}));

import FieldEventTypes from "../admin/fieldevents/FieldEventTypes";

describe("FieldEventTypes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("posts new types with dynamic field IDs that fit the API integer type", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input: string | URL | Request, init?: RequestInit) => {
        if (init?.method === "POST") {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(1) } as Response);
        }

        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response);
      });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(() => (
      <QueryClientProvider client={queryClient}>
        <FieldEventTypes />
      </QueryClientProvider>
    ));

    fireEvent.click(screen.getByText("New type"));
    fireEvent.input(await screen.findByLabelText("Name"), {
      target: { value: "Fertilizing" },
    });
    fireEvent.click(screen.getByText("Add field"));
    fireEvent.input(await screen.findByLabelText("Field"), {
      target: { value: "Amount" },
    });
    fireEvent.mouseDown(screen.getByLabelText("Kind"));
    fireEvent.click(await screen.findByText("number with unit"));
    fireEvent.input(await screen.findByLabelText("Unit"), {
      target: { value: "kg/daa" },
    });
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(true);
    });

    const postCall = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    const payload = JSON.parse(postCall![1]!.body as string);

    expect(payload).toMatchObject({
      id: -1,
      name: "Fertilizing",
      fields: [{ id: -1, name: "Amount", value_kind: "unit_int", unit: "kg/daa" }],
    });
    expect(payload.fields[0].id).toBeGreaterThanOrEqual(-2_147_483_648);
    expect(payload.fields[0].id).toBeLessThanOrEqual(2_147_483_647);
  });

  it("keeps the dialog open and shows an error when saving fails", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      (_input: string | URL | Request, init?: RequestInit) =>
        Promise.resolve({
          ok: init?.method !== "POST",
          json: () => Promise.resolve([]),
        } as Response),
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(() => (
      <QueryClientProvider client={queryClient}>
        <FieldEventTypes />
      </QueryClientProvider>
    ));

    fireEvent.click(screen.getByText("New type"));
    fireEvent.input(await screen.findByLabelText("Name"), {
      target: { value: "Fertilizing" },
    });
    fireEvent.click(screen.getByText("Save"));

    expect(
      await screen.findByText("The field event type could not be saved. Please try again."),
    ).toBeInTheDocument();
    expect(screen.getByText("Add field event type")).toBeInTheDocument();
  });
});
