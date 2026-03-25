import { XCircle, ArrowRight } from "lucide-react";

const sellerProblems = [
  "Struggling to move dead inventory?",
  "No reliable buyers for bulk stock?",
  "Paying fees with zero results?",
];

const buyerProblems = [
  "Hard to find trusted UK suppliers?",
  "Dealing with unreliable sellers?",
  "No transparency in pricing or quality?",
];

const ProblemSolutionSection = () => {
  return (
    <section className="py-14 bg-slate-50 border-y border-border">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
            Built for Real Trade — Not Just Listings
          </h2>
          <p className="mt-2 text-muted-foreground max-w-xl mx-auto">
            We understand the real problems in B2B trading.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Sellers */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                <XCircle className="h-4 w-4 text-red-500" />
              </div>
              <h3 className="font-display font-semibold text-foreground text-sm uppercase tracking-wider text-red-600">
                For Sellers
              </h3>
            </div>
            <ul className="space-y-3">
              {sellerProblems.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-slate-700 text-sm">
                  <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  {p}
                </li>
              ))}
            </ul>
          </div>

          {/* Buyers */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                <XCircle className="h-4 w-4 text-red-500" />
              </div>
              <h3 className="font-display font-semibold text-foreground text-sm uppercase tracking-wider text-red-600">
                For Buyers
              </h3>
            </div>
            <ul className="space-y-3">
              {buyerProblems.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-slate-700 text-sm">
                  <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Solution */}
        <div className="mt-8 max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-3 bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200/60 rounded-2xl px-6 py-4">
            <ArrowRight className="h-5 w-5 text-emerald-600 shrink-0" />
            <p className="text-base font-semibold text-slate-800">
              Loadify connects buyers and sellers in one secure UK marketplace.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSolutionSection;
