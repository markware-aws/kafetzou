import useSWR, { type SWRConfiguration, type SWRResponse } from "swr";

const DEFAULT_AUTHED_SWR_CONFIG: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  keepPreviousData: true,
  errorRetryCount: 1,
  shouldRetryOnError: (error) => {
    const message =
      error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    return !message.includes("not authenticated");
  },
};

export function useAuthedSWR<Data>(
  key: string | readonly unknown[] | null,
  fetcher: (key: readonly unknown[]) => Promise<Data>,
  config?: SWRConfiguration<Data>,
): SWRResponse<Data> {
  const normalizedFetcher = async (resolvedKey: readonly unknown[]) => fetcher(resolvedKey);
  return useSWR<Data>(key, normalizedFetcher, {
    ...DEFAULT_AUTHED_SWR_CONFIG,
    ...config,
  });
}
