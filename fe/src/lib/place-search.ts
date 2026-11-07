/** Place search through Photon (photon.komoot.io), the OpenStreetMap geocoder used for birth places. */

export interface PhotonFeature {
  geometry?: {
    /** GeoJSON order: longitude first, then latitude. */
    coordinates?: [number, number];
  };
  properties: {
    name?: string;
    city?: string;
    state?: string;
    country?: string;
    type?: string;
  };
}

export interface PlaceOption {
  label: string;
  latitude: number;
  /** East positive. */
  longitude: number;
}

const PHOTON_URL = "https://photon.komoot.io/api/";
const SETTLEMENT_TAGS = ["place:city", "place:town", "place:village", "place:hamlet"];
const RESULT_LIMIT = "5";

export function placeSearchUrl(query: string): string {
  const params = new URLSearchParams({ q: query, limit: RESULT_LIMIT });
  SETTLEMENT_TAGS.forEach((tag) => params.append("osm_tag", tag));
  return `${PHOTON_URL}?${params}`;
}

/** "Χανιά, Κρήτη, Ελλάδα": the place, its region when different, and the country. */
export function formatPlace(feature: PhotonFeature): string {
  const { name, state, country } = feature.properties;
  const parts = [name];
  if (state && state !== name) parts.push(state);
  if (country) parts.push(country);
  return parts.filter(Boolean).join(", ");
}

/** The label and coordinates of a search result, or null when it has no coordinates. */
export function toPlaceOption(feature: PhotonFeature): PlaceOption | null {
  const coordinates = feature.geometry?.coordinates;
  if (!coordinates) return null;
  const [longitude, latitude] = coordinates;
  return { label: formatPlace(feature), latitude, longitude };
}
