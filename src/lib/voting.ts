export type Ballot = { nominationId: string; rank: number }[];

/**
 * Sequential instant-runoff: runs single-winner IRV, removes the winner from
 * the candidate pool, and repeats until `seats` winners are chosen (or
 * candidates run out). Ties are broken deterministically by `tieBreakOrder`
 * (best-to-worst — the earlier a candidate appears, the more likely it
 * survives an elimination tie).
 */
export function tallyRankedChoice(
  candidateIds: string[],
  ballots: Ballot[],
  seats: number,
  tieBreakOrder: string[],
): string[] {
  const preferences = ballots.map((votes) =>
    [...votes].sort((a, b) => a.rank - b.rank).map((v) => v.nominationId),
  );

  const winners: string[] = [];
  const remaining = new Set(candidateIds);

  while (winners.length < seats && remaining.size > 0) {
    const winner = runInstantRunoff(remaining, preferences, tieBreakOrder);
    winners.push(winner);
    remaining.delete(winner);
  }

  return winners;
}

function runInstantRunoff(
  candidates: Set<string>,
  preferences: string[][],
  tieBreakOrder: string[],
): string {
  const active = new Set(candidates);

  while (active.size > 1) {
    const counts = new Map<string, number>();
    for (const id of active) counts.set(id, 0);

    let totalActive = 0;
    for (const prefs of preferences) {
      const topChoice = prefs.find((id) => active.has(id));
      if (topChoice) {
        counts.set(topChoice, (counts.get(topChoice) ?? 0) + 1);
        totalActive++;
      }
    }

    const majorityWinner = [...counts.entries()].find(
      ([, count]) => totalActive > 0 && count > totalActive / 2,
    );
    if (majorityWinner) return majorityWinner[0];

    const min = Math.min(...counts.values());
    const lowest = [...counts.entries()].filter(([, c]) => c === min).map(([id]) => id);
    // Eliminate whichever tied-lowest candidate ranks worst in the tie-break order.
    lowest.sort((a, b) => tieBreakOrder.indexOf(b) - tieBreakOrder.indexOf(a));
    active.delete(lowest[0]);
  }

  return [...active][0];
}
