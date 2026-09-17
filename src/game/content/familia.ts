import type { Deck } from './index';

/**
 * RIXA — Baralho "Família"
 *
 * Tom: afiado, adulto e difícil, mas seguro para jogar com a família inteira na sala.
 * Sem conteúdo sexual, sem palavrão pesado, sem drogas.
 * Temas: trabalho, casamento, sogra, academia, dieta, WhatsApp da família,
 * cultura pop, história, geografia e ciência.
 */

// ---------------------------------------------------------------------------
// MÍMICA — 60 palavras/expressões para encenar sem falar (60 segundos por turno)
// ---------------------------------------------------------------------------
const mimica = [
  'Personal trainer',
  'Ir ao dentista',
  'Pescaria',
  'Selfie de família',
  'Aula de ioga',
  'Karaokê',
  'Papai Noel',
  'Cartão vermelho',
  'Amigo secreto',
  'Goleiro',
  'Garçom derrubando a bandeja',
  'Sonâmbulo',
  'Surfista',
  'Maestro',
  'Boxeador',
  'Cortar o próprio cabelo',
  'Guarda de trânsito',
  'Levantamento de peso',
  'Zumbi',
  'Bailarina',
  'Carregar saco de cimento',
  'Segurar o espirro',
  'Soluço',
  'Cãibra',
  'Acordar com torcicolo',
  'Capoeira',
  'Pular corda',
  'Bambolê',
  'Robô',
  'Virar a carne na churrasqueira',
  'Sogra chegando de surpresa',
  'Crise de meia-idade',
  'Home office de pijama',
  'Fila do banco',
  'Montar móvel',
  'Senha esquecida',
  'Pênalti perdido',
  'Torcedor fanático',
  'Quadrilha de festa junina',
  'Discurso de casamento',
  'Pegar o buquê da noiva',
  'Trocar fralda',
  'Tomar injeção',
  'Dar banho no cachorro',
  'Mala que não fecha',
  'Dor de coluna',
  'Furar parede',
  'Matar mosquito',
  'Elevador lotado',
  'Preso no trânsito',
  'Furar a dieta',
  'Esteira da academia',
  'Trocar lâmpada',
  'Trocar pneu',
  'Passar roupa',
  'Pisar no Lego',
  'Queimar a língua',
  'Procurar sinal de Wi-Fi',
  'Tio do pavê',
  'Dormir na reunião',
];

// ---------------------------------------------------------------------------
// TABU — 45 cartas, exatamente 3 palavras proibidas cada
// ---------------------------------------------------------------------------
const tabu = [
  { word: 'Pizza', forbidden: ['massa', 'queijo', 'redonda'] },
  { word: 'Sogra', forbidden: ['mãe', 'genro', 'nora'] },
  { word: 'Churrasco', forbidden: ['carne', 'espeto', 'domingo'] },
  { word: 'Feijoada', forbidden: ['porco', 'couve', 'laranja'] },
  { word: 'Novela', forbidden: ['capítulo', 'Globo', 'vilã'] },
  { word: 'Academia', forbidden: ['musculação', 'esteira', 'halteres'] },
  { word: 'Segunda-feira', forbidden: ['trabalho', 'semana', 'preguiça'] },
  { word: 'Dentista', forbidden: ['cárie', 'consultório', 'sorriso'] },
  { word: 'Casamento', forbidden: ['noiva', 'igreja', 'aliança'] },
  { word: 'Aniversário', forbidden: ['bolo', 'vela', 'parabéns'] },
  { word: 'Padaria', forbidden: ['pão', 'manhã', 'balcão'] },
  { word: 'Carnaval', forbidden: ['fantasia', 'bloco', 'samba'] },
  { word: 'Praia', forbidden: ['areia', 'mar', 'guarda-sol'] },
  { word: 'Elevador', forbidden: ['prédio', 'andar', 'botão'] },
  { word: 'Semáforo', forbidden: ['vermelho', 'verde', 'trânsito'] },
  { word: 'Geladeira', forbidden: ['gelo', 'cozinha', 'porta'] },
  { word: 'Micro-ondas', forbidden: ['esquentar', 'pipoca', 'cozinha'] },
  { word: 'Guarda-chuva', forbidden: ['molhar', 'abrir', 'vento'] },
  { word: 'Passaporte', forbidden: ['viagem', 'documento', 'carimbo'] },
  { word: 'Aeroporto', forbidden: ['avião', 'voo', 'mala'] },
  { word: 'Wi-Fi', forbidden: ['internet', 'senha', 'roteador'] },
  { word: 'Currículo', forbidden: ['emprego', 'entrevista', 'experiência'] },
  { word: 'Estágio', forbidden: ['faculdade', 'empresa', 'aprender'] },
  { word: 'Boleto', forbidden: ['pagar', 'conta', 'vencimento'] },
  { word: 'Pix', forbidden: ['transferência', 'banco', 'chave'] },
  { word: 'Supermercado', forbidden: ['compras', 'carrinho', 'caixa'] },
  { word: 'Ônibus', forbidden: ['passageiro', 'ponto', 'motorista'] },
  { word: 'Bicicleta', forbidden: ['pedal', 'roda', 'guidão'] },
  { word: 'Papai Noel', forbidden: ['Natal', 'presente', 'trenó'] },
  { word: 'Fofoca', forbidden: ['falar', 'segredo', 'vizinha'] },
  { word: 'Karaokê', forbidden: ['cantar', 'microfone', 'música'] },
  { word: 'Selfie', forbidden: ['foto', 'celular', 'rosto'] },
  { word: 'Netflix', forbidden: ['série', 'assistir', 'streaming'] },
  { word: 'Videogame', forbidden: ['jogar', 'controle', 'console'] },
  { word: 'Pênalti', forbidden: ['gol', 'cobrança', 'goleiro'] },
  { word: 'Árbitro', forbidden: ['apito', 'jogo', 'cartão'] },
  { word: 'Torcida', forbidden: ['estádio', 'time', 'gritar'] },
  { word: 'Xadrez', forbidden: ['tabuleiro', 'rei', 'peça'] },
  { word: 'Pinguim', forbidden: ['gelo', 'ave', 'Antártica'] },
  { word: 'Vulcão', forbidden: ['lava', 'erupção', 'montanha'] },
  { word: 'Múmia', forbidden: ['Egito', 'faixa', 'tumba'] },
  { word: 'Astronauta', forbidden: ['espaço', 'foguete', 'Lua'] },
  { word: 'Bombeiro', forbidden: ['fogo', 'mangueira', 'resgate'] },
  { word: 'Manicure', forbidden: ['unha', 'esmalte', 'mão'] },
  { word: 'Aposentadoria', forbidden: ['INSS', 'idade', 'parar de trabalhar'] },
];

// ---------------------------------------------------------------------------
// MENTIROSO — 40 perguntas estilo Fibbage (a verdade é real e verificável)
// ---------------------------------------------------------------------------
const mentiroso = [
  {
    question: 'Na Suíça, é ilegal ter apenas um(a) ___ como animal de estimação, porque eles sofrem de solidão.',
    truth: 'porquinho-da-índia',
  },
  {
    question: 'Arqueólogos encontraram potes de mel em tumbas do Egito Antigo e, depois de mais de 3.000 anos, o mel ainda estava ___.',
    truth: 'comestível',
  },
  {
    question: 'A Guerra dos 335 Anos, entre a Holanda e as ilhas Scilly, terminou em 1986 sem nenhum(a) ___.',
    truth: 'tiro disparado',
  },
  {
    question: 'O animal com o maior coração do planeta é o(a) ___.',
    truth: 'baleia-azul',
  },
  {
    question: 'Cleópatra viveu mais perto, no tempo, da invenção do(a) ___ do que da construção das pirâmides de Gizé.',
    truth: 'iPhone',
  },
  {
    question: 'Antes do despertador existia a profissão de "knocker-up": pessoas que acordavam trabalhadores batendo na janela com um(a) ___.',
    truth: 'vara comprida',
  },
  {
    question: 'Bananas são levemente radioativas por causa do(a) ___ que contêm.',
    truth: 'potássio',
  },
  {
    question: 'Antes de se chamar Google, o buscador criado por Larry Page e Sergey Brin se chamava ___.',
    truth: 'BackRub',
  },
  {
    question: 'O primeiro nome de batismo do Pelé era ___.',
    truth: 'Edson',
  },
  {
    question: 'A Torre Eiffel pode ficar até 15 centímetros mais alta no verão por causa do(a) ___.',
    truth: 'calor',
  },
  {
    question: 'O ponto mais profundo do oceano, na Fossa das Marianas, tem cerca de ___ mil metros de profundidade.',
    truth: 'onze',
  },
  {
    question: 'Antes do Rio de Janeiro, a capital do Brasil era ___.',
    truth: 'Salvador',
  },
  {
    question: 'O polvo é famoso por ter ___ corações.',
    truth: 'três',
  },
  {
    question: 'O sobrenome verdadeiro da Xuxa é ___.',
    truth: 'Meneghel',
  },
  {
    question: 'O Canadá é o país que tem mais ___ do que qualquer outro país do mundo.',
    truth: 'lagos',
  },
  {
    question: 'Os flamingos nascem ___ e só ficam rosa por causa da alimentação.',
    truth: 'cinzentos',
  },
  {
    question: 'No Japão, há anos se vendem mais fraldas para ___ do que para bebês.',
    truth: 'idosos',
  },
  {
    question: 'O menor país do mundo, com menos de meio quilômetro quadrado, é ___.',
    truth: 'o Vaticano',
  },
  {
    question: 'A Lua se afasta da Terra cerca de 3,8 ___ por ano.',
    truth: 'centímetros',
  },
  {
    question: 'Em Vênus, um dia dura mais do que um(a) ___ no próprio planeta.',
    truth: 'ano',
  },
  {
    question: 'Os tubarões já existiam no planeta muito antes do surgimento do(a) ___.',
    truth: 'árvores',
  },
  {
    question: 'O animal que mais mata seres humanos por ano no mundo é o(a) ___.',
    truth: 'mosquito',
  },
  {
    question: 'O primeiro produto do mundo a ter o código de barras escaneado numa loja, em 1974, foi um pacote de ___.',
    truth: 'chiclete',
  },
  {
    question: 'Ao voltarem da Lua, os astronautas da Apollo 11 tiveram que preencher um(a) ___ no Havaí.',
    truth: 'declaração de alfândega',
  },
  {
    question: 'A Estátua da Liberdade foi um presente do(a) ___ para os Estados Unidos.',
    truth: 'França',
  },
  {
    question: 'A Groenlândia, a maior ilha do mundo, é um território pertencente ao(à) ___.',
    truth: 'Dinamarca',
  },
  {
    question: 'O país que tem o maior número de pirâmides do mundo não é o Egito, e sim o(a) ___.',
    truth: 'Sudão',
  },
  {
    question: 'Só existe um país no mundo cujo nome em português começa com a letra O: ___.',
    truth: 'Omã',
  },
  {
    question: 'O Monte Everest cresce cerca de 4 ___ por ano.',
    truth: 'milímetros',
  },
  {
    question: 'A primeira mulher a ganhar um Prêmio Nobel, em 1903, foi ___.',
    truth: 'Marie Curie',
  },
  {
    question: 'O país que mais consome café por habitante no mundo é ___.',
    truth: 'a Finlândia',
  },
  {
    question: 'Os elefantes são os únicos mamíferos que não conseguem ___.',
    truth: 'pular',
  },
  {
    question: 'Entre 1808 e 1821, o Rio de Janeiro foi oficialmente a capital de um país europeu: ___.',
    truth: 'Portugal',
  },
  {
    question: 'A múmia de Ramsés II precisou receber um(a) ___ para poder viajar à França em 1976.',
    truth: 'passaporte',
  },
  {
    question: 'A primeira Copa do Mundo, em 1930, foi vencida pelo(a) ___.',
    truth: 'Uruguai',
  },
  {
    question: 'O cérebro humano representa só 2% do peso do corpo, mas consome cerca de ___% de toda a energia.',
    truth: '20',
  },
  {
    question: 'A girafa tem exatamente o mesmo número de vértebras no pescoço que o ser humano: ___.',
    truth: 'sete',
  },
  {
    question: 'O Brasil faz fronteira com todos os países da América do Sul, menos o Chile e o(a) ___.',
    truth: 'Equador',
  },
  {
    question: 'O único mamífero capaz de voar de verdade, batendo asas, é o(a) ___.',
    truth: 'morcego',
  },
  {
    question: 'A Coreia do Norte e a Finlândia são separadas por um único país: ___.',
    truth: 'a Rússia',
  },
];

// ---------------------------------------------------------------------------
// LEILÃO — 30 categorias com profundidade (mas que apertam depois de 6 ou 7)
// ---------------------------------------------------------------------------
const leilao = [
  { category: 'Países que fazem fronteira com o Brasil' },
  { category: 'Seleções que já ganharam a Copa do Mundo masculina' },
  { category: 'Ingredientes que vão numa feijoada' },
  { category: 'Filmes dirigidos por Quentin Tarantino' },
  { category: 'Estados da região Nordeste do Brasil' },
  { category: 'Capitais de estados brasileiros' },
  { category: 'Personagens da série Chaves' },
  { category: 'Bandas brasileiras de rock dos anos 80' },
  { category: 'Marcas de carro vendidas no Brasil' },
  { category: 'Filmes de animação da Pixar' },
  { category: 'Personagens da Turma da Mônica' },
  { category: 'Times que já jogaram a Série A do Brasileirão', hint: 'Vale qualquer time de qualquer ano' },
  { category: 'Frutas que dão suco' },
  { category: 'Programas de auditório da TV brasileira', hint: 'De qualquer emissora e qualquer época' },
  { category: 'Duplas sertanejas' },
  { category: 'Instrumentos de uma bateria de escola de samba' },
  { category: 'Filmes em que Tom Hanks atuou' },
  { category: 'Presidentes do Brasil desde 1985' },
  { category: 'Países da América do Sul' },
  { category: 'Comidas típicas de festa junina' },
  { category: 'Vilões dos desenhos da Disney' },
  { category: 'Super-heróis da Marvel' },
  { category: 'Coisas que você leva para a praia' },
  { category: 'Tipos de macarrão' },
  { category: 'Cidades que já sediaram uma Olimpíada de verão' },
  { category: 'Animais que botam ovos' },
  { category: 'Elementos da tabela periódica' },
  { category: 'Filmes da saga Star Wars', hint: 'Só os longas do cinema' },
  { category: 'Coisas que sempre dão errado num churrasco' },
  { category: 'Músicas de Roberto Carlos' },
];

// ---------------------------------------------------------------------------
// RELÂMPAGO — 50 perguntas de múltipla escolha, difíceis de verdade
// ---------------------------------------------------------------------------
const relampago = [
  { text: 'Em que ano caiu o Muro de Berlim?', options: ['1985', '1987', '1989', '1991'], answerIndex: 2 },
  { text: 'Qual é a capital da Austrália?', options: ['Canberra', 'Sydney', 'Melbourne', 'Perth'], answerIndex: 0 },
  { text: 'Quem escreveu "Dom Casmurro"?', options: ['José de Alencar', 'Eça de Queirós', 'Graciliano Ramos', 'Machado de Assis'], answerIndex: 3 },
  { text: 'O símbolo químico K representa qual elemento?', options: ['Cálcio', 'Potássio', 'Criptônio', 'Cobalto'], answerIndex: 1 },
  { text: 'Em que ano o Brasil conquistou o pentacampeonato mundial?', options: ['1994', '2002', '1998', '2006'], answerIndex: 1 },
  { text: 'Qual país tem o maior número de fusos horários?', options: ['Rússia', 'Estados Unidos', 'China', 'França'], answerIndex: 3 },
  { text: 'Qual é o maior deserto do mundo?', options: ['Antártica', 'Saara', 'Gobi', 'Atacama'], answerIndex: 0 },
  { text: 'Quem pintou "A Noite Estrelada"?', options: ['Claude Monet', 'Paul Cézanne', 'Vincent van Gogh', 'Paul Gauguin'], answerIndex: 2 },
  { text: 'Qual foi o primeiro país do mundo a garantir o voto feminino, em 1893?', options: ['Nova Zelândia', 'Finlândia', 'Estados Unidos', 'Reino Unido'], answerIndex: 0 },
  { text: 'Quantos ossos tem o corpo humano adulto?', options: ['186', '198', '206', '224'], answerIndex: 2 },
  { text: 'Qual é a moeda oficial da Polônia?', options: ['Zloty', 'Coroa', 'Florim', 'Leu'], answerIndex: 0 },
  { text: 'Em que ano foi proclamada a República no Brasil?', options: ['1822', '1888', '1891', '1889'], answerIndex: 3 },
  { text: 'Quem dirigiu o filme "Cidade de Deus" ao lado de Kátia Lund?', options: ['Walter Salles', 'José Padilha', 'Kleber Mendonça Filho', 'Fernando Meirelles'], answerIndex: 3 },
  { text: 'Qual planeta do Sistema Solar tem hoje o maior número de luas confirmadas?', options: ['Júpiter', 'Saturno', 'Urano', 'Netuno'], answerIndex: 1 },
  { text: 'Quantos anos durou, de fato, a Guerra dos Cem Anos?', options: ['100', '106', '116', '121'], answerIndex: 2 },
  { text: 'Qual é a língua com mais falantes nativos no mundo?', options: ['Mandarim', 'Inglês', 'Espanhol', 'Hindi'], answerIndex: 0 },
  { text: 'Quem foi o astronauta da Apollo 11 que ficou orbitando a Lua sem pousar?', options: ['Buzz Aldrin', 'Alan Shepard', 'Michael Collins', 'John Glenn'], answerIndex: 2 },
  { text: 'Em que ano "Os Simpsons" estreou como série própria?', options: ['1985', '1987', '1991', '1989'], answerIndex: 3 },
  { text: 'Qual metal é líquido à temperatura ambiente?', options: ['Mercúrio', 'Gálio', 'Chumbo', 'Sódio'], answerIndex: 0 },
  { text: 'Qual é a capital do Canadá?', options: ['Toronto', 'Montreal', 'Ottawa', 'Vancouver'], answerIndex: 2 },
  { text: 'Quem escreveu "Cem Anos de Solidão"?', options: ['Jorge Luis Borges', 'Gabriel García Márquez', 'Mario Vargas Llosa', 'Julio Cortázar'], answerIndex: 1 },
  { text: 'Qual é o osso mais longo do corpo humano?', options: ['Tíbia', 'Úmero', 'Fíbula', 'Fêmur'], answerIndex: 3 },
  { text: 'Em que cidade fica a sede da ONU?', options: ['Genebra', 'Bruxelas', 'Haia', 'Nova York'], answerIndex: 3 },
  { text: 'Qual foi a primeira novela brasileira exibida em cores?', options: ['Selva de Pedra', 'O Bem-Amado', 'Irmãos Coragem', 'Gabriela'], answerIndex: 1 },
  { text: 'Quantos elementos químicos a tabela periódica tem atualmente?', options: ['108', '112', '118', '124'], answerIndex: 2 },
  { text: 'Em que ano foi lançado o primeiro iPhone?', options: ['2005', '2007', '2009', '2010'], answerIndex: 1 },
  { text: 'Qual é o maior lago de água doce do mundo em área?', options: ['Baikal', 'Vitória', 'Tanganica', 'Superior'], answerIndex: 3 },
  { text: 'Quem compôs "As Quatro Estações"?', options: ['Bach', 'Mozart', 'Vivaldi', 'Händel'], answerIndex: 2 },
  { text: 'Qual país sediou a Copa do Mundo de 1970?', options: ['Brasil', 'Argentina', 'Espanha', 'México'], answerIndex: 3 },
  { text: 'Qual é a capital do Marrocos?', options: ['Rabat', 'Casablanca', 'Marrakech', 'Fez'], answerIndex: 0 },
  { text: 'Como se chama a passagem direta do estado sólido para o gasoso?', options: ['Deposição', 'Sublimação', 'Condensação', 'Fusão'], answerIndex: 1 },
  { text: 'Quem foi o primeiro presidente brasileiro eleito por voto direto depois da ditadura militar?', options: ['Fernando Collor', 'Tancredo Neves', 'José Sarney', 'Itamar Franco'], answerIndex: 0 },
  { text: 'Em que ano a União Soviética deixou oficialmente de existir?', options: ['1989', '1990', '1992', '1991'], answerIndex: 3 },
  { text: 'Qual é a maior lua de Marte?', options: ['Deimos', 'Io', 'Fobos', 'Titã'], answerIndex: 2 },
  { text: 'Qual é a capital do estado do Tocantins?', options: ['Palmas', 'Araguaína', 'Porto Nacional', 'Gurupi'], answerIndex: 0 },
  { text: 'Em que ano Brasília foi inaugurada?', options: ['1956', '1958', '1960', '1964'], answerIndex: 2 },
  { text: 'Quem escreveu o romance "1984"?', options: ['Aldous Huxley', 'George Orwell', 'Ray Bradbury', 'H. G. Wells'], answerIndex: 1 },
  { text: 'Qual é o maior país da África em área territorial?', options: ['Sudão', 'Argélia', 'República Democrática do Congo', 'Líbia'], answerIndex: 1 },
  { text: 'Quantas cordas tem um violino?', options: ['Quatro', 'Cinco', 'Seis', 'Sete'], answerIndex: 0 },
  { text: 'Qual hormônio produzido pelo pâncreas reduz o açúcar no sangue?', options: ['Glucagon', 'Insulina', 'Adrenalina', 'Cortisol'], answerIndex: 1 },
  { text: 'Qual banda lançou o álbum "The Dark Side of the Moon"?', options: ['Pink Floyd', 'Led Zeppelin', 'The Who', 'Genesis'], answerIndex: 0 },
  { text: 'Qual é o ponto mais alto do Brasil?', options: ['Pico Paraná', 'Pico da Bandeira', 'Pico da Neblina', 'Monte Roraima'], answerIndex: 2 },
  { text: 'Quantas missões Apollo chegaram a pousar na Lua?', options: ['Quatro', 'Cinco', 'Seis', 'Sete'], answerIndex: 2 },
  { text: 'Qual é a capital da Suíça?', options: ['Zurique', 'Genebra', 'Berna', 'Basileia'], answerIndex: 2 },
  { text: 'Quem escreveu "O Pequeno Príncipe"?', options: ['Jules Verne', 'Antoine de Saint-Exupéry', 'Albert Camus', 'André Gide'], answerIndex: 1 },
  { text: 'Qual foi o primeiro satélite artificial lançado ao espaço?', options: ['Explorer 1', 'Sputnik 1', 'Vostok 1', 'Luna 1'], answerIndex: 1 },
  { text: 'Qual é a moeda oficial da Índia?', options: ['Taka', 'Dinar', 'Rupia', 'Rublo'], answerIndex: 2 },
  { text: 'Em que ano aconteceu a Semana de Arte Moderna em São Paulo?', options: ['1920', '1922', '1924', '1930'], answerIndex: 1 },
  { text: 'Qual estado brasileiro tem a maior extensão de litoral?', options: ['Maranhão', 'Bahia', 'Rio Grande do Sul', 'Pará'], answerIndex: 1 },
  { text: 'Qual é o maior órgão interno do corpo humano?', options: ['Pulmão', 'Cérebro', 'Intestino', 'Fígado'], answerIndex: 3 },
];

export const familia: Deck = {
  mimica,
  tabu,
  mentiroso,
  leilao,
  relampago,
};
