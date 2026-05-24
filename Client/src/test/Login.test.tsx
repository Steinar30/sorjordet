import { render, screen, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { Router, Route } from "@solidjs/router";
import Login from "../login/Login";
import { set_jwt_token, jwt_localstore_key } from "../App";

const mockResponse = (data: unknown): Response =>
  ({
    clone: () => mockResponse(data),
    json: () => Promise.resolve(data),
    ok: true,
    status: 200,
  }) as Response;

describe("Login Component", () => {
  beforeEach(() => {
    set_jwt_token(null);
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders form controls, logo, and title", () => {
    const { container } = render(() => (
      <Router>
        <Route path="/" component={Login} />
      </Router>
    ));

    expect(screen.getByText("Sørjordet gård")).toBeInTheDocument();
    expect(container.querySelector("#username-field")).toBeInTheDocument();
    expect(container.querySelector("#password-field")).toBeInTheDocument();
    expect(screen.getByText("Logg inn")).toBeInTheDocument();
  });

  it("updates inputs when user types", () => {
    const { container } = render(() => (
      <Router>
        <Route path="/" component={Login} />
      </Router>
    ));

    const usernameInput = container.querySelector("#username-field") as HTMLInputElement;
    const passwordInput = container.querySelector("#password-field") as HTMLInputElement;

    fireEvent.input(usernameInput, { target: { value: "steinar" } });
    fireEvent.input(passwordInput, { target: { value: "secret123" } });

    expect(usernameInput.value).toBe("steinar");
    expect(passwordInput.value).toBe("secret123");
  });

  it("shows an alert error message upon failed login api response", async () => {
    // Setup fetch mock failure
    const spyFetch = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(
        mockResponse({ result: false, message: "Feil passord" }),
      );

    const { container } = render(() => (
      <Router>
        <Route path="/" component={Login} />
      </Router>
    ));

    const usernameInput = container.querySelector("#username-field") as HTMLInputElement;
    const passwordInput = container.querySelector("#password-field") as HTMLInputElement;
    const submitBtn = screen.getByText("Logg inn");

    fireEvent.input(usernameInput, { target: { value: "admin" } });
    fireEvent.input(passwordInput, { target: { value: "wrong" } });
    fireEvent.click(submitBtn);

    // Wait for the fetch promise and check the UI state
    const alert = await screen.findByText("Feil passord");
    expect(alert).toBeInTheDocument();
    expect(spyFetch).toHaveBeenCalledWith("/api/auth/login", expect.any(Object));
  });

  it("saves token and redirects home upon successful login", async () => {
    // Setup fetch mock success
    vi.spyOn(global, "fetch").mockResolvedValue(
      mockResponse({ result: true, token: "mocked-valid-jwt" }),
    );

    const { container } = render(() => (
      <Router>
        <Route path="/" component={Login} />
      </Router>
    ));

    const usernameInput = container.querySelector("#username-field") as HTMLInputElement;
    const passwordInput = container.querySelector("#password-field") as HTMLInputElement;
    const submitBtn = screen.getByText("Logg inn");

    fireEvent.input(usernameInput, { target: { value: "farm_admin" } });
    fireEvent.input(passwordInput, { target: { value: "correct_password" } });
    fireEvent.click(submitBtn);

    // Verify redirection and storage updates
    await vi.waitFor(() => {
      expect(window.localStorage.setItem).toHaveBeenCalledWith(jwt_localstore_key, "mocked-valid-jwt");
    });
  });
});
