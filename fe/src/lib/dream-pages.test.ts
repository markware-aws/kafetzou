import { describe, expect, it } from "vitest";
import type { DreamEntry } from "./dream-dictionary";
import {
  MIN_INDEXABLE_TEXT_LENGTH,
  dreamEntryExcerpt,
  dreamEntryPath,
  isIndexableDreamEntry,
} from "./dream-pages";

function entryWithText(id: string, term: string, length: number): DreamEntry {
  return { id, term, meaning: "α".repeat(length) };
}

describe("isIndexableDreamEntry", () => {
  it("should index an entry at the minimum text length", () => {
    expect(isIndexableDreamEntry(entryWithText("fidi", "Φίδι", MIN_INDEXABLE_TEXT_LENGTH))).toBe(
      true,
    );
  });

  it("should keep a shorter entry out of the index", () => {
    expect(
      isIndexableDreamEntry(entryWithText("fidi", "Φίδι", MIN_INDEXABLE_TEXT_LENGTH - 1)),
    ).toBe(false);
  });

  it("should count scenario text towards the length", () => {
    const entry: DreamEntry = {
      id: "agapi",
      term: "Αγάπη",
      scenarios: [{ context: "κ".repeat(150), meaning: "μ".repeat(MIN_INDEXABLE_TEXT_LENGTH - 150) }],
    };

    expect(isIndexableDreamEntry(entry)).toBe(true);
  });
});

describe("dreamEntryPath", () => {
  it("should give every entry its own page, however short", () => {
    expect(dreamEntryPath(entryWithText("fidi", "Φίδι", MIN_INDEXABLE_TEXT_LENGTH))).toBe(
      "/oneirokritis/fidi/",
    );
    expect(dreamEntryPath(entryWithText("aggouri", "Αγγούρι", 40))).toBe("/oneirokritis/aggouri/");
  });
});

describe("dreamEntryExcerpt", () => {
  it("should return short text unchanged", () => {
    expect(dreamEntryExcerpt({ id: "a", term: "Α", meaning: "Καλό σημάδι." }, 50)).toBe(
      "Καλό σημάδι.",
    );
  });

  it("should cut long text at a word boundary and add an ellipsis", () => {
    const meaning = "Το φίδι είναι προειδοποίηση για κάποιον κίνδυνο που πλησιάζει.";

    const excerpt = dreamEntryExcerpt({ id: "fidi", term: "Φίδι", meaning }, 30);

    expect(excerpt).toBe("Το φίδι είναι προειδοποίηση…");
    expect(excerpt.length).toBeLessThanOrEqual(30);
  });

  it("should fall back to the first scenario when there is no general meaning", () => {
    const entry: DreamEntry = {
      id: "agapi",
      term: "Αγάπη",
      scenarios: [{ context: "Αν μοιράζεις την αγάπη σου", meaning: "θα είσαι ευτυχισμένος." }],
    };

    expect(dreamEntryExcerpt(entry, 100)).toBe("Αν μοιράζεις την αγάπη σου, θα είσαι ευτυχισμένος.");
  });
});
