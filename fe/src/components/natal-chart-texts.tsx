import useSWR from "swr";
import { ChevronDown } from "lucide-react";
import type { ChartData } from "@/lib/api";
import {
  chartTextKeys,
  chartTextSections,
  chartTextUrl,
  splitParagraphs,
} from "@/lib/chart-texts";

const NOT_FOUND = 404;
const SHIMMER_ROWS = 4;

/** One request per key and page load. A missing text (404) is remembered as missing. */
const textRequests = new Map<string, Promise<string | null>>();

function loadChartText(key: string): Promise<string | null> {
  let request = textRequests.get(key);
  if (!request) {
    request = fetch(chartTextUrl(key))
      .then(async (response) => {
        if (response.status === NOT_FOUND) return null;
        if (!response.ok) throw new Error(`Chart text request failed: ${key} ${response.status}`);
        const data = (await response.json()) as { text?: unknown };
        return typeof data.text === "string" ? data.text : null;
      })
      .catch(() => {
        // Network trouble is not a missing text: a later chart may try again.
        textRequests.delete(key);
        return null;
      });
    textRequests.set(key, request);
  }
  return request;
}

/** The texts that exist for these keys; keys without a text are left out. */
async function loadChartTexts(keys: string[]): Promise<Record<string, string>> {
  const texts = await Promise.all(keys.map(loadChartText));
  const loaded: Record<string, string> = {};
  keys.forEach((key, index) => {
    const text = texts[index];
    if (text) loaded[key] = text;
  });
  return loaded;
}

function LoadingTexts({ className }: { className: string }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`} aria-hidden>
      <div className="h-5 w-56 max-w-full rounded shimmer" />
      <div className="mt-2 h-4 w-32 rounded shimmer" />
      {[...Array(SHIMMER_ROWS)].map((_, index) => (
        <div key={index} className="h-11 rounded-lg shimmer" />
      ))}
    </div>
  );
}

/**
 * Pre-written texts for each placement of the chart (Ascendant, planets in signs and houses,
 * aspects), each one folded under its title. Static files, no AI and no credits. Draws
 * nothing when no text exists for the chart.
 */
export function NatalChartTexts({ chart, className = "" }: { chart: ChartData; className?: string }) {
  const sections = chartTextSections(chart);
  const keys = chartTextKeys(sections);
  const { data: texts } = useSWR(
    keys.length > 0 ? ["chart-texts", keys.join(",")] : null,
    () => loadChartTexts(keys),
    { revalidateOnFocus: false, revalidateOnReconnect: false, revalidateIfStale: false },
  );

  if (keys.length === 0) return null;
  if (texts === undefined) return <LoadingTexts className={className} />;

  const shown = sections
    .map((section) => ({ ...section, items: section.items.filter((item) => texts[item.key]) }))
    .filter((section) => section.items.length > 0);
  if (shown.length === 0) return null;

  return (
    <div className={`animate-fade-in ${className}`}>
      <h3 className="text-base font-semibold text-violet-50">Τι λέει κάθε θέση του χάρτη σου</h3>
      <p className="mt-1 text-sm text-violet-300">Πάτησε μια θέση για να τη διαβάσεις.</p>
      <div className="mt-4 flex flex-col gap-6">
        {shown.map((section) => (
          <section key={section.id} aria-labelledby={`chart-texts-${section.id}`}>
            <h4
              id={`chart-texts-${section.id}`}
              className="mb-2 text-sm font-medium text-violet-50"
            >
              {section.title}
            </h4>
            <div className="overflow-hidden rounded-lg border border-violet-800 bg-surface divide-y divide-violet-800">
              {section.items.map((item, index) => (
                <details key={item.key} open={index === 0} className="group">
                  {/* The flex row sits inside <summary>: older Safari ignores flex on it. */}
                  <summary className="block cursor-pointer list-none px-3 py-3 text-sm text-violet-50 transition-colors hover:bg-surface-hover [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-2">
                      <span aria-hidden className="w-5 shrink-0 text-violet-300">
                        {item.glyph}
                      </span>
                      <span className="min-w-0 flex-1">{item.title}</span>
                      <ChevronDown
                        aria-hidden
                        className="w-4 h-4 shrink-0 text-violet-300 transition-transform group-open:rotate-180"
                      />
                    </span>
                  </summary>
                  <div className="flex flex-col gap-3 px-3 pb-4 sm:pl-10 text-sm text-violet-200 leading-relaxed">
                    {splitParagraphs(texts[item.key]).map((paragraph, paragraphIndex) => (
                      <p key={paragraphIndex}>{paragraph}</p>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
