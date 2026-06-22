import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// A component that throws when the `shouldThrow` prop is true
function BombComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("Test explosion!");
  return <div>Rendered OK</div>;
}

describe("ErrorBoundary", () => {
  it("renders children when no error is thrown", () => {
    render(
      <ErrorBoundary>
        <BombComponent shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText("Rendered OK")).toBeInTheDocument();
  });

  it("renders the fallback UI when a child throws", () => {
    // Suppress console.error for expected React error
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <BombComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
    spy.mockRestore();
  });

  it("displays the thrown error message in the fallback", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <BombComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Test explosion!/i)).toBeInTheDocument();
    spy.mockRestore();
  });

  it("renders a retry/reload button in the fallback", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <BombComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    const btn = screen.getByRole("button");
    expect(btn).toBeInTheDocument();
    spy.mockRestore();
  });
});
