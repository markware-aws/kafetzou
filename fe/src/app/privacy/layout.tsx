import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Πολιτική Απορρήτου",
  description: "Πολιτική απορρήτου και προστασίας προσωπικών δεδομένων της υπηρεσίας Fortune Teller.",
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
