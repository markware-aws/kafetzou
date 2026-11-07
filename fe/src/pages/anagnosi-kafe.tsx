import type { GetStaticProps } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Seo } from "@/components/seo";
import { ContentLayout, ContentSection, FeatureCta } from "@/components/content-layout";
import { coffeeSymbolPath } from "@/lib/coffee-symbols";
import { getCoffeeSymbol } from "@/lib/content-data";

/** The symbols readers ask about most; each links to its guide page. */
const POPULAR_SYMBOL_SLUGS = [
  "kardia",
  "pouli",
  "fidi",
  "psari",
  "dachtylidi",
  "dromos",
  "porta",
  "stavros",
  "dentro",
  "mati",
  "grammata",
  "karavi",
];

const STEPS = [
  {
    title: "Πιες τον καφέ σου",
    text: "Ελληνικός καφές, ιδανικά σε φλιτζάνι με λευκό εσωτερικό. Όταν τελειώσεις, κάνε την ευχή σου, γύρισε το φλιτζάνι ανάποδα στο πιατάκι και άφησέ το λίγα λεπτά να κρυώσει και να στραγγίξει.",
  },
  {
    title: "Φωτογράφισε το εσωτερικό",
    text: "Ανέβασε έως 3 φωτογραφίες, από ψηλά και από διαφορετικές πλευρές, ώστε να φαίνονται τα τοιχώματα, ο πάτος και το χερούλι.",
  },
  {
    title: "Διάβασε τι σου λέει",
    text: "Η καφετζού εντοπίζει τα σύμβολα, πού βρίσκονται και πόσο πυκνό είναι το κατακάθι, και σου δίνει ανάγνωση για την αγάπη, τη δουλειά, την τύχη και μια γενική πρόβλεψη.",
  },
];

const CUP_ZONES = [
  {
    zone: "Το χερούλι",
    text: "Είσαι εσύ και το σπίτι σου. Ό,τι βρίσκεται κοντά του σε αφορά άμεσα, όσο απομακρύνεται αφορά τους γύρω σου.",
  },
  { zone: "Το χείλος", text: "Όσα έρχονται σύντομα, μέσα σε μέρες ή λίγες εβδομάδες." },
  { zone: "Η μέση", text: "Όσα είναι σε εξέλιξη και θα ξεδιπλωθούν τους επόμενους μήνες." },
  { zone: "Ο πάτος", text: "Το παρελθόν και τα βαθύτερα, μακροπρόθεσμα ζητήματα." },
  {
    zone: "Σκούρο και λευκό",
    text: "Οι πυκνές, σκούρες περιοχές είναι στενοχώριες ή βάρη. Τα καθαρά λευκά κομμάτια είναι ανοιχτοί δρόμοι και ανακούφιση.",
  },
];

const PHOTO_TIPS = [
  "Φυσικό φως, κοντά σε παράθυρο. Το φλας κάνει αντανακλάσεις που κρύβουν τα σχήματα.",
  "Κράτα το κινητό σταθερό και άγγιξε την οθόνη πάνω στο κατακάθι για να εστιάσει.",
  "Να χωράει όλο το εσωτερικό στο κάδρο, μαζί με το χείλος και το χερούλι.",
  "Μη σκουπίσεις ούτε φυσήξεις το φλιτζάνι: και οι σταγόνες στο χείλος διαβάζονται.",
];

const FAQ = [
  {
    question: "Είναι δωρεάν;",
    answer:
      "Με την εγγραφή παίρνεις 5 δωρεάν credits. Μια ανάγνωση καφέ κοστίζει 2 credits, οπότε οι δύο πρώτες αναγνώσεις είναι δωρεάν.",
  },
  {
    question: "Ποιος διαβάζει τον καφέ μου;",
    answer:
      "Η ανάγνωση γίνεται με τεχνητή νοημοσύνη σε δύο βήματα: πρώτα εντοπίζει τα σχήματα και τα σύμβολα στο κατακάθι, και μετά τα ερμηνεύει όπως θα το έκανε μια έμπειρη καφετζού.",
  },
  {
    question: "Τι γίνεται αν η φωτογραφία δεν δείχνει φλιτζάνι;",
    answer:
      "Αν η εικόνα δεν δείχνει φλιτζάνι καφέ με κατακάθι, η ανάγνωση σταματά και δεν χρεώνεσαι credits. Δοκίμασε ξανά με καθαρότερη φωτογραφία.",
  },
  {
    question: "Μπορώ να ξαναδιαβάσω παλιές αναγνώσεις;",
    answer: "Ναι. Όλες οι αναγνώσεις σου μένουν στο Ιστορικό του λογαριασμού σου.",
  },
  {
    question: "Είναι αληθινή πρόβλεψη;",
    answer:
      "Η ανάγνωση του καφέ είναι παράδοση και αφορμή για κουβέντα και σκέψη. Διάβασέ την για ψυχαγωγία, όχι για αποφάσεις υγείας, χρημάτων ή νομικών θεμάτων.",
  },
];

interface PopularSymbol {
  slug: string;
  name: string;
}

interface CoffeeLandingProps {
  popularSymbols: PopularSymbol[];
}

export const getStaticProps: GetStaticProps<CoffeeLandingProps> = async () => ({
  props: {
    popularSymbols: POPULAR_SYMBOL_SLUGS.map((slug) => {
      const symbol = getCoffeeSymbol(slug);
      return { slug: symbol.slug, name: symbol.name };
    }),
  },
});

export default function CoffeeReadingLanding({ popularSymbols }: CoffeeLandingProps) {
  return (
    <ContentLayout breadcrumbs={[{ label: "Ανάγνωση καφέ", path: "/anagnosi-kafe/" }]}>
      <Seo
        title="Καφετζού Online: Ανάγνωση Καφέ με Φωτογραφία"
        description="Φωτογράφισε το φλιτζάνι σου και διάβασε τον καφέ σου online: σύμβολα, αγάπη, δουλειά και τύχη. Οι δύο πρώτες αναγνώσεις είναι δωρεάν."
        path="/anagnosi-kafe/"
      />

      <h1 className="text-3xl sm:text-4xl font-semibold text-violet-50 tracking-tight">
        Ανάγνωση καφέ online
      </h1>
      <p className="mt-4 text-lg text-violet-200 leading-relaxed">
        Δεν χρειάζεται να περιμένεις τη γειτόνισσα για να σου πει τον καφέ. Φωτογράφισε το
        φλιτζάνι σου και η καφετζού του Fortune Teller διαβάζει τα σχήματα που άφησε το
        κατακάθι: τι δείχνουν για την αγάπη, τη δουλειά και την τύχη σου.
      </p>
      <Link
        href="/upload"
        className="mt-6 inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-md px-5 py-2.5 text-sm transition-colors"
      >
        Διάβασε τον καφέ σου
        <ChevronRight className="w-4 h-4" />
      </Link>

      <ContentSection title="Πώς λειτουργεί">
        <ol className="flex flex-col gap-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-4 rounded-lg border border-violet-800 bg-surface p-4">
              <span className="text-sm font-semibold text-amber-400 tabular-nums">{index + 1}</span>
              <div>
                <h3 className="text-sm font-medium text-violet-50">{step.title}</h3>
                <p className="mt-1 text-sm text-violet-200 leading-relaxed">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </ContentSection>

      <ContentSection title="Πώς διαβάζεται το φλιτζάνι">
        <p>
          Η καφετζού δεν κοιτάζει μόνο τι σχήμα βλέπει, αλλά και πού βρίσκεται. Το ίδιο πουλί
          σημαίνει άλλο πράγμα δίπλα στο χερούλι και άλλο στον πάτο.
        </p>
        <dl className="flex flex-col divide-y divide-violet-800 rounded-lg border border-violet-800 bg-surface">
          {CUP_ZONES.map((item) => (
            <div key={item.zone} className="p-4 sm:flex sm:gap-6">
              <dt className="text-sm font-medium text-violet-50 sm:w-36 shrink-0">{item.zone}</dt>
              <dd className="mt-1 sm:mt-0 text-sm text-violet-200 leading-relaxed">{item.text}</dd>
            </div>
          ))}
        </dl>
      </ContentSection>

      <ContentSection title="Τα πιο συχνά σύμβολα">
        <p>
          Από τα εκατοντάδες σχήματα που μπορεί να αφήσει ο καφές, αυτά είναι εκείνα που
          ψάχνουν οι περισσότεροι. Κάθε σύμβολο έχει τη δική του σελίδα με τη σημασία του σε
          κάθε σημείο του φλιτζανιού.
        </p>
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {popularSymbols.map((symbol) => (
            <li key={symbol.slug}>
              <Link
                href={coffeeSymbolPath(symbol.slug)}
                className="block rounded-md border border-violet-800 bg-surface px-3 py-2 text-sm text-violet-100 hover:border-violet-600 hover:text-violet-50 transition-colors"
              >
                {symbol.name} στον καφέ
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/symvola-kafe/"
          className="inline-flex items-center gap-1 text-sm text-amber-400 hover:text-amber-300"
        >
          Όλα τα σύμβολα στον καφέ
          <ChevronRight className="w-4 h-4" />
        </Link>
      </ContentSection>

      <ContentSection title="Για καθαρή φωτογραφία">
        <ul className="flex flex-col gap-2 list-disc pl-5">
          {PHOTO_TIPS.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </ContentSection>

      <ContentSection title="Συχνές ερωτήσεις">
        <div className="flex flex-col gap-5">
          {FAQ.map((item) => (
            <div key={item.question}>
              <h3 className="text-sm font-medium text-violet-50">{item.question}</h3>
              <p className="mt-1 text-sm text-violet-200 leading-relaxed">{item.answer}</p>
            </div>
          ))}
        </div>
      </ContentSection>

      <FeatureCta feature="coffee" />
    </ContentLayout>
  );
}
