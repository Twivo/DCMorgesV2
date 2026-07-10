import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const fileEnv = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => line && line.includes("="))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1)];
    })
);
const env = { ...fileEnv, ...process.env };

const supabaseUrl = env.PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_WRITE_KEY;
const schema = env.PUBLIC_SUPABASE_SCHEMA || "public";

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis dans .env.local pour écrire les données de seed"
  );
}

const baseUrl = `${supabaseUrl}/rest/v1`;
const headers = {
  apikey: supabaseKey,
  authorization: `Bearer ${supabaseKey}`,
  "accept-profile": schema,
  "content-profile": schema,
  accept: "application/json",
  "content-type": "application/json"
};

const uuidFrom = (value) => {
  const hash = createHash("sha1").update(value).digest("hex").slice(0, 32).split("");
  hash[12] = "5";
  hash[16] = ((parseInt(hash[16], 16) & 0x3) | 0x8).toString(16);
  const text = hash.join("");
  return `${text.slice(0, 8)}-${text.slice(8, 12)}-${text.slice(12, 16)}-${text.slice(16, 20)}-${text.slice(20)}`;
};

const request = async (path, options = {}) => {
  const response = await fetch(`${baseUrl}/${path}`, { headers, ...options });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${options.method || "GET"} ${path} -> ${response.status}: ${text}`);
  }
  return body;
};

const selectAll = (table) => request(`${table}?select=*&limit=10000`);
const deleteWhere = async (table, filter) => {
  await request(`${table}?${filter}`, {
    method: "DELETE",
    headers: { ...headers, Prefer: "return=minimal" }
  });
};
const insertRows = async (table, rows) => {
  if (rows.length === 0) return [];
  return request(`${table}?select=*`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify(rows)
  });
};

const sum = (values) => values.reduce((total, value) => total + value, 0);

const winnerVisits = [
  [60, 60, 45, 85, 60, 60, 41, 90],
  [45, 81, 60, 60, 45, 85, 60, 65],
  [81, 45, 60, 60, 60, 41, 74, 80],
  [60, 45, 45, 100, 60, 60, 45, 86],
  [45, 60, 60, 41, 85, 60, 60, 90],
  [60, 60, 60, 60, 45, 80, 60, 76],
  [45, 45, 81, 60, 60, 60, 70, 80],
  [60, 60, 45, 60, 81, 45, 60, 90],
  [45, 60, 60, 60, 60, 60, 60, 36, 60],
  [41, 60, 60, 60, 60, 60, 60, 60, 40]
];

const loserVisits = [
  [60, 60, 60, 60, 60, 60, 60, 50],
  [60, 60, 60, 60, 60, 60, 60, 60],
  [60, 60, 60, 60, 60, 60, 60, 45],
  [81, 60, 60, 60, 60, 60, 60, 39],
  [60, 60, 60, 60, 60, 60, 45, 60],
  [60, 60, 60, 60, 60, 60, 60, 41]
];

const assertLeg = (visits) => {
  if (sum(visits) !== 501) {
    throw new Error(`Leg seed invalide: total ${sum(visits)} au lieu de 501`);
  }
  return visits;
};

winnerVisits.forEach(assertLeg);

const buildLegEvents = ({
  matchSeed,
  legIndex,
  winnerSide,
  participants,
  visitOffset,
  startsWith = "A",
  winnerScoresOverride,
  loserScoresOverride
}) => {
  const loserSide = winnerSide === "A" ? "B" : "A";
  const winnerScores = winnerScoresOverride || winnerVisits[(matchSeed + legIndex) % winnerVisits.length];
  const loserScores = loserScoresOverride || loserVisits[(matchSeed + legIndex) % loserVisits.length];
  const events = [];
  let winnerVisitIndex = 0;
  let loserVisitIndex = 0;
  let side = startsWith;

  while (winnerVisitIndex < winnerScores.length) {
    const isWinner = side === winnerSide;
    const scores = isWinner ? winnerScores : loserScores;
    const index = isWinner ? winnerVisitIndex : loserVisitIndex;

    if (index < scores.length) {
      const playerIds = participants[side];
      events.push({
        id: `${matchSeed}-${legIndex}-${events.length + 1}`,
        ts: visitOffset + events.length * 1000,
        type: "VISIT",
        darts: 3,
        scored: scores[index],
        playerId: playerIds[index % playerIds.length],
        participantId: side
      });
      if (isWinner) winnerVisitIndex += 1;
      else loserVisitIndex += 1;
    }

    if (winnerVisitIndex >= winnerScores.length) break;
    side = side === "A" ? "B" : "A";
    if (side === loserSide && loserVisitIndex >= loserScores.length) side = winnerSide;
  }

  return events;
};

const buildMatchEvents = ({ matchSeed, winnerSide, participants, startedAt, result, specialLegs = {} }) => {
  const legWinners =
    result === "2-0"
      ? [winnerSide, winnerSide]
      : [winnerSide, winnerSide === "A" ? "B" : "A", winnerSide];

  return legWinners.flatMap((side, index) => {
    const specialLeg = specialLegs[index] || {};
    return buildLegEvents({
      matchSeed,
      legIndex: index,
      winnerSide: side,
      participants,
      visitOffset: startedAt + index * 120000,
      startsWith: specialLeg.startsWith || (index % 2 === 0 ? "A" : "B"),
      winnerScoresOverride: specialLeg.winnerScores,
      loserScoresOverride: specialLeg.loserScores
    });
  });
};

const fixturePlan = [
  { kind: "SINGLE", a: [0], b: [0] },
  { kind: "SINGLE", a: [1], b: [1] },
  { kind: "SINGLE", a: [2], b: [2] },
  { kind: "SINGLE", a: [3], b: [3] },
  { kind: "DOUBLE", a: [0, 1], b: [0, 1] },
  { kind: "DOUBLE", a: [2, 3], b: [2, 3] },
  { kind: "SINGLE", a: [0], b: [1] },
  { kind: "SINGLE", a: [1], b: [0] },
  { kind: "SINGLE", a: [2], b: [3] },
  { kind: "SINGLE", a: [3], b: [2] }
];

const encountersToSeed = [
  { index: 1, date: "2026-08-20T19:15:00+00:00", teamA: "DC MORGES", teamB: "SNIPERS DARTS", winners: "AABBAABABA" },
  { index: 2, date: "2026-09-03T19:15:00+00:00", teamA: "DC MORGES", teamB: "GALWAY DARTS", winners: "ABBABABBAB" },
  { index: 3, date: "2026-09-17T19:15:00+00:00", teamA: "DC MORGES", teamB: "LAUSANNE SOCIAL DARTS", winners: "ABAABAABBA" },
  { index: 4, date: "2026-10-01T19:15:00+00:00", teamA: "DC MORGES", teamB: "LES FREESTYLERS", winners: "BBABAABBAB" },
  { index: 5, date: "2026-10-15T19:15:00+00:00", teamA: "SNIPERS DARTS", teamB: "GALWAY DARTS", winners: "BAABABABAA" },
  { index: 6, date: "2026-10-29T19:15:00+00:00", teamA: "SNIPERS DARTS", teamB: "LAUSANNE SOCIAL DARTS", winners: "ABABBABABB" },
  { index: 7, date: "2026-11-12T19:15:00+00:00", teamA: "SNIPERS DARTS", teamB: "LES FREESTYLERS", winners: "BABAABBAAA" },
  { index: 8, date: "2026-11-26T19:15:00+00:00", teamA: "GALWAY DARTS", teamB: "LAUSANNE SOCIAL DARTS", winners: "BAABBABBAB" },
  { index: 9, date: "2026-12-10T19:15:00+00:00", teamA: "GALWAY DARTS", teamB: "LES FREESTYLERS", winners: "AABBABAABA" },
  { index: 10, date: "2027-01-07T19:15:00+00:00", teamA: "LAUSANNE SOCIAL DARTS", teamB: "LES FREESTYLERS", winners: "BBABABBAAB" },
  { index: 11, date: "2027-01-21T19:15:00+00:00", teamA: "SNIPERS DARTS", teamB: "DC MORGES", winners: "ABBABAABBA" },
  { index: 12, date: "2027-02-04T19:15:00+00:00", teamA: "GALWAY DARTS", teamB: "DC MORGES", winners: "BAABABBABA" },
  { index: 13, date: "2027-02-18T19:15:00+00:00", teamA: "LAUSANNE SOCIAL DARTS", teamB: "DC MORGES", winners: "ABBAABABBA" },
  { index: 14, date: "2027-03-04T19:15:00+00:00", teamA: "LES FREESTYLERS", teamB: "DC MORGES", winners: "BAABBABAAB" },
  { index: 15, date: "2027-03-18T19:15:00+00:00", teamA: "GALWAY DARTS", teamB: "SNIPERS DARTS", winners: "ABAABBABAB" },
  { index: 16, date: "2027-04-01T19:15:00+00:00", teamA: "LAUSANNE SOCIAL DARTS", teamB: "SNIPERS DARTS", winners: "BBAABAABAB" },
  { index: 17, date: "2027-04-15T19:15:00+00:00", teamA: "LES FREESTYLERS", teamB: "SNIPERS DARTS", winners: "AABABBABBA" },
  { index: 18, date: "2027-04-29T19:15:00+00:00", teamA: "LAUSANNE SOCIAL DARTS", teamB: "GALWAY DARTS", winners: "BABAAABBAB" },
  { index: 19, date: "2027-05-13T19:15:00+00:00", teamA: "LES FREESTYLERS", teamB: "GALWAY DARTS", winners: "ABBBAAABAB" },
  { index: 20, date: "2027-05-27T19:15:00+00:00", teamA: "LES FREESTYLERS", teamB: "LAUSANNE SOCIAL DARTS", winners: "AABAABBABB" },
  { index: 21, date: "2027-06-10T19:15:00+00:00", teamA: "DC MORGES", teamB: "SNIPERS DARTS", winners: "ABABBAAABB" },
  { index: 22, date: "2027-06-24T19:15:00+00:00", teamA: "DC MORGES", teamB: "GALWAY DARTS", winners: "BAABAABABB" },
  { index: 23, date: "2027-07-08T19:15:00+00:00", teamA: "DC MORGES", teamB: "LAUSANNE SOCIAL DARTS", winners: "AABABABBBA" },
  { index: 24, date: "2027-07-22T19:15:00+00:00", teamA: "DC MORGES", teamB: "LES FREESTYLERS", winners: "BBABAAABBA" },
  { index: 25, date: "2027-08-05T19:15:00+00:00", teamA: "SNIPERS DARTS", teamB: "GALWAY DARTS", winners: "AABBABABBA" },
  { index: 26, date: "2027-08-19T19:15:00+00:00", teamA: "SNIPERS DARTS", teamB: "LAUSANNE SOCIAL DARTS", winners: "BABBABAABA" },
  { index: 27, date: "2027-09-02T19:15:00+00:00", teamA: "SNIPERS DARTS", teamB: "LES FREESTYLERS", winners: "ABAABABBBA" },
  { index: 28, date: "2027-09-16T19:15:00+00:00", teamA: "GALWAY DARTS", teamB: "LAUSANNE SOCIAL DARTS", winners: "BBABAABBAA" },
  { index: 29, date: "2027-09-30T19:15:00+00:00", teamA: "GALWAY DARTS", teamB: "LES FREESTYLERS", winners: "ABABABBBAA" },
  { index: 30, date: "2027-10-14T19:15:00+00:00", teamA: "LAUSANNE SOCIAL DARTS", teamB: "LES FREESTYLERS", winners: "BAABBAABAB" },
  {
    index: 31,
    date: "2027-10-28T19:15:00+00:00",
    teamA: "DC MORGES",
    teamB: "GALWAY DARTS",
    winners: "AABABBABAA",
    specialMatches: {
      0: {
        0: {
          startsWith: "B",
          winnerScores: [60, 60, 45, 60, 36, 60, 60, 120],
          loserScores: [45, 45, 180, 30, 45, 45, 30, 30]
        }
      }
    }
  }
];

const main = async () => {
  const [seasons, teams, players, teamPlayers] = await Promise.all([
    selectAll("seasons"),
    selectAll("teams"),
    selectAll("players"),
    selectAll("team_players")
  ]);

  const season = seasons.find((item) => item.is_current) || seasons[0];
  if (!season) throw new Error("Aucune saison Supabase disponible");

  const teamsByName = new Map(teams.map((team) => [team.name, team]));
  const playersById = new Map(players.map((player) => [player.id, player]));
  const rosterByTeamId = new Map();
  for (const row of teamPlayers) {
    if (!rosterByTeamId.has(row.team_id)) rosterByTeamId.set(row.team_id, []);
    const player = playersById.get(row.player_id);
    if (player) rosterByTeamId.get(row.team_id).push({ id: player.id, name: player.name });
  }

  const encounters = [];
  const matches = [];
  const matchPlayers = [];

  for (const item of encountersToSeed) {
    const seedTag = `ai-seed-${item.index}`;
    const encounterId = uuidFrom(`lmf-live-${seedTag}`);
    const teamA = teamsByName.get(item.teamA);
    const teamB = teamsByName.get(item.teamB);
    if (!teamA || !teamB) throw new Error(`Equipe introuvable pour ${seedTag}`);

    const rosterA = (rosterByTeamId.get(teamA.id) || []).slice(0, 4);
    const rosterB = (rosterByTeamId.get(teamB.id) || []).slice(0, 4);
    if (rosterA.length < 4 || rosterB.length < 4) throw new Error(`Roster incomplet pour ${seedTag}`);

    const fixtureRows = [];
    let scoreA = 0;
    let scoreB = 0;

    for (const [fixtureIndex, fixture] of fixturePlan.entries()) {
      const matchId = uuidFrom(`lmf-live-${seedTag}-fixture-${fixtureIndex}`);
      const winner = item.winners[fixtureIndex];
      const result = (item.index + fixtureIndex) % 3 === 0 ? "2-1" : "2-0";
      const aPlayers = fixture.a.map((index) => rosterA[index]);
      const bPlayers = fixture.b.map((index) => rosterB[index]);
      const participants = {
        A: aPlayers.map((player) => player.id),
        B: bPlayers.map((player) => player.id)
      };

      if (winner === "A") scoreA += 1;
      else scoreB += 1;

      fixtureRows.push({
        kind: fixture.kind,
        index: fixtureIndex,
        winner,
        matchId,
        aPlayerIds: participants.A,
        bPlayerIds: participants.B,
        starterSide: fixtureIndex % 2 === 0 ? "A" : "B"
      });

      const timestamp = Date.parse(item.date) + fixtureIndex * 600000;
      const playerList = [...aPlayers, ...bPlayers].map((player) => ({ id: player.id, name: player.name }));
      matches.push({
        id: matchId,
        season_id: season.id,
        config: {
          id: `${seedTag}-fixture-${fixtureIndex + 1}`,
          mode: fixture.kind,
          outRule: "DOUBLE",
          players: playerList,
          variant: 501,
          createdAt: timestamp,
          legsToWin: 2,
          participants: [
            {
              id: "A",
              label: fixture.kind === "DOUBLE" ? teamA.name : aPlayers[0].name,
              playerIds: participants.A
            },
            {
              id: "B",
              label: fixture.kind === "DOUBLE" ? teamB.name : bPlayers[0].name,
              playerIds: participants.B
            }
          ],
          firstStarterId: fixtureIndex % 2 === 0 ? "A" : "B",
          startingPolicy: "MANUAL",
          alternateStarter: true
        },
        events: buildMatchEvents({
          matchSeed: item.index * 100 + fixtureIndex,
          winnerSide: winner,
          participants,
          startedAt: timestamp,
          result,
          specialLegs: item.specialMatches?.[fixtureIndex]
        }),
        mode: fixture.kind,
        variant: 501,
        status: "GAME_OVER",
        winner_participant: winner,
        created_at: new Date(timestamp).toISOString(),
        updated_at: new Date(timestamp + 540000).toISOString(),
        finished_at: new Date(timestamp + 540000).toISOString(),
        encounter_id: encounterId,
        fixture_index: fixtureIndex
      });

      for (const playerId of participants.A) {
        matchPlayers.push({ match_id: matchId, player_id: playerId, participant_id: "A" });
      }
      for (const playerId of participants.B) {
        matchPlayers.push({ match_id: matchId, player_id: playerId, participant_id: "B" });
      }
    }

    encounters.push({
      id: encounterId,
      season_id: season.id,
      team_a_id: teamA.id,
      team_b_id: teamB.id,
      plan: {
        teams: {
          A: { id: teamA.id, name: teamA.name, players: rosterA },
          B: { id: teamB.id, name: teamB.name, players: rosterB }
        },
        format: [
          { kind: "SINGLE", count: 4 },
          { kind: "DOUBLE", count: 2 },
          { kind: "SINGLE", count: 4 }
        ],
        seedTag,
        fixtures: fixtureRows,
        settings: {
          legsToWin: 2,
          starterSide: "A",
          startingPolicy: "MANUAL",
          alternateStarter: true
        }
      },
      status: "FINISHED",
      current_index: 10,
      score_a: scoreA,
      score_b: scoreB,
      winner: scoreA === scoreB ? null : scoreA > scoreB ? "A" : "B",
      created_at: item.date,
      updated_at: item.date,
      finished_at: item.date
    });
  }

  await deleteWhere("match_players", "match_id=not.is.null");
  await deleteWhere("matches", "id=not.is.null");
  await deleteWhere("encounters", "id=not.is.null");

  await insertRows("encounters", encounters);
  await insertRows("matches", matches);
  await insertRows("match_players", matchPlayers);

  console.log(`Seed LMF terminé: ${encounters.length} rencontres, ${matches.length} parties, ${matchPlayers.length} joueurs de parties ajoutés.`);
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
