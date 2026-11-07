import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DreamDictionary,
  DreamSearchIndex,
  MATCH_RANK,
  keepExactMatches,
  splitHighlight,
} from "./dream-dictionary";

const FIXTURE: DreamDictionary = {
  version: 1,
  entries: [
    { id: "psaria", term: "Ψάρια", meaning: "Τα ψάρια της θάλασσας φέρνουν κέρδη." },
    { id: "thalassa", term: "Θάλασσα", meaning: "Η ήρεμη θάλασσα δείχνει γαλήνη." },
    { id: "lefta", term: "Λεφτά", aliases: ["χρήματα"], meaning: "Δείχνουν έξοδα." },
    { id: "gata", term: "Γάτα", meaning: "Δείχνει κουτσομπολιά." },
    { id: "dyo", term: "Δύο", meaning: "Δείχνει ένωση." },
    { id: "dyosmos", term: "Δυόσμος", meaning: "Δείχνει υπομονή." },
    {
      id: "nero",
      term: "Νερό",
      scenarios: [{ context: "Αν πίνεις νερό", meaning: "θα ξεκουραστείς." }],
      related: ["thalassa", "does-not-exist"],
    },
  ],
};

const index = new DreamSearchIndex(FIXTURE);
const topTerm = (query: string) => index.search(query)[0]?.entry.term;

describe("DreamSearchIndex.search", () => {
  it("should match regardless of accents and case", () => {
    expect(topTerm("ψαρια")).toBe("Ψάρια");
    expect(topTerm("ΨΑΡΙΑ")).toBe("Ψάρια");
    expect(index.search("ψάρια")[0].rank).toBe(MATCH_RANK.EXACT);
  });

  it("should match singular and diminutive forms of a headword", () => {
    expect(topTerm("ψάρι")).toBe("Ψάρια");
    expect(topTerm("γατάκι")).toBe("Γάτα");
  });

  it("should match aliases and report which one matched", () => {
    const [match] = index.search("χρήματα");

    expect(match.entry.term).toBe("Λεφτά");
    expect(match.matchedName).toBe("χρήματα");
  });

  it("should match greeklish spellings", () => {
    expect(topTerm("thalassa")).toBe("Θάλασσα");
    expect(topTerm("8alasa")).toBe("Θάλασσα");
    expect(topTerm("xrimata")).toBe("Λεφτά");
  });

  it("should not list text mentions when a headword matches", () => {
    expect(index.search("θάλασσα").map((m) => m.entry.term)).toEqual(["Θάλασσα"]);
  });

  it("should fall back to entries that mention the word when no headword matches", () => {
    const [match] = index.search("γαλήνη");

    expect(match.entry.term).toBe("Θάλασσα");
    expect(match.rank).toBe(MATCH_RANK.TEXT);
  });

  it("should return no results for empty or unknown queries", () => {
    expect(index.search("   ")).toEqual([]);
    expect(index.search("qqqq")).toEqual([]);
  });
});

describe("keepExactMatches", () => {
  it("should show only the symbol the query names exactly", () => {
    const terms = (query: string) =>
      keepExactMatches(index.search(query)).map((m) => m.entry.term);

    expect(terms("Δύο")).toEqual(["Δύο"]);
    expect(terms("δυ")).toEqual(["Δύο", "Δυόσμος"]);
  });
});

describe("DreamSearchIndex.getRelated", () => {
  it("should skip related ids that do not exist", () => {
    const nero = index.search("νερό")[0].entry;

    expect(index.getRelated(nero).map((e) => e.term)).toEqual(["Θάλασσα"]);
  });
});

describe("splitHighlight", () => {
  it("should highlight an unaccented query inside accented text", () => {
    expect(splitHighlight("Θάλασσα", "θαλ")).toEqual(["", "Θάλ", "ασσα"]);
    expect(splitHighlight("Θάλασσα", "thal")).toBeNull();
  });
});

describe("dream-dictionary.json", () => {
  const dictionary: DreamDictionary = JSON.parse(
    readFileSync(new URL("../../public/data/dream-dictionary.json", import.meta.url), "utf8"),
  );

  it("should have unique ids, content in every entry and valid related links", () => {
    const ids = new Set(dictionary.entries.map((e) => e.id));

    expect(ids.size).toBe(dictionary.entries.length);
    for (const entry of dictionary.entries) {
      expect(Boolean(entry.meaning || entry.scenarios?.length), entry.id).toBe(true);
      for (const relatedId of entry.related ?? []) {
        expect(ids.has(relatedId), `${entry.id} -> ${relatedId}`).toBe(true);
      }
    }
  });
});
