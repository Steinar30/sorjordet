import { render } from "@solidjs/testing-library";
import { describe, it, expect } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { FieldDetails } from "../fields/FieldDetails";
import styles from "../fields/FieldDetails.module.css";

describe("FieldDetails Component", () => {
  it("renders without crashing and contains main element", () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const { container } = render(() => (
      <QueryClientProvider client={queryClient}>
        <FieldDetails fieldId={42} />
      </QueryClientProvider>
    ));

    // Assert that the main element with styles is rendered
    const mainEl = container.querySelector("main");
    expect(mainEl).toBeInTheDocument();
    expect(mainEl).toHaveClass(styles.page);
  });
});
