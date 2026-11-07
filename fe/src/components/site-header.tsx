import Link from "next/link";
import useSWR from "swr";
import { getUser } from "@/lib/auth";
import { Brand, Navbar } from "@/components/navbar";

const CONTENT_LINKS = [
  { href: "/anagnosi-kafe/", label: "Καφές" },
  { href: "/taro/", label: "Ταρό" },
  { href: "/zodia/", label: "Ζώδια" },
  { href: "/oneirokritis/", label: "Όνειρα" },
];

/**
 * Header for public pages: the app navbar for signed-in users, otherwise the brand, links to
 * the free guides and sign-in buttons. Shares its SWR key with the homepage's auth check.
 */
export function SiteHeader() {
  const { data: user } = useSWR(["home-user"], () => getUser(), {
    revalidateOnFocus: false,
  });

  if (user) return <Navbar />;

  return (
    <nav className="sticky top-0 z-50 border-b border-violet-900 bg-nav">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Brand />
        <div className="hidden md:flex items-center gap-1">
          {CONTENT_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="px-3 py-1.5 rounded-md text-sm text-violet-200 hover:text-violet-50 hover:bg-violet-900/50 transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="text-sm text-violet-200 hover:text-violet-50 px-3 py-1.5 rounded-md transition-colors"
          >
            Σύνδεση
          </Link>
          <Link
            href="/login?mode=register"
            className="text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-md px-3 py-1.5 transition-colors"
          >
            Εγγραφή
          </Link>
        </div>
      </div>
    </nav>
  );
}
