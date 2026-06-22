import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn (class name utility)", () => {
  it("returns a single class unchanged", () => {
    expect(cn("foo")).toBe("foo");
  });

  it("merges multiple classes", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("filters falsy values", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });

  it("resolves Tailwind conflicts — later class wins", () => {
    // tailwind-merge: p-4 wins over p-2
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("resolves color conflicts", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("handles conditional objects", () => {
    expect(cn({ "font-bold": true, italic: false })).toBe("font-bold");
  });

  it("handles arrays of class values", () => {
    expect(cn(["flex", "items-center"])).toBe("flex items-center");
  });

  it("deduplicates classes", () => {
    expect(cn("flex", "flex")).toBe("flex");
  });

  it("returns empty string for all falsy inputs", () => {
    expect(cn(false, undefined, null)).toBe("");
  });

  it("handles complex mixed input", () => {
    const result = cn("px-2", "px-4", { "font-bold": true, italic: false }, ["rounded", "bg-red-500"]);
    expect(result).toContain("px-4");
    expect(result).toContain("font-bold");
    expect(result).toContain("rounded");
    expect(result).not.toContain("italic");
    expect(result).not.toContain("px-2");
  });
});
