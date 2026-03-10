import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Όροι Χρήσης",
  description: "Όροι χρήσης της υπηρεσίας Kafetzou — καφεομαντεία, ταρό, αστρολογία και ονειροκρισία με τεχνητή νοημοσύνη.",
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
