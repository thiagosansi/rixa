# RIXA

Jogo de festa para a sala de casa: um **torneio de 5 rodadas** entre dois times (Vermelho x Azul).
A **TV** mostra o jogo e é a autoridade da partida; cada pessoa joga pelo **celular**.
São **2 baralhos**: _Família_ e _Sem filtro_ — escolha no lobby.

Rodadas: Mímica · Tabu de Boteco · Mentiroso · Leilão · Relâmpago (a última vale triplo).
Precisa de 4+ pessoas e os dois times preenchidos.

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
