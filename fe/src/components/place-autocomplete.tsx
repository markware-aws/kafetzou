import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import {
  placeSearchUrl,
  toPlaceOption,
  type PhotonFeature,
  type PlaceOption,
} from "@/lib/place-search";

const SEARCH_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

interface PlaceAutocompleteProps {
  id?: string;
  value: string;
  /** Every change of the text, typed or picked from the list. */
  onChange: (value: string) => void;
  /** A place picked from the list. Called after onChange, so a handler that clears the
   *  picked place on typing can safely live in onChange. */
  onSelect?: (place: PlaceOption) => void;
}

/** Birth place input with suggestions from Photon (OpenStreetMap). */
export function PlaceAutocomplete({ id, value, onChange, onSelect }: PlaceAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<PlaceOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external value (e.g. on profile load)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const search = useCallback((q: string) => {
    if (q.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    fetch(placeSearchUrl(q))
      .then((r) => r.json())
      .then((data) => {
        const features: PhotonFeature[] = Array.isArray(data.features) ? data.features : [];
        setResults(
          features
            .map(toPlaceOption)
            .filter((place): place is PlaceOption => place !== null),
        );
        setOpen(true);
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, []);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    onChange(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), SEARCH_DEBOUNCE_MS);
  }

  function handleSelect(place: PlaceOption) {
    setQuery(place.label);
    onChange(place.label);
    onSelect?.(place);
    setOpen(false);
    setResults([]);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          id={id}
          type="text"
          value={query}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          required
          autoComplete="off"
          placeholder="π.χ. Αθήνα, Ελλάδα"
          className="w-full rounded-md border border-violet-700 bg-bg px-3 py-2 pr-9 text-base text-violet-50 placeholder:text-violet-400 focus:outline-none focus:border-amber-500"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-300 animate-spin" />
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 rounded-md border border-violet-700 bg-surface shadow-md overflow-hidden">
          {results.map((place, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseDown={() => handleSelect(place)}
                className="w-full text-left px-3 py-2 text-sm text-violet-100 hover:bg-violet-900/60 flex items-center gap-2 transition-colors"
              >
                <MapPin className="w-4 h-4 text-violet-300 shrink-0" />
                {place.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
