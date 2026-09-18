# RIXA

Jogo de festa para a sala de casa: um **torneio de 6 rodadas** entre dois times (Vermelho x Azul).
A **TV** mostra o jogo e é a autoridade da partida; cada pessoa joga pelo **celular**.
São **2 baralhos**: _Família_ e _Sem filtro_ — escolha no lobby.

## As 6 rodadas

1. **Mímica** — um jogador do time vê a palavra no celular e faz mímica; o resto do time digita os palpites (150 por acerto).
2. **Tabu de Boteco** — explique a palavra sem dizer as proibidas; o time adversário é o juiz (100 por acerto, -50 por deslize).
3. **Mentiroso** — todo mundo inventa uma resposta falsa e depois vota; enganar adversários e achar a verdade dão pontos.
4. **Leilão** — lance secreto de quantos itens de uma categoria o time consegue listar; o maior lance encara o desafio.
5. **Telefone sem fio** — uma frase vira emojis, os emojis viram frase, e a TV revela a corrente se deformando; vota-se na mais engraçada.
6. **Relâmpago 3x** — quiz de múltipla escolha para todo mundo, com bônus de velocidade e **tudo valendo triplo**.

Precisa de 4+ pessoas e os dois times preenchidos. Um torneio completo leva **~40 min com 6 pessoas**.

## Rodar em casa

Requer Node 20+ (recomendado 22).

```bash
npm install
npm run dev                      # desenvolvimento
# ou
npm run build && npm start       # modo produção
```

1. Abra `http://localhost:3000/tv` no computador ligado à TV.
2. Cada pessoa aponta a câmera do celular para o **QR** da tela (ou digita o endereço + código da sala).
3. Todo mundo precisa estar no **mesmo WiFi** da máquina que roda o jogo.

Porta diferente: `PORT=4000 npm start`.

## Publicar no Render

O repositório já tem um `render.yaml` (Blueprint).

1. Suba o projeto para um repositório no GitHub/GitLab.
2. No Render: **New → Blueprint → escolha o repositório** → Apply.
3. Abra `https://<seu-servico>.onrender.com/tv` na TV; o QR já aponta para o endereço público (https/wss).

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
