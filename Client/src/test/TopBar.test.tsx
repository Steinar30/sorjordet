import { render, screen, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, beforeEach } from "vitest";
import TopAppBar from "../TopBar";
import { set_jwt_token, jwt_localstore_key } from "../App";

describe("TopAppBar Component", () => {
  beforeEach(() => {
    // Reset state before each test
    set_jwt_token(null);
    window.localStorage.clear();
  });

  it("renders Sørjordet logo and main brand name", () => {
    render(() => <TopAppBar />);
    expect(screen.getByText("Sørjordet")).toBeInTheDocument();
    expect(screen.getByAltText("logo")).toBeInTheDocument();
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

  it("shows Admin, Harvest, and Log Out buttons when logged in", async () => {
    render(() => <TopAppBar />);

    // Simulate logging in by setting the signal
    set_jwt_token("test-mock-jwt-token");

    expect(screen.queryByText("Log in")).not.toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("Harvest")).toBeInTheDocument();
    expect(screen.getByText("Log out")).toBeInTheDocument();
  });

  it("clears token and redirects to logged out view when Log Out is clicked", async () => {
    set_jwt_token("test-mock-jwt-token");
    window.localStorage.setItem(jwt_localstore_key, "test-mock-jwt-token");

    render(() => <TopAppBar />);

    const logOutBtn = screen.getByText("Log out");
    fireEvent.click(logOutBtn);

    // Verify localStorage was cleared
    expect(window.localStorage.removeItem).toHaveBeenCalledWith(jwt_localstore_key);
    // Verify signal was set to null
    expect(screen.getByText("Log in")).toBeInTheDocument();
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });
});
