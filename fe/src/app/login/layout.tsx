import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Σύνδεση",
  description: "Συνδέσου ή δημιούργησε λογαριασμό στο Fortune Teller.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
