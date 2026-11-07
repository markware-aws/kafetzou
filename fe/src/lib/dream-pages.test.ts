import { describe, expect, it } from "vitest";
import type { DreamEntry } from "./dream-dictionary";
import {
  MIN_STANDALONE_TEXT_LENGTH,
  dreamEntryExcerpt,
  dreamEntryLetter,
  dreamEntryPath,
  dreamLetterSlug,
  hasStandalonePage,
} from "./dream-pages";

function entryWithText(id: string, term: string, length: number): DreamEntry {
  return { id, term, meaning: "α".repeat(length) };
}

describe("hasStandalonePage", () => {
  it("should give an entry its own page at the minimum text length", () => {
    expect(hasStandalonePage(entryWithText("fidi", "Φίδι", MIN_STANDALONE_TEXT_LENGTH))).toBe(true);
  });

  it("should keep a shorter entry on its letter page only", () => {
    expect(hasStandalonePage(entryWithText("fidi", "Φίδι", MIN_STANDALONE_TEXT_LENGTH - 1))).toBe(
      false,
    );
  });

  it("should count scenario text towards the length", () => {
    const entry: DreamEntry = {
      id: "agapi",
      term: "Αγάπη",
      scenarios: [{ context: "κ".repeat(150), meaning: "μ".repeat(MIN_STANDALONE_TEXT_LENGTH - 150) }],
    };

    expect(hasStandalonePage(entry)).toBe(true);
  });
});

describe("dreamEntryLetter", () => {
  it("should ignore accents on the first letter", () => {
    expect(dreamEntryLetter({ id: "aggelos", term: "Άγγελος" })).toBe("Α");
    expect(dreamEntryLetter({ id: "ora", term: "Ώρα" })).toBe("Ω");
  });
});

describe("dreamEntryPath", () => {
  it("should link a long entry to its own page", () => {
    const entry = entryWithText("fidi", "Φίδι", MIN_STANDALONE_TEXT_LENGTH);

    expect(dreamEntryPath(entry)).toBe("/oneirokritis/fidi/");
  });

  it("should link a short entry to its anchor on the letter page", () => {
    const entry = entryWithText("aggouri", "Αγγούρι", 40);

    expect(dreamEntryPath(entry)).toBe("/oneirokritis/alfavito/alfa/#aggouri");
  });
});

describe("dreamLetterSlug", () => {
  it("should reject a letter outside the Greek alphabet", () => {
    expect(() => dreamLetterSlug("A")).toThrow(/non-Greek/);
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
