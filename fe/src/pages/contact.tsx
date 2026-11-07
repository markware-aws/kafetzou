import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Seo } from "@/components/seo";

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <Seo
        title="Επικοινωνία"
        description="Επικοινώνησε με την ομάδα του Fortune Teller για τεχνικά προβλήματα, credits και χρεώσεις ή διαγραφή λογαριασμού."
        path="/contact/"
      />
      <div className="max-w-2xl mx-auto w-full px-4 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-violet-300 hover:text-violet-50 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Επιστροφή
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-violet-50">Επικοινωνία</h1>
          <p className="mt-1 text-sm text-violet-300">Είμαστε εδώ για να βοηθήσουμε</p>
        </div>

        <div className="space-y-6 text-base text-violet-200 leading-relaxed">
          <p>
            Για οποιαδήποτε απορία ή ζήτημα, επικοινωνήστε μαζί μας στο{" "}
            <a
              href="mailto:support@fortuneteller.gr"
              className="text-amber-400 hover:text-amber-300 transition-colors"
            >
              support@fortuneteller.gr
            </a>
            .
          </p>

          <div>
            <p>Μπορείτε να επικοινωνήσετε για:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              {[
                "Τεχνικά προβλήματα ή σφάλματα στην εφαρμογή",
                "Ερωτήσεις σχετικά με τα credits και τις χρεώσεις",
                "Αιτήματα διαγραφής λογαριασμού ή δεδομένων",
                "Γενικές απορίες για την υπηρεσία",
              ].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <p className="text-sm text-violet-300">
            Απαντούμε εντός 1–2 εργάσιμων ημερών.
          </p>
        </div>
      </div>
    </div>
  );
}
