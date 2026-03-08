"use client";

/** Fire after a successful credit-consuming API call so the navbar refetches the balance. */
export function notifyCreditsChanged() {
  window.dispatchEvent(new CustomEvent("credits-changed"));
}
