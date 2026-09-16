import Link from "next/link";

export default function Home() {
  return (
    <main className="app-shell text-white">
      <section className="page-container flex min-h-screen items-center py-16 sm:py-20">
        <div className="max-w-5xl">
          <p className="text-sm uppercase tracking-[0.3em] text-gray-500">
            AI-powered laptop discovery
          </p>

          <h1 className="mt-5 max-w-4xl text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Find the right laptop,
            <span className="block text-gray-400">
              without guessing.
            </span>
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-8 text-gray-400">
            Browse our laptop catalogue or describe what you need to our AI assistant. Recommendations are grounded only in products available in the catalogue.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/catalogue"
              className="btn-primary px-6"
            >
              Browse Catalogue
            </Link>

            <Link
              href="/chat"
              className="btn-secondary px-6"
            >
              Ask AI Assistant
            </Link>
          </div>

          <div className="mt-16 grid gap-4 sm:grid-cols-3">
            <Feature
              title="Grounded"
              description="Recommendations use catalogue data only."
            />

            <Feature
              title="Transparent"
              description="Every AI response receives quality scores."
            />

            <Feature
              title="Arabizi"
              description="Talk naturally in Arabic, Arabizi or English."
            />
          </div>
        </div>
      </section>
    </main>
  );
}

type FeatureProps = {
  title: string;
  description: string;
};

function Feature({
  title,
  description,
}: FeatureProps) {
  return (
    <div className="surface p-5">
      <h2 className="font-semibold">
        {title}
      </h2>

      <p className="mt-2 text-sm leading-6 text-gray-500">
        {description}
      </p>
    </div>
  );
}