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

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <Seo
        title="Όροι Χρήσης"
        description="Οι όροι χρήσης του Fortune Teller: εγγραφή και ηλικιακό όριο, credits, πληρωμές και επιστροφές. Η υπηρεσία είναι για ψυχαγωγικούς σκοπούς."
        path="/terms/"
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
          <h1 className="text-2xl font-semibold text-violet-50">Όροι Χρήσης</h1>
          <p className="mt-1 text-sm text-violet-300">
            Τελευταία ενημέρωση: Νοέμβριος 2026
          </p>
        </div>

        <div className="rounded-lg border border-violet-800 bg-surface p-4 mb-8">
          <p className="text-base text-violet-100 leading-relaxed">
            <span className="font-medium text-violet-50">Σημαντική Σημείωση:</span> Η Fortune
            Teller παρέχει υπηρεσίες αποκλειστικά για{" "}
            <span className="font-medium text-violet-50">ψυχαγωγικούς σκοπούς</span>. Οι
            αναγνώσεις καφέ, ταρό, αστρολογίας και ονείρων δεν αποτελούν
            επαγγελματικές συμβουλές οποιουδήποτε είδους.
          </p>
        </div>

        <Section title="1. Αποδοχή Όρων">
          <p>
            Με τη δημιουργία λογαριασμού ή τη χρήση της υπηρεσίας Fortune
            Teller, αποδέχεστε πλήρως τους παρόντες Όρους Χρήσης.
          </p>
        </Section>

        <Section title="2. Περιγραφή Υπηρεσίας">
          <p>
            Η Fortune Teller είναι μια εφαρμογή τεχνητής νοημοσύνης που παρέχει:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <span className="font-medium text-violet-50">Ανάγνωση καφέ</span> μέσω
              φωτογραφίας φλιτζανιού (2 credits)
            </li>
            <li>
              <span className="font-medium text-violet-50">Ανάγνωση ταρό</span> με AI
              ερμηνεία (1 credit)
            </li>
            <li>
              <span className="font-medium text-violet-50">Αστρολογικές προβλέψεις</span> —
              δωρεάν ημερήσιες/εβδομαδιαίες/μηνιαίες ανά ζώδιο
            </li>
            <li>
              <span className="font-medium text-violet-50">Εξατομικευμένη αστρολογία</span>{" "}
              βάσει γεννητικού χάρτη (1 credit)
            </li>
            <li>
              <span className="font-medium text-violet-50">Ανάγνωση αστρολογικού χάρτη</span>{" "}
              με όλους τους πλανήτες, τους οίκους και τις όψεις (2 credits)
            </li>
            <li>
              <span className="font-medium text-violet-50">Ερμηνεία ονείρων</span> (1
              credit)
            </li>
            <li>
              <span className="font-medium text-violet-50">
                Δωρεάν ημερήσια κάρτα ταρό
              </span>{" "}
              (χωρίς credits)
            </li>
          </ul>
        </Section>

        <Section title="3. Εγγραφή & Ηλικιακό Όριο">
          <p>
            Για να χρησιμοποιήσετε την υπηρεσία πρέπει να είστε τουλάχιστον{" "}
            <span className="font-medium text-violet-50">18 ετών</span>.
          </p>
        </Section>

        <Section title="4. Σύστημα Credits">
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Νέοι χρήστες λαμβάνουν{" "}
              <span className="font-medium text-violet-50">5 δωρεάν credits</span> κατά την
              εγγραφή
            </li>
            <li>
              Επιπλέον credits αγοράζονται μέσω ασφαλούς υπηρεσίας πληρωμής
            </li>
            <li>
              Τα credits δεν λήγουν, δεν είναι μεταβιβάσιμα και δεν έχουν
              νομισματική αξία
            </li>
            <li>
              Δεν γίνονται επιστροφές χρημάτων για αχρησιμοποίητα credits εκτός
              εξαιρετικών περιστάσεων
            </li>
          </ul>
        </Section>

        <Section title="5. Πληρωμές & Επιστροφές">
          <p>
            Οι πληρωμές διεκπεραιώνονται μέσω{" "}
            <span className="text-violet-100">Stripe</span>. Λόγω της ψηφιακής
            φύσης της υπηρεσίας, μετά τη χρήση credits δεν πραγματοποιούνται
            επιστροφές.
          </p>
        </Section>

        <Section title="6. Αποποίηση Ευθύνης — Ψυχαγωγικός Σκοπός">
          <p>
            Οι αναγνώσεις παράγονται από τεχνητή νοημοσύνη και προορίζονται{" "}
            <span className="font-medium text-violet-50">
              αποκλειστικά για ψυχαγωγία
            </span>
            .
          </p>
        </Section>

        <Section title="7. Αποδεκτή Χρήση">
          <p>Απαγορεύεται:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Η χρήση αυτοματοποιημένων εργαλείων (bots, scrapers) για πρόσβαση
              στην υπηρεσία ή για εξαγωγή του περιεχομένου της, με εξαίρεση τις
              μηχανές αναζήτησης που ευρετηριάζουν τις δημόσιες σελίδες
            </li>
            <li>Η απόπειρα παράκαμψης του συστήματος credits</li>
            <li>Η αποστολή παράνομου ή προσβλητικού υλικού</li>
            <li>
              Η μεταπώληση ή η εμπορική εκμετάλλευση των αναγνώσεων χωρίς άδεια
            </li>
          </ul>
        </Section>

        <Section title="8. Πνευματική Ιδιοκτησία">
          <p>
            Το σύνολο του περιεχομένου της υπηρεσίας, όπως κείμενα, αναγνώσεις,
            ο ονειροκρίτης, οι οδηγοί για τα σύμβολα του καφέ, τις κάρτες ταρό
            και τα ζώδια, εικόνες, γραφικά και ο σχεδιασμός, ανήκει στην Fortune
            Teller ή σε δικαιοπάροχους και προστατεύεται από τη νομοθεσία για την
            πνευματική ιδιοκτησία.
          </p>
          <p>
            <span className="font-medium text-violet-50">
              Απαγορεύεται η αντιγραφή και η λήψη (κατέβασμα)
            </span>{" "}
            του περιεχομένου, καθώς και η αποθήκευση, αναπαραγωγή,
            αναδημοσίευση, τροποποίηση ή διανομή του, εν όλω ή εν μέρει, με
            οποιονδήποτε τρόπο ή μέσο, χωρίς προηγούμενη γραπτή άδεια της
            Fortune Teller. Επιτρέπεται μόνο η προβολή του περιεχομένου μέσα από
            την υπηρεσία, για προσωπική και μη εμπορική χρήση.
          </p>
        </Section>

        <Section title="9. Τερματισμός Λογαριασμού">
          <p>
            Μπορείτε να διαγράψετε τον λογαριασμό σας ανά πάσα στιγμή
            επικοινωνώντας μαζί μας.
          </p>
        </Section>

        <Section title="10. Προσωπικά Δεδομένα & Cookies">
          <p>
            Ο τρόπος με τον οποίο επεξεργαζόμαστε τα προσωπικά σας δεδομένα και
            χρησιμοποιούμε cookies περιγράφεται στην{" "}
            <Link
              href="/privacy/"
              className="text-amber-400 hover:text-amber-300 transition-colors"
            >
              Πολιτική Απορρήτου
            </Link>
            . Τα cookies στατιστικών (Google Analytics) χρησιμοποιούνται μόνο με τη
            συγκατάθεσή σας, την οποία μπορείτε να αλλάξετε ανά πάσα στιγμή από τις
            «Ρυθμίσεις cookies» στο κάτω μέρος κάθε σελίδας.
          </p>
        </Section>

        <Section title="11. Περιορισμός Ευθύνης">
          <p>
            Στο μέγιστο βαθμό που επιτρέπεται από την ισχύουσα νομοθεσία, η
            Fortune Teller δεν φέρει ευθύνη για έμμεσες, τυχαίες ή αποθετικές
            ζημίες.
          </p>
        </Section>

        <Section title="12. Εφαρμοστέο Δίκαιο & Δικαιοδοσία">
          <p>
            Οι παρόντες Όροι διέπονται από το{" "}
            <span className="text-violet-100">ελληνικό δίκαιο</span>. Αρμόδια
            είναι τα Δικαστήρια Αθηνών.
          </p>
        </Section>

        <Section title="13. Επικοινωνία">
          <p>
            Για ερωτήσεις σχετικά με τους Όρους Χρήσης:{" "}
            <a
              href="mailto:support@fortuneteller.gr"
              className="text-amber-400 hover:text-amber-300 transition-colors"
            >
              support@fortuneteller.gr
            </a>
          </p>
        </Section>
      </div>
    </div>
  );
}
