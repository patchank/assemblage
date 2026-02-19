const sections = [
  {
    title: "Objective",
    body: `Put together the largest ensemble of forms by strategically selecting cards from the table. Make sure you use all the cards you pick because cards outside a complete ensemble will cost you points. The player with more points when no cards remain in the table wins the game.`
  },
  {
    title: "Components",
    body: `16 point cards – 1 point\n11 line cards – 16 points\n10 triangle cards – 14 points\n11 square cards – 12 points`
  },
  {
    title: "Setup",
    body: `1. Shuffle all the cards.\n2. Place the cards on the table facing up forming a 4 × 12 grid.`
  },
  {
    title: "Gameplay",
    body: `1. A random player starts.\n2. On your turn:\n   a. Take one card from the extreme of a row (you can’t take cards from the middle).\n   b. Place the card in front of you and start forming ensembles with the other cards you have.\n3. Continue clockwise until all cards are taken.`
  },
  {
    title: "Assembling rules",
    body: `Each card has connection points on one or more of its sides. You can put a card on the side of another if the number of connection points on both matches.\n\nIn a complete ensemble, all the cards have all their points connected with another card.`
  },
  {
    title: "End of Game",
    body: `The game ends when all cards are taken. Players count points following these rules:\n• Sum the points of all complete ensembles.\n• Subtract the points of all cards outside complete ensembles.\n• Add 50 extra points to the player with the largest ensemble. If there is a tie, split the points between the players.`
  },
  {
    title: "Winning",
    body: `The player with the most points wins.`
  }
];

export default function RulesPage() {
  return (
    <main className="w-full max-w-3xl mx-auto px-6 py-10 space-y-6">
      <header>
        <h1 className="text-3xl font-semibold mb-2">Assemblage – Rules</h1>
        <p className="text-sm text-ink/70">
          A quick reference for how to set up and play Assemblage online or on the table.
        </p>
      </header>
      <div className="space-y-6 text-sm leading-relaxed">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="font-semibold mb-1">{section.title}</h2>
            {section.body.split("\n").map((line, i) => (
              <p key={i} className="mb-1">
                {line}
              </p>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}

