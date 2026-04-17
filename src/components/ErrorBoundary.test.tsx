import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "./ErrorBoundary";

function ThrowOnRender({ message }: { message: string }): never {
  throw new Error(message);
}

describe("ErrorBoundary", () => {
  const err = vi.spyOn(console, "error").mockImplementation(() => {});

  afterEach(() => {
    err.mockClear();
  });

  it("renders children when there is no error", () => {
    render(
      <ErrorBoundary>
        <span>Healthy</span>
      </ErrorBoundary>,
    );
    expect(screen.getByText("Healthy")).toBeInTheDocument();
  });

  it("renders friendly message for API-shaped JSON errors", () => {
    const payload = JSON.stringify({
      error: "Not found",
      operationType: "GET",
      path: "/api/x",
    });
    render(
      <ErrorBoundary>
        <ThrowOnRender message={payload} />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/API Error: Not found/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Reload App/i }),
    ).toBeInTheDocument();
  });

  it("renders plain error message for non-JSON errors", () => {
    render(
      <ErrorBoundary>
        <ThrowOnRender message="Simple failure" />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Simple failure")).toBeInTheDocument();
  });
});
