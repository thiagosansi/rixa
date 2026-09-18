import type { Scores, TelefoneState } from './types';
import { POINTS } from './rounds';
import { telefoneVoteCounts } from './engine';

export type TelefoneBonuses = {
  /** votos por corrente */
  counts: number[];
  /** correntes em 1º (várias quando empatam) */
  firsts: number[];
  /** correntes em 2º (vazio se houve empate no 1º) */
  seconds: number[];
  /** pontos desta rodada por time (sobrevivência + pódio), já com o multiplicador */
  deltas: Scores;
};

/**
 * Mesma regra de `scoreTelefone` do engine, mas devolvendo QUEM levou o quê,
 * para a TV e o celular mostrarem o pódio e os pontos da rodada.
 * Só faz sentido em `result` (usa `ranking` e `survived`).
 */
export function telefoneBonuses(r: TelefoneState, multiplier = 1): TelefoneBonuses {
  const counts = telefoneVoteCounts(r);
  const deltas: Scores = { red: 0, blue: 0 };
  for (const survived of r.survived) {
    if (!survived) continue;
    deltas.red += POINTS.telefoneSurvive * multiplier;
    deltas.blue += POINTS.telefoneSurvive * multiplier;
  }
  if (r.ranking.length === 0) return { counts, firsts: [], seconds: [], deltas };
  const top = counts[r.ranking[0]];
  const firsts = r.ranking.filter((i) => counts[i] === top);
  for (const i of firsts) deltas[r.chains[i].starterTeam] += POINTS.telefoneFirst * multiplier;
  if (firsts.length > 1) return { counts, firsts, seconds: [], deltas };
  const rest = r.ranking.filter((i) => counts[i] < top);
  if (rest.length === 0) return { counts, firsts, seconds: [], deltas };
  const second = counts[rest[0]];
  const seconds = rest.filter((i) => counts[i] === second);
  for (const i of seconds) deltas[r.chains[i].starterTeam] += POINTS.telefoneSecond * multiplier;
  return { counts, firsts, seconds, deltas };
}
