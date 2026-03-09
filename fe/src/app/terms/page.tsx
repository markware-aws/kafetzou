"use client";

import Link from "next/link";
import { ArrowLeft, ScrollText } from "lucide-react";

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

export default function TermsPage() {
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
            <ScrollText className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-violet-100">Όροι Χρήσης</h1>
            <p className="text-xs text-violet-500 mt-0.5">Τελευταία ενημέρωση: Μάρτιος 2026</p>
          </div>
        </div>

        {/* Disclaimer banner */}
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 mb-8">
          <p className="text-sm text-amber-200 leading-relaxed">
            <span className="font-semibold">Σημαντική Σημείωση:</span> Η Kafetzou παρέχει υπηρεσίες
            αποκλειστικά για <span className="font-semibold">ψυχαγωγικούς σκοπούς</span>. Οι
            αναγνώσεις καφέ, ταρό, αστρολογίας και ονείρων δεν αποτελούν επαγγελματικές συμβουλές
            οποιουδήποτε είδους (ιατρικές, νομικές, οικονομικές, ψυχολογικές). Μην βασίζετε
            σημαντικές αποφάσεις της ζωής σας αποκλειστικά στο περιεχόμενο των αναγνώσεων.
          </p>
        </div>

        <Section title="1. Αποδοχή Όρων">
          <p>
            Με τη δημιουργία λογαριασμού ή τη χρήση της υπηρεσίας Kafetzou, αποδέχεστε πλήρως τους
            παρόντες Όρους Χρήσης. Εάν δεν συμφωνείτε, παρακαλούμε μη χρησιμοποιείτε την υπηρεσία.
          </p>
        </Section>

        <Section title="2. Περιγραφή Υπηρεσίας">
          <p>
            Η Kafetzou είναι μια εφαρμογή τεχνητής νοημοσύνης που παρέχει:
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2 text-violet-400">
            <li><span className="text-violet-300">Ανάγνωση καφέ</span> μέσω φωτογραφίας φλιτζανιού (2 credits)</li>
            <li><span className="text-violet-300">Ανάγνωση ταρό</span> με AI ερμηνεία (1 credit)</li>
            <li><span className="text-violet-300">Αστρολογικές προβλέψεις</span> — δωρεάν ημερήσιες/εβδομαδιαίες/μηνιαίες ανά ζώδιο</li>
            <li><span className="text-violet-300">Εξατομικευμένη αστρολογία</span> βάσει γεννητικού χάρτη (1 credit)</li>
            <li><span className="text-violet-300">Ερμηνεία ονείρων</span> (1 credit)</li>
            <li><span className="text-violet-300">Δωρεάν ημερήσια κάρτα ταρό</span> (χωρίς credits)</li>
          </ul>
        </Section>

        <Section title="3. Εγγραφή & Ηλικιακό Όριο">
          <p>
            Για να χρησιμοποιήσετε την υπηρεσία πρέπει να είστε τουλάχιστον{" "}
            <span className="text-violet-100 font-semibold">18 ετών</span>. Δηλώνοντας ανακριβή ηλικία
            παραβιάζετε τους παρόντες Όρους. Είστε υπεύθυνοι για τη διατήρηση της εμπιστευτικότητας
            του κωδικού πρόσβασής σας.
          </p>
        </Section>

        <Section title="4. Σύστημα Credits">
          <p>
            Η υπηρεσία λειτουργεί με σύστημα credits:
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2 text-violet-400">
            <li>Νέοι χρήστες λαμβάνουν <span className="text-violet-300">5 δωρεάν credits</span> κατά την εγγραφή</li>
            <li>Επιπλέον credits αγοράζονται μέσω της υπηρεσίας πληρωμής Stripe</li>
            <li>Τα credits δεν λήγουν, δεν είναι μεταβιβάσιμα και δεν έχουν νομισματική αξία</li>
            <li>Δεν γίνονται επιστροφές χρημάτων για αχρησιμοποίητα credits εκτός εξαιρετικών περιστάσεων</li>
            <li>Διατηρούμε το δικαίωμα τροποποίησης της τιμολόγησης με ειδοποίηση 14 ημερών</li>
          </ul>
        </Section>

        <Section title="5. Πληρωμές & Επιστροφές">
          <p>
            Οι πληρωμές διεκπεραιώνονται μέσω <span className="text-violet-100">Stripe</span>. Αποδεχόμαστε
            τις κύριες πιστωτικές και χρεωστικές κάρτες. Όλες οι τιμές περιλαμβάνουν ΦΠΑ.
          </p>
          <p>
            Λόγω της ψηφιακής φύσης της υπηρεσίας και της άμεσης παράδοσης περιεχομένου, ισχύει το
            δικαίωμα υπαναχώρησης <span className="text-violet-100">μόνο πριν</span> την εκκίνηση
            οποιασδήποτε ανάγνωσης. Μετά τη χρήση credits δεν πραγματοποιούνται επιστροφές, εκτός
            από τεχνικό σφάλμα που αποδεδειγμένα εμπόδισε την παροχή της υπηρεσίας.
          </p>
        </Section>

        <Section title="6. Αποποίηση Ευθύνης — Ψυχαγωγικός Σκοπός">
          <p>
            Οι αναγνώσεις παράγονται από τεχνητή νοημοσύνη και προορίζονται{" "}
            <span className="text-violet-100 font-semibold">αποκλειστικά για ψυχαγωγία</span>. Ρητά
            αποποιούμεθα κάθε ευθύνη για:
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2 text-violet-400">
            <li>Αποφάσεις που ελήφθησαν βάσει του περιεχομένου των αναγνώσεων</li>
            <li>Ψυχολογική, ιατρική, νομική ή οικονομική βλάβη</li>
            <li>Ακρίβεια, πληρότητα ή επικαιρότητα των αποτελεσμάτων</li>
          </ul>
          <p className="mt-2">
            Η Kafetzou δεν ασκεί, δεν υποκαθιστά και δεν συνιστά επαγγελματική μαντεία.
          </p>
        </Section>

        <Section title="7. Αποδεκτή Χρήση">
          <p>Απαγορεύεται:</p>
          <ul className="list-disc list-inside space-y-1 mt-2 text-violet-400">
            <li>Η χρήση αυτοματοποιημένων εργαλείων (bots) για πρόσβαση στην υπηρεσία</li>
            <li>Η απόπειρα παράκαμψης του συστήματος credits</li>
            <li>Η αποστολή παράνομου, προσβλητικού ή πορνογραφικού υλικού μέσω της υπηρεσίας</li>
            <li>Η μεταπώληση ή η εμπορική εκμετάλλευση των αναγνώσεων χωρίς άδεια</li>
            <li>Οποιαδήποτε ενέργεια που θέτει σε κίνδυνο την ασφάλεια ή τη διαθεσιμότητα της υπηρεσίας</li>
          </ul>
        </Section>

        <Section title="8. Πνευματική Ιδιοκτησία">
          <p>
            Το σύνολο του περιεχομένου της υπηρεσίας (κώδικας, σχεδιασμός, κείμενα, εικόνες καρτών ταρό)
            ανήκει στην Kafetzou ή σε δικαιοπάροχους. Επιτρέπεται η προσωπική, μη εμπορική χρήση.
          </p>
          <p>
            Τα αποτελέσματα αναγνώσεων που παράγονται για τον λογαριασμό σας ανήκουν σε εσάς. Μας
            παρέχετε άδεια χρήσης των φωτογραφιών σας αποκλειστικά για την παροχή της υπηρεσίας.
          </p>
        </Section>

        <Section title="9. Τερματισμός Λογαριασμού">
          <p>
            Μπορείτε να διαγράψετε τον λογαριασμό σας ανά πάσα στιγμή επικοινωνώντας μαζί μας.
            Διατηρούμε το δικαίωμα αναστολής ή τερματισμού λογαριασμών που παραβιάζουν τους
            παρόντες Όρους, χωρίς προηγούμενη ειδοποίηση σε σοβαρές περιπτώσεις.
          </p>
        </Section>

        <Section title="10. Περιορισμός Ευθύνης">
          <p>
            Στο μέγιστο βαθμό που επιτρέπεται από την ισχύουσα νομοθεσία, η Kafetzou δεν φέρει
            ευθύνη για έμμεσες, τυχαίες ή αποθετικές ζημίες. Η συνολική ευθύνη μας δεν υπερβαίνει
            το ποσό που καταβάλατε για credits τους τελευταίους 3 μήνες.
          </p>
        </Section>

        <Section title="11. Εφαρμοστέο Δίκαιο & Δικαιοδοσία">
          <p>
            Οι παρόντες Όροι διέπονται από το{" "}
            <span className="text-violet-100">ελληνικό δίκαιο</span>. Για οποιαδήποτε διαφορά
            αρμόδια είναι τα Δικαστήρια Αθηνών, με την επιφύλαξη των δικαιωμάτων σας ως
            καταναλωτή βάσει της κοινοτικής νομοθεσίας.
          </p>
        </Section>

        <Section title="12. Επικοινωνία">
          <p>
            Για ερωτήσεις σχετικά με τους Όρους Χρήσης:{" "}
            <a href="mailto:legal@kafetzou.com" className="text-amber-400 hover:underline">
              legal@kafetzou.com
            </a>
          </p>
        </Section>

        <div className="mt-8 pt-6 border-t border-violet-800/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-violet-600">
          <span>© 2026 Kafetzou. Με επιφύλαξη παντός δικαιώματος.</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-violet-400 transition-colors">Πολιτική Απορρήτου</Link>
            <Link href="/" className="hover:text-violet-400 transition-colors">Αρχική</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
