import { render, screen, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, beforeEach } from "vitest";
import TopAppBar from "../TopBar";
import { set_jwt_token, jwt_localstore_key } from "../App";

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

describe("TopAppBar Component", () => {
  beforeEach(() => {
    set_jwt_token(null);
    window.localStorage.clear();
    mockMatchMedia(false);
  });

  it("renders Sørjordet logo and main brand name", () => {
    render(() => <TopAppBar />);
    expect(screen.getByText("Sørjordet")).toBeInTheDocument();
    expect(screen.getByAltText("Sørjordet logo")).toBeInTheDocument();
  });

  it("always shows public navigation links (Fields, Stats)", () => {
    render(() => <TopAppBar />);
    expect(screen.getByText("Fields")).toBeInTheDocument();
    expect(screen.getByText("Stats")).toBeInTheDocument();
  });

  it("shows Log In link and hides Admin/Harvest links when logged out", () => {
    render(() => <TopAppBar />);
    expect(screen.getByText("Log in")).toBeInTheDocument();
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
    expect(screen.queryByText("Harvest")).not.toBeInTheDocument();
  });

  it("shows Admin, Harvest, and Log Out buttons when logged in", () => {
    render(() => <TopAppBar />);

    set_jwt_token("test-mock-jwt-token");

    expect(screen.queryByText("Log in")).not.toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("Harvest")).toBeInTheDocument();
    expect(screen.getByText("Log out")).toBeInTheDocument();
  });

  it("clears token and redirects to logged out view when Log Out is clicked", () => {
    set_jwt_token("test-mock-jwt-token");
    window.localStorage.setItem(jwt_localstore_key, "test-mock-jwt-token");

    render(() => <TopAppBar />);

    const logOutBtn = screen.getByText("Log out");
    fireEvent.click(logOutBtn);

    expect(window.localStorage.removeItem).toHaveBeenCalledWith(jwt_localstore_key);
    expect(screen.getByText("Log in")).toBeInTheDocument();
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });

  it("keeps the mobile menu open for inside clicks and closes it from the backdrop", () => {
    mockMatchMedia(true);
    render(() => <TopAppBar />);

    fireEvent.click(screen.getByLabelText("Open menu"));
    const drawer = screen.getByLabelText("Mobile navigation");
    expect(drawer).toBeInTheDocument();

    fireEvent.click(drawer);
    expect(screen.getByLabelText("Mobile navigation")).toBeInTheDocument();

    fireEvent.click(drawer.parentElement!);
    expect(screen.queryByLabelText("Mobile navigation")).not.toBeInTheDocument();
  });
});
