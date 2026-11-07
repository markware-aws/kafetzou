import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Seo } from "@/components/seo";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-violet-50 mb-2">{title}</h2>
      <div className="text-base text-violet-200 leading-relaxed space-y-2">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <Seo
        title="Πολιτική Απορρήτου"
        description="Ποια δεδομένα συλλέγει το Fortune Teller, γιατί, για πόσο τα κρατάμε και ποια δικαιώματα έχεις σύμφωνα με τον GDPR."
        path="/privacy/"
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
          <h1 className="text-2xl font-semibold text-violet-50">
            Πολιτική Απορρήτου
          </h1>
          <p className="mt-1 text-sm text-violet-300">
            Τελευταία ενημέρωση: Μάρτιος 2026
          </p>
        </div>

        <p className="mb-8 text-base text-violet-200 leading-relaxed">
          Η Fortune Teller («εμείς», «η υπηρεσία») σέβεται την ιδιωτικότητά
          σας και δεσμεύεται να προστατεύει τα προσωπικά σας δεδομένα σύμφωνα
          με τον Γενικό Κανονισμό Προστασίας Δεδομένων (GDPR — Κανονισμός ΕΕ
          2016/679) και την ισχύουσα ελληνική νομοθεσία.
        </p>

        <Section title="1. Υπεύθυνος Επεξεργασίας">
          <p>
            Υπεύθυνος επεξεργασίας των δεδομένων σας είναι η Fortune Teller. Για
            οποιοδήποτε ζήτημα σχετικό με την προστασία δεδομένων, επικοινωνήστε
            μαζί μας στη διεύθυνση:{" "}
            <a
              href="mailto:support@fortuneteller.gr"
              className="text-amber-400 hover:text-amber-300 transition-colors"
            >
              support@fortuneteller.gr
            </a>
          </p>
        </Section>

        <Section title="2. Δεδομένα που Συλλέγουμε">
          <p>Συλλέγουμε τις παρακάτω κατηγορίες προσωπικών δεδομένων:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <span className="font-medium text-violet-50">Στοιχεία λογαριασμού:</span>{" "}
              διεύθυνση email, κωδικός πρόσβασης (αποθηκεύεται κρυπτογραφημένος)
            </li>
            <li>
              <span className="font-medium text-violet-50">
                Αστρολογικό προφίλ (προαιρετικό):
              </span>{" "}
              ημερομηνία, ώρα και τόπος γέννησης, φύλο, χρώμα ματιών
            </li>
            <li>
              <span className="font-medium text-violet-50">Φωτογραφίες φλιτζανιού:</span>{" "}
              εικόνες για την ανάγνωση καφέ, αποθηκευμένες σε ασφαλείς
              διακομιστές εντός ΕΕ
            </li>
            <li>
              <span className="font-medium text-violet-50">Ιστορικό αναγνώσεων:</span>{" "}
              αποτελέσματα αναγνώσεων καφέ, ταρό, αστρολογίας και ονείρων
            </li>
            <li>
              <span className="font-medium text-violet-50">Δεδομένα πληρωμής:</span>{" "}
              διαχειρίζεται αποκλειστικά από τον πάροχο πληρωμών — δεν
              αποθηκεύουμε στοιχεία κάρτας
            </li>
            <li>
              <span className="font-medium text-violet-50">Τεχνικά δεδομένα:</span>{" "}
              διεύθυνση IP, τύπος προγράμματος περιήγησης
            </li>
          </ul>
        </Section>

        <Section title="3. Σκοπός & Νομική Βάση Επεξεργασίας">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <span className="font-medium text-violet-50">Εκτέλεση σύμβασης:</span> παροχή
              αναγνώσεων, διαχείριση λογαριασμού και credits
            </li>
            <li>
              <span className="font-medium text-violet-50">Εκτέλεση σύμβασης:</span>{" "}
              επεξεργασία πληρωμών μέσω Stripe
            </li>
            <li>
              <span className="font-medium text-violet-50">Εννόμο συμφέρον:</span> βελτίωση
              της υπηρεσίας, ασφάλεια, ανίχνευση απάτης
            </li>
            <li>
              <span className="font-medium text-violet-50">Συγκατάθεση:</span> αποθήκευση
              αστρολογικού προφίλ (μπορείτε να το διαγράψετε ανά πάσα στιγμή)
            </li>
          </ul>
        </Section>

        <Section title="4. Διαβίβαση Δεδομένων σε Τρίτους">
          <p>
            Χρησιμοποιούμε αξιόπιστους παρόχους υπηρεσιών για τη λειτουργία της
            πλατφόρμας:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <span className="font-medium text-violet-50">Πάροχος cloud υποδομής:</span>{" "}
              φιλοξενία, αποθήκευση δεδομένων — οι διακομιστές βρίσκονται εντός
              ΕΕ (Φρανκφούρτη, Γερμανία)
            </li>
            <li>
              <span className="font-medium text-violet-50">
                Υπηρεσία τεχνητής νοημοσύνης:
              </span>{" "}
              επεξεργασία εικόνων και κειμένου — τα δεδομένα σας δεν
              χρησιμοποιούνται για εκπαίδευση μοντέλων
            </li>
            <li>
              <span className="font-medium text-violet-50">
                Πάροχος πληρωμών (Stripe):
              </span>{" "}
              ασφαλής επεξεργασία συναλλαγών
            </li>
          </ul>
          <p className="mt-2">
            Δεν πωλούμε, δεν ενοικιάζουμε και δεν μοιραζόμαστε τα δεδομένα σας
            με τρίτους για σκοπούς μάρκετινγκ.
          </p>
        </Section>

        <Section title="5. Διατήρηση Δεδομένων">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <span className="font-medium text-violet-50">Λογαριασμός & αναγνώσεις:</span>{" "}
              διατηρούνται για όσο διατηρείτε ενεργό λογαριασμό + 30 ημέρες μετά
              τη διαγραφή
            </li>
            <li>
              <span className="font-medium text-violet-50">Φωτογραφίες φλιτζανιού:</span>{" "}
              διατηρούνται για 90 ημέρες, στη συνέχεια διαγράφονται αυτόματα
            </li>
            <li>
              <span className="font-medium text-violet-50">Δεδομένα πληρωμής:</span> η
              Stripe διατηρεί αρχεία σύμφωνα με τις νομικές υποχρεώσεις (7
              χρόνια)
            </li>
          </ul>
        </Section>

        <Section title="6. Τα Δικαιώματά σας (GDPR)">
          <p>Ως υποκείμενο δεδομένων εντός ΕΕ, έχετε δικαίωμα:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <span className="font-medium text-violet-50">Πρόσβασης</span> στα δεδομένα
              σας
            </li>
            <li>
              <span className="font-medium text-violet-50">Διόρθωσης</span> ανακριβών
              δεδομένων
            </li>
            <li>
              <span className="font-medium text-violet-50">Διαγραφής</span> («δικαίωμα στη
              λήθη»)
            </li>
            <li>
              <span className="font-medium text-violet-50">Φορητότητας</span> δεδομένων σε
              δομημένη μορφή
            </li>
            <li>
              <span className="font-medium text-violet-50">Εναντίωσης</span> στην
              επεξεργασία
            </li>
            <li>
              <span className="font-medium text-violet-50">Περιορισμού</span> της
              επεξεργασίας
            </li>
          </ul>
          <p className="mt-2">
            Για άσκηση των δικαιωμάτων σας αποστείλτε αίτηση στο{" "}
            <a
              href="mailto:support@fortuneteller.gr"
              className="text-amber-400 hover:text-amber-300 transition-colors"
            >
              support@fortuneteller.gr
            </a>
            . Απαντούμε εντός 30 ημερών.
          </p>
        </Section>

        <Section title="7. Ασφάλεια Δεδομένων">
          <p>
            Εφαρμόζουμε τεχνικά και οργανωτικά μέτρα για την προστασία των
            δεδομένων σας: κρυπτογράφηση TLS κατά τη μεταφορά, κρυπτογράφηση
            δεδομένων σε κατάσταση ηρεμίας, έλεγχος πρόσβασης βάσει ρόλων και
            τακτικές αξιολογήσεις ασφαλείας.
          </p>
        </Section>

        <Section title="8. Cookies">
          <p>
            Χρησιμοποιούμε μόνο απαραίτητα cookies για την αυθεντικοποίηση και
            τη διατήρηση της σύνδεσής σας. Δεν χρησιμοποιούμε cookies
            παρακολούθησης ή διαφήμισης.
          </p>
        </Section>

        <Section title="9. Ανήλικοι">
          <p>
            Η υπηρεσία απευθύνεται σε άτομα άνω των 18 ετών. Δεν συλλέγουμε εν
            γνώσει μας δεδομένα ανηλίκων.
          </p>
        </Section>

        <Section title="10. Αλλαγές στην Πολιτική">
          <p>
            Ενδέχεται να ενημερώνουμε την παρούσα Πολιτική περιοδικά. Σε
            περίπτωση ουσιαστικών αλλαγών, θα σας ειδοποιήσουμε μέσω email
            τουλάχιστον 14 ημέρες πριν την εφαρμογή τους.
          </p>
        </Section>
      </div>
    </div>
  );
}
