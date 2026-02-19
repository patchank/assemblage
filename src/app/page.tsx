import Link from "next/link";
import HomeClient from "@/components/HomeClient";

export default function HomePage() {
  return (
    <main className="w-full max-w-4xl mx-auto px-6 py-8">
      <div className="flex justify-center mb-8">
        <img
          src="/api/logo"
          alt="Assemblage"
          className="max-w-xs w-full h-auto"
        />
      </div>
      <div className="grid gap-10 md:grid-cols-[2fr,1fr] items-start">
        <section>
          <p className="mb-6 max-w-xl leading-relaxed">
            Put together the largest ensemble of forms by strategically
            selecting cards from the table. Play online with 2–4 players using
            simple room codes.
          </p>
          <HomeClient />
        </section>
        <aside className="text-sm space-y-4">
          <div>
            <h2 className="font-semibold mb-1">Rules</h2>
            <p className="mb-1">
              New to Assemblage? Read the full rules before your first game.
            </p>
            <Link
              href="/rules"
              className="underline underline-offset-4 hover:no-underline"
            >
              View rules
            </Link>
          </div>
          <div>
            <h2 className="font-semibold mb-1">How it works</h2>
            <ol className="list-decimal list-inside space-y-1">
              <li>Create a room and share the code.</li>
              <li>2–4 players join with nicknames.</li>
              <li>Host starts the game and turns proceed clockwise.</li>
            </ol>
          </div>
        </aside>
      </div>
    </main>
  );
}

