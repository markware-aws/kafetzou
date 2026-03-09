"use client";

import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-base font-semibold text-violet-100 mb-3 flex items-center gap-2">
        <span className="w-1 h-4 rounded-full bg-amber-500 shrink-0" />
        {title}
      </h2>
      <div className="text-sm text-violet-300 leading-relaxed space-y-2 pl-3">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
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

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-full bg-violet-900/40 border border-violet-700/30 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-violet-100">Πολιτική Απορρήτου</h1>
            <p className="text-xs text-violet-500 mt-0.5">Τελευταία ενημέρωση: Μάρτιος 2026</p>
          </div>
        </div>

        <div className="rounded-2xl border border-violet-800/30 bg-surface p-6 mb-6">
          <p className="text-sm text-violet-300 leading-relaxed">
            Η Kafetzou («εμείς», «η υπηρεσία») σέβεται την ιδιωτικότητά σας και δεσμεύεται να
            προστατεύει τα προσωπικά σας δεδομένα σύμφωνα με τον Γενικό Κανονισμό Προστασίας
            Δεδομένων (GDPR — Κανονισμός ΕΕ 2016/679) και την ισχύουσα ελληνική νομοθεσία.
          </p>
        </div>

        <Section title="1. Υπεύθυνος Επεξεργασίας">
          <p>
            Υπεύθυνος επεξεργασίας των δεδομένων σας είναι η Kafetzou. Για οποιοδήποτε ζήτημα
            σχετικό με την προστασία δεδομένων, επικοινωνήστε μαζί μας στη διεύθυνση:{" "}
            <a href="mailto:privacy@kafetzou.com" className="text-amber-400 hover:underline">
              privacy@kafetzou.com
            </a>
          </p>
        </Section>

        <Section title="2. Δεδομένα που Συλλέγουμε">
          <p>Συλλέγουμε τις παρακάτω κατηγορίες προσωπικών δεδομένων:</p>
          <ul className="list-disc list-inside space-y-1 mt-2 text-violet-400">
            <li>
              <span className="text-violet-300">Στοιχεία λογαριασμού:</span> διεύθυνση email, κωδικός
              πρόσβασης (αποθηκεύεται κρυπτογραφημένος μέσω AWS Cognito)
            </li>
            <li>
              <span className="text-violet-300">Αστρολογικό προφίλ (προαιρετικό):</span> ημερομηνία,
              ώρα και τόπος γέννησης, φύλο, χρώμα ματιών
            </li>
            <li>
              <span className="text-violet-300">Φωτογραφίες φλιτζανιού:</span> εικόνες που ανεβάζετε
              για την ανάγνωση καφέ, αποθηκευμένες στο AWS S3
            </li>
            <li>
              <span className="text-violet-300">Ιστορικό αναγνώσεων:</span> αποτελέσματα αναγνώσεων
              καφέ, ταρό, αστρολογίας και ονείρων
            </li>
            <li>
              <span className="text-violet-300">Δεδομένα πληρωμής:</span> διαχειρίζεται αποκλειστικά
              η Stripe — δεν αποθηκεύουμε στοιχεία κάρτας
            </li>
            <li>
              <span className="text-violet-300">Τεχνικά δεδομένα:</span> διεύθυνση IP, τύπος
              προγράμματος περιήγησης (μέσω αρχείων καταγραφής AWS)
            </li>
          </ul>
        </Section>

        <Section title="3. Σκοπός & Νομική Βάση Επεξεργασίας">
          <ul className="list-disc list-inside space-y-1 text-violet-400">
            <li>
              <span className="text-violet-300">Εκτέλεση σύμβασης:</span> παροχή αναγνώσεων, διαχείριση
              λογαριασμού και credits
            </li>
            <li>
              <span className="text-violet-300">Εκτέλεση σύμβασης:</span> επεξεργασία πληρωμών μέσω
              Stripe
            </li>
            <li>
              <span className="text-violet-300">Εννόμο συμφέρον:</span> βελτίωση της υπηρεσίας,
              ασφάλεια, ανίχνευση απάτης
            </li>
            <li>
              <span className="text-violet-300">Συγκατάθεση:</span> αποθήκευση αστρολογικού προφίλ
              (μπορείτε να το διαγράψετε ανά πάσα στιγμή)
            </li>
          </ul>
        </Section>

        <Section title="4. Διαβίβαση Δεδομένων σε Τρίτους">
          <p>Χρησιμοποιούμε τους παρακάτω εμπιστευμένους παρόχους υπηρεσιών:</p>
          <ul className="list-disc list-inside space-y-1 mt-2 text-violet-400">
            <li>
              <span className="text-violet-300">Amazon Web Services (AWS):</span> φιλοξενία,
              αποθήκευση (S3), βάση δεδομένων (DynamoDB), αυθεντικοποίηση (Cognito) — διακομιστές
              στην ΕΕ (eu-central-1, Φρανκφούρτη)
            </li>
            <li>
              <span className="text-violet-300">OpenAI:</span> επεξεργασία εικόνων και κειμένου για
              την παραγωγή αναγνώσεων — τα δεδομένα δεν χρησιμοποιούνται για εκπαίδευση μοντέλων
              (API usage policy)
            </li>
            <li>
              <span className="text-violet-300">Stripe:</span> επεξεργασία πληρωμών — υπόκειται στη
              δική της Πολιτική Απορρήτου
            </li>
          </ul>
          <p className="mt-2">
            Δεν πωλούμε, δεν ενοικιάζουμε και δεν μοιραζόμαστε τα δεδομένα σας με τρίτους για
            σκοπούς μάρκετινγκ.
          </p>
        </Section>

        <Section title="5. Διατήρηση Δεδομένων">
          <ul className="list-disc list-inside space-y-1 text-violet-400">
            <li>
              <span className="text-violet-300">Λογαριασμός & αναγνώσεις:</span> διατηρούνται για όσο
              διατηρείτε ενεργό λογαριασμό + 30 ημέρες μετά τη διαγραφή
            </li>
            <li>
              <span className="text-violet-300">Φωτογραφίες φλιτζανιού:</span> διατηρούνται για 90
              ημέρες, στη συνέχεια διαγράφονται αυτόματα
            </li>
            <li>
              <span className="text-violet-300">Δεδομένα πληρωμής:</span> η Stripe διατηρεί αρχεία
              σύμφωνα με τις νομικές υποχρεώσεις (7 χρόνια)
            </li>
          </ul>
        </Section>

        <Section title="6. Τα Δικαιώματά σας (GDPR)">
          <p>Ως υποκείμενο δεδομένων εντός ΕΕ, έχετε δικαίωμα:</p>
          <ul className="list-disc list-inside space-y-1 mt-2 text-violet-400">
            <li><span className="text-violet-300">Πρόσβασης</span> στα δεδομένα σας</li>
            <li><span className="text-violet-300">Διόρθωσης</span> ανακριβών δεδομένων</li>
            <li><span className="text-violet-300">Διαγραφής</span> («δικαίωμα στη λήθη»)</li>
            <li><span className="text-violet-300">Φορητότητας</span> δεδομένων σε δομημένη μορφή</li>
            <li><span className="text-violet-300">Εναντίωσης</span> στην επεξεργασία</li>
            <li><span className="text-violet-300">Περιορισμού</span> της επεξεργασίας</li>
          </ul>
          <p className="mt-2">
            Για άσκηση των δικαιωμάτων σας αποστείλτε αίτηση στο{" "}
            <a href="mailto:privacy@kafetzou.com" className="text-amber-400 hover:underline">
              privacy@kafetzou.com
            </a>
            . Απαντούμε εντός 30 ημερών. Έχετε επίσης δικαίωμα καταγγελίας στην{" "}
            <span className="text-violet-300">
              Αρχή Προστασίας Δεδομένων Προσωπικού Χαρακτήρα (ΑΠΔΠΧ)
            </span>
            .
          </p>
        </Section>

        <Section title="7. Ασφάλεια Δεδομένων">
          <p>
            Εφαρμόζουμε τεχνικά και οργανωτικά μέτρα για την προστασία των δεδομένων σας:
            κρυπτογράφηση TLS κατά τη μεταφορά, κρυπτογράφηση δεδομένων σε κατάσταση ηρεμίας,
            έλεγχος πρόσβασης βάσει ρόλων και τακτικές αξιολογήσεις ασφαλείας.
          </p>
        </Section>

        <Section title="8. Cookies">
          <p>
            Χρησιμοποιούμε μόνο απαραίτητα cookies για την αυθεντικοποίηση (JWT tokens μέσω AWS
            Cognito/Amplify). Δεν χρησιμοποιούμε cookies παρακολούθησης ή διαφήμισης.
          </p>
        </Section>

        <Section title="9. Ανήλικοι">
          <p>
            Η υπηρεσία απευθύνεται σε άτομα άνω των 18 ετών. Δεν συλλέγουμε εν γνώσει μας δεδομένα
            ανηλίκων. Εάν εντοπίσετε τέτοια δεδομένα, επικοινωνήστε μαζί μας άμεσα.
          </p>
        </Section>

        <Section title="10. Αλλαγές στην Πολιτική">
          <p>
            Ενδέχεται να ενημερώνουμε την παρούσα Πολιτική περιοδικά. Σε περίπτωση ουσιαστικών
            αλλαγών, θα σας ειδοποιήσουμε μέσω email ή ανακοίνωσης στην εφαρμογή τουλάχιστον 14
            ημέρες πριν την εφαρμογή τους.
          </p>
        </Section>

        <div className="mt-8 pt-6 border-t border-violet-800/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-violet-600">
          <span>© 2026 Kafetzou. Με επιφύλαξη παντός δικαιώματος.</span>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-violet-400 transition-colors">Όροι Χρήσης</Link>
            <Link href="/" className="hover:text-violet-400 transition-colors">Αρχική</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
