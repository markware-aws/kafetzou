import { describe, expect, it } from "vitest";
import { safeReturnTo } from "./return-to";

describe("safeReturnTo", () => {
  it("should keep an in-site path", () => {
    // Act
    const destination = safeReturnTo("/zodia/astrologikos-xartis/");

    // Assert
    expect(destination).toBe("/zodia/astrologikos-xartis/");
  });

  it("should keep an in-site path with a query string", () => {
    expect(safeReturnTo("/reading?id=1")).toBe("/reading?id=1");
  });

  it("should reject a protocol-relative URL", () => {
    expect(safeReturnTo("//evil.com")).toBe("/");
  });

  it("should reject a backslash URL that browsers read as protocol-relative", () => {
    expect(safeReturnTo("/\\evil.com")).toBe("/");
  });

  it("should reject an absolute URL to another site", () => {
    expect(safeReturnTo("https://evil.com")).toBe("/");
  });

  it("should fall back to the homepage for an empty string", () => {
    expect(safeReturnTo("")).toBe("/");
  });

  it("should fall back to the homepage when there is no value", () => {
    expect(safeReturnTo(undefined)).toBe("/");
  });

  it("should fall back to the homepage for a repeated query parameter", () => {
    // Arrange
    const repeatedParam = ["/profile/", "/dashboard/"];

    // Act
    const destination = safeReturnTo(repeatedParam);

    // Assert
    expect(destination).toBe("/");
  });
});
