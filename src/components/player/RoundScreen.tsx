'use client';

import type { RoundProps } from './shared';
import { MimicaRound } from './MimicaRound';
import { TabuRound } from './TabuRound';
import { MentirosoRound } from './MentirosoRound';
import { LeilaoRound } from './LeilaoRound';
import { TelefoneRound } from './TelefoneRound';
import { RelampagoRound } from './RelampagoRound';
import { WaitingCard } from './WaitingCard';

/** Escolhe a tela da rodada em andamento (phase === 'round-play'). */
export function RoundScreen(props: RoundProps) {
  const round = props.game.round;
  if (!round) {
    return <WaitingCard>A rodada está sendo preparada…</WaitingCard>;
  }
  switch (round.kind) {
    case 'mimica':
      return <MimicaRound key={round.turnIndex} {...props} round={round} />;
    case 'tabu':
      return <TabuRound key={round.turnIndex} {...props} round={round} />;
    case 'mentiroso':
      return <MentirosoRound key={round.questionIndex} {...props} round={round} />;
    case 'leilao':
      return <LeilaoRound key={round.categoryIndex} {...props} round={round} />;
    case 'telefone':
      return <TelefoneRound key={`${round.stage}-${round.step}`} {...props} round={round} />;
    case 'relampago':
      return <RelampagoRound key={round.questionIndex} {...props} round={round} />;
  }
}

export default RoundScreen;
