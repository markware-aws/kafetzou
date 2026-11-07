import { useId, useState } from "react";
import { Search, X } from "lucide-react";
import { DreamIndexEntry, DreamMatch, splitHighlight } from "@/lib/dream-dictionary";

interface DreamSearchBoxProps {
  value: string;
  suggestions: DreamMatch[];
  onChange: (value: string) => void;
  onSelect: (entry: DreamIndexEntry) => void;
  /** Enter with no suggestion highlighted; by default it only closes the list. */
  onSubmit?: () => void;
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  const parts = splitHighlight(text, query);
  if (!parts) return <>{text}</>;
  const [before, match, after] = parts;
  return (
    <>
      {before}
      <mark className="bg-transparent text-amber-300 font-semibold">{match}</mark>
      {after}
    </>
  );
}

/** Search input with an accessible autocomplete list (ARIA combobox pattern). */
export function DreamSearchBox({
  value,
  suggestions,
  onChange,
  onSelect,
  onSubmit,
}: DreamSearchBoxProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const showList = open && value.trim() !== "" && suggestions.length > 0;
  // Suggestions follow a deferred query, so the list can shrink under the cursor.
  const active = activeIndex < suggestions.length ? activeIndex : -1;

  function handleChange(next: string) {
    onChange(next);
    setOpen(true);
    setActiveIndex(-1);
  }

  function select(entry: DreamIndexEntry) {
    onSelect(entry);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (suggestions.length === 0) return;
      e.preventDefault();
      setOpen(true);
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((active + step + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (showList && active >= 0) {
        select(suggestions[active].entry);
      } else {
        setOpen(false);
        onSubmit?.();
      }
    } else if (e.key === "Escape") {
      if (showList) setOpen(false);
      else handleChange("");
    }
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-500" />
      <input
        type="text"
        role="combobox"
        aria-label="Αναζήτηση συμβόλου ονείρου"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
        placeholder="Ψάξε ένα σύμβολο, π.χ. ψάρι, φίδι, δόντια…"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className="w-full bg-surface border border-violet-800/40 rounded-2xl pl-11 pr-11 py-3.5 text-base text-violet-50 placeholder-violet-600 focus:outline-none focus:border-violet-600/70 shadow-lg shadow-black/20"
      />
      {value && (
        <button
          type="button"
          aria-label="Καθαρισμός αναζήτησης"
          onClick={() => handleChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-violet-500 hover:text-violet-200 hover:bg-violet-900/40"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <ul
        id={listId}
        role="listbox"
        hidden={!showList}
        className="absolute z-20 left-0 right-0 mt-2 py-1.5 rounded-2xl border border-violet-800/40 bg-nav shadow-xl shadow-black/40 max-h-80 overflow-y-auto"
      >
        {suggestions.map(({ entry, matchedName }, i) => (
          <li
            key={entry.id}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            // Keep focus in the input so blur does not close the list before the click lands.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => select(entry)}
            onMouseEnter={() => setActiveIndex(i)}
            className={`flex items-baseline gap-2 px-4 py-2.5 cursor-pointer text-sm ${
              i === active ? "bg-violet-800/50 text-violet-50" : "text-violet-100"
            }`}
          >
            <span>
              <HighlightedText text={entry.term} query={value} />
            </span>
            {matchedName !== entry.term && (
              <span className="text-xs text-violet-500 truncate">
                · <HighlightedText text={matchedName} query={value} />
              </span>
            )}
            {entry.category && (
              <span className="ml-auto shrink-0 text-[11px] text-violet-500">{entry.category}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
