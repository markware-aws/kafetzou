import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <div className="max-w-2xl mx-auto w-full px-4 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-violet-400 hover:text-amber-300 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Επιστροφή
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-full bg-violet-900/40 border border-violet-700/30 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-violet-100">Επικοινωνία</h1>
            <p className="text-xs text-violet-500 mt-0.5">Είμαστε εδώ για να βοηθήσουμε</p>
          </div>
        </div>

        <div className="rounded-2xl border border-violet-800/30 bg-surface p-6 space-y-6">
          <p className="text-sm text-violet-300 leading-relaxed">
            Για οποιαδήποτε απορία ή ζήτημα, επικοινωνήστε μαζί μας στο{" "}
            <span className="text-amber-400 font-medium">support@fortuneteller.gr</span>.
          </p>

          <div className="space-y-4 text-sm text-violet-300">
            <p className="text-violet-400 font-medium text-xs uppercase tracking-wider">Μπορείτε να επικοινωνήσετε για:</p>
            <ul className="space-y-2">
              {[
                "Τεχνικά προβλήματα ή σφάλματα στην εφαρμογή",
                "Ερωτήσεις σχετικά με τα credits και τις χρεώσεις",
                "Αιτήματα διαγραφής λογαριασμού ή δεδομένων",
                "Γενικές απορίες για την υπηρεσία",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-amber-500 mt-2 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-4 border-t border-violet-800/30">
            <p className="text-xs text-violet-500">
              Απαντούμε εντός 1–2 εργάσιμων ημερών.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
