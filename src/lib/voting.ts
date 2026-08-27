export type Ballot = { nominationId: string; rank: number }[];

export type ApprovalTallyRow = {
  nominationId: string;
  votes: number;
  isWinner: boolean;
};

/**
 * Approval-style tally: every member picks up to `seats` movies and each pick
 * counts as one vote. The `seats` highest vote-getters win. Ties are broken
 * deterministically by `tieBreakOrder` (earlier = favoured), so a tie resolves
 * toward whichever movie was nominated first.
 *
 * Returns every candidate sorted best-to-worst, so the same result powers both
 * the winner selection and the published results table.
 */
export function tallyApproval(
  candidateIds: string[],
  ballots: Ballot[],
  seats: number,
  tieBreakOrder: string[],
): ApprovalTallyRow[] {
  const counts = new Map<string, number>();
  for (const id of candidateIds) counts.set(id, 0);
  for (const ballot of ballots) {
    // Guard against a ballot naming the same movie twice.
    const unique = new Set(ballot.map((b) => b.nominationId));
    for (const id of unique) {
      if (counts.has(id)) counts.set(id, counts.get(id)! + 1);
    }
  }

  const ranked = [...counts.entries()]
    .map(([nominationId, votes]) => ({ nominationId, votes }))
    .sort(
      (a, b) =>
        b.votes - a.votes ||
        tieBreakOrder.indexOf(a.nominationId) - tieBreakOrder.indexOf(b.nominationId),
    );

  const winnerCount = Math.min(seats, ranked.length);
  return ranked.map((row, i) => ({ ...row, isWinner: i < winnerCount }));
}

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
