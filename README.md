# RIXA

Jogo de festa para a sala de casa: um **torneio de 7 rodadas** entre dois times (Vermelho x Azul).
A TV é opcional: a mesa pode abrir o jogo em um celular, tablet, notebook ou televisão, e cada pessoa joga pelo próprio dispositivo.
São **2 baralhos**: _Família_ e _Sem filtro_ — escolha no lobby.

## As 7 rodadas

1. **Mímica** — um jogador do time vê a palavra na própria tela e faz mímica; o resto do time digita os palpites (150 por acerto).
2. **Tabu de Boteco** — explique a palavra sem dizer as proibidas; o time adversário é o juiz (100 por acerto, -50 por deslize).
3. **Mentiroso** — todo mundo inventa uma resposta falsa e depois vota; enganar adversários e achar a verdade dão pontos.
4. **Leilão** — lance secreto de quantos itens de uma categoria o time consegue listar; o maior lance encara o desafio.
5. **Telefone sem fio** — uma frase vira emojis, os emojis viram frase, e a mesa revela a corrente se deformando; vota-se na mais engraçada.
6. **Detetive da Casa** — cada pessoa recebe um personagem e uma pista secreta; a mesa investiga e vota em quem foi responsável.
7. **Relâmpago 3x** — quiz de múltipla escolha para todo mundo, com bônus de velocidade e **tudo valendo triplo**.

Precisa de 4+ pessoas e os dois times preenchidos. Um torneio completo leva **~40 min com 6 pessoas**.

## Rodar em casa

Requer Node 20+ (recomendado 22).

```bash
npm install
npm run dev                      # desenvolvimento
# ou
npm run build && npm start       # modo produção
```

1. Abra `http://localhost:3000/mesa` no celular, tablet ou notebook do anfitrião. Use `/tv` se quiser uma tela grande.
2. Cada pessoa abre `/jogar` em seu celular, tablet ou computador e digita o endereço + código da sala, ou usa o **QR** quando houver uma tela disponível.
3. Todo mundo precisa estar no **mesmo WiFi** da máquina que roda o jogo.

O modo `/mesa` não depende de nenhuma TV: as informações públicas aparecem nas telas, enquanto personagens, pistas e outras informações secretas chegam apenas ao jogador correto.

## Cidade em Jogo

Na página inicial, escolha **Cidade em Jogo** para abrir `/cidade`. É um modo separado para 2 a 6 pessoas:

- Abra `/cidade` no aparelho do anfitrião.
- Cada pessoa entra em `/cidade/jogar` com o código da sala.
- Jogue pelo celular, tablet ou computador: lance dados, compre imóveis, receba aluguel e responda às cartas de evento.
- A partida termina depois de 30 voltas; vence quem tiver o maior patrimônio.

O tabuleiro, os bairros e as cartas são conteúdos originais do projeto.

Porta diferente: `PORT=4000 npm start`.

## Publicar no Render

O repositório já tem um `render.yaml` (Blueprint).

1. Suba o projeto para um repositório no GitHub/GitLab.
2. No Render: **New → Blueprint → escolha o repositório** → Apply.
3. Abra `https://<seu-servico>.onrender.com/mesa` no aparelho do anfitrião; o QR já aponta para o endereço público (https/wss).

Avisos do **plano free**:

- O serviço **dorme após ~15 min sem acesso** e leva **~1 min para acordar**. Abra a página alguns minutos antes da festa.
- Um deploy ou reinício derruba as partidas em andamento: as salas vivem só na memória do servidor.
- Mantenha **uma única instância** (o relay WebSocket não é compartilhado entre processos).

## Testes

```bash
npm test          # motor do jogo + regra da URL de entrada
npx tsc --noEmit
npx eslint .
```

## Como funciona (resumo)

`server.mjs` sobe o app Next.js e um relay WebSocket simples em `/api/ws` no mesmo processo/porta.
O servidor não tem lógica de jogo: só repassa mensagens dentro da sala. Variáveis opcionais em `.env.example`.
