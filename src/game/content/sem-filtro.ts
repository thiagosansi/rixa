import type { Deck } from './index';

/**
 * RIXA — Baralho "Sem Filtro"
 *
 * Tom: humor adulto liberado — duplo sentido, ressaca, bebida, aplicativo de
 * namoro, vida de casal, palavrão leve, perrengue de balada e vergonha alheia.
 * Referência: Cards Against Humanity em versão mais leve e brasileira.
 *
 * Limites: nada envolvendo menores, nada explícito ou gráfico, nada de
 * violência sexual, nada de conteúdo de ódio e nada de piada degradante com
 * pessoa real específica. Safadeza consensual entre adultos: liberada.
 */

// ---------------------------------------------------------------------------
// MÍMICA — 60 palavras/expressões para encenar sem falar (60 segundos por turno)
// ---------------------------------------------------------------------------
const mimica = [
  'Ressaca',
  'Beijo de língua',
  'Pole dance',
  'Despedida de solteiro',
  'Sunga apertada',
  'Barriga de chope',
  'Fazer tatuagem',
  'Soprar o bafômetro',
  'Vomitar dentro do Uber',
  'Fila do banheiro da balada',
  'Bêbado tentando parecer sóbrio',
  'Cantada',
  'Levar um fora',
  'Stalkear o ex',
  'Mandar mensagem pro ex',
  'Dar match',
  'Esconder o chupão',
  'Sogra escutando atrás da porta',
  'Teste de gravidez',
  'Striptease',
  'Salto quebrado',
  'Shot de tequila',
  'Serenata',
  'Dormir no ponto de ônibus',
  'Descer até o chão',
  'Bloco de Carnaval',
  'Briga de casal',
  'Crise de ciúme',
  'Pedido de casamento',
  'Gogo boy',
  'Dança do ventre',
  'Dor de cotovelo',
  'Pular a cerca',
  'Segurar vela',
  'Pagar mico',
  'Corno',
  'Pé na bunda',
  'Fazer xixi na rua',
  'Praia de nudismo',
  'Depilação com cera',
  'Exame de próstata',
  'Tirar o sutiã',
  'Calcinha enfiada',
  'Bartender',
  'Segurança de balada',
  'DJ',
  'Abrir cerveja no dente',
  'Brinde',
  'Beer pong',
  'Sair sem pagar a conta',
  'Mandar nudes',
  'Dormir de conchinha',
  'Roncar',
  'Roubar o cobertor',
  'Amante escondido no armário',
  'Ressaca moral',
  'Amnésia alcoólica',
  'Sofrência',
  'Forró',
  'Levar vácuo',
];

// ---------------------------------------------------------------------------
// TABU — 45 cartas, exatamente 3 palavras proibidas cada
// ---------------------------------------------------------------------------
const tabu = [
  { word: 'Camisinha', forbidden: ['sexo', 'proteger', 'farmácia'] },
  { word: 'Motel', forbidden: ['hotel', 'quarto', 'suíte'] },
  { word: 'Ressaca', forbidden: ['dor de cabeça', 'álcool', 'manhã seguinte'] },
  { word: 'Tinder', forbidden: ['aplicativo', 'match', 'namoro'] },
  { word: 'Cerveja', forbidden: ['gelada', 'chope', 'lata'] },
  { word: 'Cachaça', forbidden: ['pinga', 'caipirinha', 'alambique'] },
  { word: 'Beijo', forbidden: ['boca', 'língua', 'selinho'] },
  { word: 'Despedida de solteiro', forbidden: ['noivo', 'casar', 'amigos'] },
  { word: 'Lua de mel', forbidden: ['viagem', 'recém-casados', 'hotel'] },
  { word: 'Bafômetro', forbidden: ['assoprar', 'polícia', 'motorista'] },
  { word: 'Balada', forbidden: ['dançar', 'noite', 'DJ'] },
  { word: 'Biquíni', forbidden: ['praia', 'mulher', 'verão'] },
  { word: 'Sutiã', forbidden: ['peito', 'alça', 'lingerie'] },
  { word: 'Cantada', forbidden: ['paquera', 'frase', 'xaveco'] },
  { word: 'Bêbado', forbidden: ['álcool', 'cair', 'cambalear'] },
  { word: 'Vodca', forbidden: ['destilado', 'russo', 'incolor'] },
  { word: 'Caipirinha', forbidden: ['limão', 'açúcar', 'pinga'] },
  { word: 'Boteco', forbidden: ['bar', 'mesa', 'calçada'] },
  { word: 'Tequila', forbidden: ['sal', 'limão', 'México'] },
  { word: 'Uísque', forbidden: ['gelo', 'escocês', 'dose'] },
  { word: 'Karaokê', forbidden: ['cantar', 'microfone', 'letra'] },
  { word: 'Carnaval', forbidden: ['fantasia', 'bloco', 'fevereiro'] },
  { word: 'Chupão', forbidden: ['pescoço', 'marca', 'roxo'] },
  { word: 'Solteiro', forbidden: ['namorado', 'casado', 'sozinho'] },
  { word: 'Traição', forbidden: ['chifre', 'amante', 'pular a cerca'] },
  { word: 'Ciúme', forbidden: ['namorado', 'olhar', 'possessivo'] },
  { word: 'Gravidez', forbidden: ['barriga', 'bebê', 'teste'] },
  { word: 'Viagra', forbidden: ['azul', 'comprimido', 'homem'] },
  { word: 'Lingerie', forbidden: ['calcinha', 'sutiã', 'renda'] },
  { word: 'Algema', forbidden: ['polícia', 'pulso', 'prender'] },
  { word: 'Tatuagem', forbidden: ['pele', 'agulha', 'desenho'] },
  { word: 'Piercing', forbidden: ['furo', 'orelha', 'umbigo'] },
  { word: 'Dieta', forbidden: ['emagrecer', 'comida', 'balança'] },
  { word: 'Sogra', forbidden: ['mãe', 'genro', 'nora'] },
  { word: 'Ex-namorado', forbidden: ['terminar', 'relacionamento', 'passado'] },
  { word: 'Stalker', forbidden: ['seguir', 'perfil', 'espiar'] },
  { word: 'Print', forbidden: ['tela', 'celular', 'foto'] },
  { word: 'Áudio de cinco minutos', forbidden: ['WhatsApp', 'ouvir', 'falar'] },
  { word: 'Happy hour', forbidden: ['sexta', 'trabalho', 'bar'] },
  { word: 'Sexta-feira', forbidden: ['fim de semana', 'trabalho', 'festa'] },
  { word: 'Churrasco', forbidden: ['carne', 'espeto', 'domingo'] },
  { word: 'Espumante', forbidden: ['garrafa', 'rolha', 'brinde'] },
  { word: 'Motorista de aplicativo', forbidden: ['carro', 'corrida', 'celular'] },
  { word: 'Pole dance', forbidden: ['barra', 'aula', 'giro'] },
  { word: 'Gogo boy', forbidden: ['dançarino', 'homem', 'palco'] },
];

// ---------------------------------------------------------------------------
// MENTIROSO — 40 perguntas estilo Fibbage (a verdade é real e verificável)
// ---------------------------------------------------------------------------
const mentiroso = [
  {
    question: 'Os antigos romanos usavam ___ como enxaguante bucal e clareador de dentes.',
    truth: 'urina',
  },
  {
    question: 'A cerveja mais forte já produzida no mundo, a Snake Venom, tem cerca de ___% de teor alcoólico.',
    truth: '67',
  },
  {
    question: 'Na Europa medieval, era normal beber cerveja no café da manhã porque ela era mais ___ que a água.',
    truth: 'segura',
  },
  {
    question: 'A palavra "vodca" vem do russo e significa, literalmente, pequena ___.',
    truth: 'água',
  },
  {
    question: 'O maior órgão do corpo humano é o(a) ___.',
    truth: 'pele',
  },
  {
    question: 'As palavras "testemunha" e "testículo" vêm da mesma palavra em latim: ___.',
    truth: 'testis',
  },
  {
    question: 'O pato é um dos raros animais em que o macho tem o órgão sexual em formato de ___.',
    truth: 'espiral',
  },
  {
    question: 'Boa parte da ressaca é culpa de um subproduto tóxico do álcool chamado ___.',
    truth: 'acetaldeído',
  },
  {
    question: 'O Tinder foi lançado no mundo no ano de ___.',
    truth: '2012',
  },
  {
    question: 'Um estudo holandês calculou que um beijo de língua de 10 segundos troca cerca de ___ milhões de bactérias.',
    truth: '80',
  },
  {
    question: 'O Viagra foi desenvolvido originalmente como remédio para ___.',
    truth: 'angina',
  },
  {
    question: 'A palavra "vagina" vem do latim e significa, literalmente, ___.',
    truth: 'bainha de espada',
  },
  {
    question: 'O clitóris tem cerca de ___ mil terminações nervosas.',
    truth: '10',
  },
  {
    question: 'Em Paris, uma lei que proibia mulheres de usar ___ só foi oficialmente revogada em 2013.',
    truth: 'calças',
  },
  {
    question: 'O Kama Sutra é um texto antigo originário do(a) ___.',
    truth: 'Índia',
  },
  {
    question: 'Um homem adulto produz, em média, cerca de ___ espermatozoides por segundo.',
    truth: '1.500',
  },
  {
    question: 'A cerveja Guinness, aquela preta com espuma cremosa, é originária do(a) ___.',
    truth: 'Irlanda',
  },
  {
    question: 'A palavra "uísque" vem do gaélico "uisce beatha", que significa água da ___.',
    truth: 'vida',
  },
  {
    question: 'O gato macho tem o órgão sexual coberto de pequenos(as) ___, e é por isso que a fêmea grita no acasalamento.',
    truth: 'espinhos',
  },
  {
    question: 'A fêmea do louva-a-deus às vezes ___ do macho durante ou logo depois do acasalamento.',
    truth: 'come a cabeça',
  },
  {
    question: 'A Red Bull foi inspirada num energético que o fundador provou numa viagem ao(à) ___.',
    truth: 'Tailândia',
  },
  {
    question: 'Os coalas têm impressões digitais quase idênticas às de ___.',
    truth: 'humanos',
  },
  {
    question: 'Por lei, um destilado só pode se chamar cachaça se tiver sido produzido no(a) ___.',
    truth: 'Brasil',
  },
  {
    question: 'Um adulto tem, em média, cerca de ___ litros de sangue no corpo.',
    truth: 'cinco',
  },
  {
    question: 'O órgão sexual do porco tem formato de ___, o que ajuda o encaixe durante o acasalamento.',
    truth: 'saca-rolhas',
  },
  {
    question: 'Junto com os humanos, os golfinhos são dos pouquíssimos animais que fazem sexo por ___.',
    truth: 'prazer',
  },
  {
    question: 'Os romanos tinham uma deusa chamada Cloacina, que era a deusa do(a) ___.',
    truth: 'esgoto',
  },
  {
    question: 'Nos banheiros públicos da Roma Antiga, o papel higiênico era uma esponja presa em um(a) ___.',
    truth: 'vara',
  },
  {
    question: 'A palavra "sarcasmo" vem do grego e significa literalmente ___.',
    truth: 'rasgar a carne',
  },
  {
    question: 'O recordista histórico de número de filhos é o sultão Moulay Ismail, com mais de ___ filhos registrados.',
    truth: '800',
  },
  {
    question: 'A ressaca costuma ser pior com bebidas escuras por causa de substâncias chamadas ___.',
    truth: 'congêneres',
  },
  {
    question: 'A pílula anticoncepcional foi aprovada e chegou ao mercado americano no ano de ___.',
    truth: '1960',
  },
  {
    question: 'O recorde comprovado de tempo acordado sem dormir é de cerca de ___ dias.',
    truth: 'onze',
  },
  {
    question: 'As camisinhas mais antigas já encontradas por arqueólogos são do século ___.',
    truth: 'XVII',
  },
  {
    question: 'Na Grécia Antiga, os atletas disputavam as Olimpíadas completamente ___.',
    truth: 'nus',
  },
  {
    question: 'A Lei Seca brasileira, que proíbe dirigir depois de beber, entrou em vigor em ___.',
    truth: '2008',
  },
  {
    question: 'Estudos com cronômetro apontam que a média de duração de uma relação sexual é de cerca de ___ minutos.',
    truth: 'cinco',
  },
  {
    question: 'O animal com o maior órgão sexual em proporção ao próprio corpo é o(a) ___.',
    truth: 'craca',
  },
  {
    question: 'O hipopótamo produz um suor natural de cor ___ que funciona como protetor solar.',
    truth: 'vermelha',
  },
  {
    question: 'Passamos, em média, cerca de ___ da vida inteira dormindo.',
    truth: 'um terço',
  },
];

// ---------------------------------------------------------------------------
// LEILÃO — 30 categorias com profundidade (mas que apertam depois de 6 ou 7)
// ---------------------------------------------------------------------------
const leilao = [
  { category: 'Drinques que levam vodca' },
  { category: 'Marcas de cerveja vendidas no Brasil' },
  { category: 'Marcas de cachaça' },
  { category: 'Aplicativos de namoro e paquera' },
  { category: 'Petiscos clássicos de boteco' },
  { category: 'Desculpas para sair mais cedo da festa' },
  { category: 'Desculpas para faltar ao trabalho na segunda-feira' },
  { category: 'Coisas que ninguém deveria dizer num primeiro encontro' },
  { category: 'Mentiras que as pessoas contam no perfil do aplicativo de namoro' },
  { category: 'Apelidos carinhosos de casal' },
  { category: 'Sinais de que a ressaca de amanhã vai ser braba' },
  { category: 'Coisas que você acha no chão de uma balada às 5 da manhã' },
  { category: 'Bebidas que dão a pior ressaca' },
  { category: 'Motivos para dar unfollow em alguém' },
  { category: 'Músicas que todo mundo canta errado no karaokê' },
  { category: 'Formas covardes de terminar um namoro' },
  { category: 'Coisas que você não conta para a sua mãe' },
  { category: 'Clichês de cantada ruim' },
  { category: 'Partes do corpo que passam a doer depois dos 30' },
  { category: 'Coisas que acontecem numa despedida de solteiro' },
  { category: 'Tipos de bêbado que sempre aparecem numa festa' },
  { category: 'Motivos bobos para brigar com o parceiro' },
  { category: 'Coisas que a gente finge gostar para agradar o crush' },
  { category: 'Lugares onde as pessoas já perderam o celular' },
  { category: 'Desculpas para não transar hoje' },
  { category: 'Coisas que dão errado numa viagem de amigos' },
  { category: 'Vexames possíveis na festa de fim de ano da empresa' },
  { category: 'Coisas que só se faz depois da terceira cerveja' },
  { category: 'Tipos de ex que todo mundo já teve' },
  { category: 'Frases ditas na fila do banheiro da balada' },
];

// ---------------------------------------------------------------------------
// RELÂMPAGO — 50 perguntas de múltipla escolha, difíceis de verdade
// ---------------------------------------------------------------------------
const relampago = [
  { text: 'Além de Campari e vermute, qual destilado forma o Negroni?', options: ['Vodca', 'Gin', 'Rum', 'Tequila'], answerIndex: 1 },
  { text: 'Qual é o teor alcoólico permitido por lei para a cachaça no Brasil?', options: ['30% a 40%', '35% a 45%', '38% a 48%', '40% a 50%'], answerIndex: 2 },
  { text: 'O Moscow Mule leva vodca, limão e o quê?', options: ['Água tônica', 'Refrigerante de limão', 'Água com gás', 'Cerveja de gengibre'], answerIndex: 3 },
  { text: 'O gim-tônica surgiu porque a quinina da tônica combatia qual doença?', options: ['Malária', 'Febre amarela', 'Cólera', 'Escorbuto'], answerIndex: 0 },
  { text: 'Qual hormônio é associado ao apego e liberado no abraço e no orgasmo?', options: ['Serotonina', 'Melatonina', 'Ocitocina', 'Testosterona'], answerIndex: 2 },
  { text: 'Qual banda gravou "Sex on Fire"?', options: ['Nickelback', 'Kings of Leon', 'The Killers', 'Maroon 5'], answerIndex: 1 },
  { text: 'De que ano é o filme "Beleza Americana"?', options: ['1995', '1997', '2001', '1999'], answerIndex: 3 },
  { text: 'Qual destes NÃO entra numa caipirinha tradicional?', options: ['Água tônica', 'Cachaça', 'Limão', 'Açúcar'], answerIndex: 0 },
  { text: 'Qual é o teor alcoólico típico de uma cerveja Pilsen comum?', options: ['2% a 3%', '7% a 8%', '10% a 12%', '4% a 5%'], answerIndex: 3 },
  { text: 'A palavra "afrodisíaco" vem do nome de qual deusa grega?', options: ['Atena', 'Hera', 'Afrodite', 'Ártemis'], answerIndex: 2 },
  { text: 'O que é veisalgia?', options: ['Medo de bar', 'O nome científico da ressaca', 'Alergia a álcool', 'Perda de olfato'], answerIndex: 1 },
  { text: 'Barney Stinson é personagem de qual série?', options: ['How I Met Your Mother', 'Friends', 'The Office', 'Two and a Half Men'], answerIndex: 0 },
  { text: 'Qual músculo é trabalhado nos exercícios de Kegel?', options: ['Sartório', 'Pubococcígeo', 'Deltoide', 'Psoas'], answerIndex: 1 },
  { text: 'Qual drinque leva rum, hortelã, limão, açúcar e água com gás?', options: ['Caipiroska', 'Daiquiri', 'Mojito', 'Cuba Libre'], answerIndex: 2 },
  { text: 'De que ano é o filme "Instinto Selvagem", com Sharon Stone?', options: ['1988', '1990', '1994', '1992'], answerIndex: 3 },
  { text: 'Qual país tem o maior consumo de cerveja por habitante do mundo?', options: ['República Tcheca', 'Alemanha', 'Bélgica', 'Irlanda'], answerIndex: 0 },
  { text: 'Em que ano acabou a Lei Seca nos Estados Unidos?', options: ['1929', '1931', '1933', '1935'], answerIndex: 2 },
  { text: 'Qual revista Hugh Hefner fundou em 1953?', options: ['Penthouse', 'Playboy', 'Hustler', 'Maxim'], answerIndex: 1 },
  { text: 'Em que ano o Tinder foi lançado?', options: ['2012', '2010', '2014', '2016'], answerIndex: 0 },
  { text: 'Qual banda lançou a polêmica "Closer", em 1994?', options: ['Depeche Mode', 'Nine Inch Nails', 'Marilyn Manson', 'Ministry'], answerIndex: 1 },
  { text: 'Qual drinque é feito com espumante e suco de laranja?', options: ['Bellini', 'Spritz', 'Mimosa', 'Kir Royal'], answerIndex: 2 },
  { text: 'Quem dirigiu "Laranja Mecânica"?', options: ['Martin Scorsese', 'Roman Polanski', 'David Lynch', 'Stanley Kubrick'], answerIndex: 3 },
  { text: 'Em que década a pílula anticoncepcional chegou ao mercado?', options: ['1960', '1940', '1950', '1970'], answerIndex: 0 },
  { text: 'Qual destilado é feito a partir da agave azul?', options: ['Tequila', 'Pisco', 'Rum', 'Cachaça'], answerIndex: 0 },
  { text: 'Qual é o drinque nacional do Peru?', options: ['Margarita', 'Mojito', 'Pisco Sour', 'Caipiroska'], answerIndex: 2 },
  { text: 'Qual álbum de Prince foi um dos estopins para a criação do selo "Parental Advisory"?', options: ['1999', "Sign o' the Times", 'Dirty Mind', 'Purple Rain'], answerIndex: 3 },
  { text: 'Qual destes filmes NÃO é dirigido por Pedro Almodóvar?', options: ['Fale com Ela', 'Match Point', 'Tudo sobre Minha Mãe', 'A Pele que Habito'], answerIndex: 1 },
  { text: 'Em qual cidade fica o distrito da luz vermelha mais famoso da Europa?', options: ['Hamburgo', 'Amsterdã', 'Berlim', 'Praga'], answerIndex: 1 },
  { text: 'Quantos mililitros costuma ter uma dose padrão de destilado no Brasil?', options: ['20 ml', '30 ml', '50 ml', '100 ml'], answerIndex: 2 },
  { text: 'Quem completa o "Clube dos 27" ao lado de Janis Joplin, Jim Morrison e Kurt Cobain?', options: ['Elvis Presley', 'Freddie Mercury', 'John Lennon', 'Jimi Hendrix'], answerIndex: 3 },
  { text: 'Qual é a bebida destilada coreana que lidera as vendas mundiais?', options: ['Soju', 'Saquê', 'Baijiu', 'Makgeolli'], answerIndex: 0 },
  { text: 'Em que ano estreou a série "Sex and the City"?', options: ['1996', '2000', '2002', '1998'], answerIndex: 3 },
  { text: 'Qual destes NÃO é um sintoma típico de ressaca?', options: ['Dor de cabeça', 'Náusea', 'Febre alta', 'Sensibilidade à luz'], answerIndex: 2 },
  { text: 'Qual neurotransmissor está mais ligado à sensação de prazer e recompensa?', options: ['Insulina', 'Dopamina', 'Tiroxina', 'Prolactina'], answerIndex: 1 },
  { text: 'Qual filme de 1976 com Sônia Braga virou um dos maiores fenômenos de bilheteria do cinema brasileiro?', options: ['Dona Flor e Seus Dois Maridos', 'A Dama do Lotação', 'Gabriela', 'Eu Te Amo'], answerIndex: 0 },
  { text: 'Qual drinque leva vodca, licor de café e creme de leite?', options: ['Black Russian', 'White Russian', 'Alexander', 'Espresso Martini'], answerIndex: 1 },
  { text: 'Quantos anos, no mínimo, um uísque precisa envelhecer para ser chamado de Scotch?', options: ['Um', 'Dois', 'Três', 'Cinco'], answerIndex: 2 },
  { text: 'Em qual destes países a idade legal para beber é 21 anos?', options: ['Brasil', 'Alemanha', 'Argentina', 'Estados Unidos'], answerIndex: 3 },
  { text: 'De qual região da França vem o champanhe legítimo?', options: ['Champagne', 'Bordeaux', 'Borgonha', 'Provence'], answerIndex: 0 },
  { text: 'Qual música de Chico Buarque brinca com o trocadilho entre "cálice" e "cale-se"?', options: ['Construção', 'Apesar de Você', 'Cálice', 'Roda Viva'], answerIndex: 2 },
  { text: 'Em qual aplicativo de namoro só as mulheres podem iniciar a conversa em matches heterossexuais?', options: ['Tinder', 'Bumble', 'Happn', 'Hinge'], answerIndex: 1 },
  { text: 'Qual destas bebidas costuma ter o maior teor alcoólico?', options: ['Vinho do Porto', 'Licor de cassis', 'Vermute', 'Absinto'], answerIndex: 3 },
  { text: 'O que é o lúpulo, usado na cerveja?', options: ['Uma flor que dá amargor e aroma', 'Um tipo de levedura', 'Um malte bem torrado', 'Um barril de madeira'], answerIndex: 0 },
  { text: 'O que significa a gíria "hangxiety"?', options: ['Medo de balada', 'A ansiedade do dia seguinte à bebedeira', 'Fobia de álcool', 'Dor muscular pós-treino'], answerIndex: 1 },
  { text: 'De qual década é o filme "9 Semanas e Meia de Amor"?', options: ['1960', '1970', '1980', '1990'], answerIndex: 2 },
  { text: 'Em que ano estreou a série "Game of Thrones"?', options: ['2007', '2009', '2013', '2011'], answerIndex: 3 },
  { text: 'Além de vodca, qual suco é a base do Bloody Mary?', options: ['Tomate', 'Cranberry', 'Laranja', 'Maracujá'], answerIndex: 0 },
  { text: 'No Brasil, uma cerveja pode ser vendida como "sem álcool" se tiver menos de quanto?', options: ['0,5%', '0,1%', '1%', '2%'], answerIndex: 0 },
  { text: 'Qual drinque leva tequila, licor de laranja e limão?', options: ['Daiquiri', 'Margarita', 'Cosmopolitan', 'Negroni'], answerIndex: 1 },
  { text: 'O que é um "dry martini" além de gim?', options: ['Licor de laranja', 'Vermute seco', 'Xarope de açúcar', 'Água tônica'], answerIndex: 1 },
];

export const semFiltro: Deck = {
  mimica,
  tabu,
  mentiroso,
  leilao,
  relampago,
};
