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

export type TieOutcome =
  | { kind: "decided"; winners: string[] }
  | {
      kind: "tie";
      /** Candidates that beat the tie line outright and win immediately. */
      decided: string[];
      /** Candidates level on votes, competing for the seats that remain. */
      tied: string[];
      remainingSeats: number;
      votes: number;
    };

/**
 * Splits a tally into outright winners and a tie that needs a runoff.
 *
 * A tie only matters at the seat boundary: if four movies tie on votes but
 * there are four seats, everyone wins and nothing needs resolving. It's when
 * more candidates share the boundary score than there are seats left that the
 * result can't be settled without another round.
 */
export function resolveWinners(tally: ApprovalTallyRow[], seats: number): TieOutcome {
  const seatCount = Math.min(seats, tally.length);
  if (seatCount === 0) return { kind: "decided", winners: [] };
  if (tally.length <= seatCount) {
    return { kind: "decided", winners: tally.map((r) => r.nominationId) };
  }

  const boundaryVotes = tally[seatCount - 1].votes;
  // A candidate just outside the seats sharing the boundary score means the
  // cut can't be made on votes alone.
  if (tally[seatCount].votes !== boundaryVotes) {
    return { kind: "decided", winners: tally.slice(0, seatCount).map((r) => r.nominationId) };
  }

  const decided = tally.filter((r) => r.votes > boundaryVotes).map((r) => r.nominationId);
  const tied = tally.filter((r) => r.votes === boundaryVotes).map((r) => r.nominationId);
  return {
    kind: "tie",
    decided,
    tied,
    remainingSeats: seatCount - decided.length,
    votes: boundaryVotes,
  };
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
