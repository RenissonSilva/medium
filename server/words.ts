// O "baralho" do Medium. Cada partida embaralha estas palavras; nenhuma se repete
// dentro da mesma partida (e o servidor evita repetir entre partidas da mesma sala).
// Fique à vontade para adicionar ou remover palavras — duplicatas são ignoradas.

const NATUREZA = [
  'Lua', 'Sol', 'Estrela', 'Cometa', 'Galáxia', 'Planeta', 'Eclipse', 'Aurora', 'Arco-íris',
  'Nuvem', 'Chuva', 'Trovão', 'Relâmpago', 'Tempestade', 'Furacão', 'Vento', 'Neve', 'Gelo',
  'Neblina', 'Orvalho', 'Mar', 'Maré', 'Onda', 'Praia', 'Ilha', 'Rio', 'Lago', 'Cachoeira',
  'Montanha', 'Vulcão', 'Caverna', 'Deserto', 'Oásis', 'Floresta', 'Selva', 'Pântano', 'Geleira',
  'Areia', 'Pedra', 'Cristal', 'Fogo', 'Fumaça', 'Raiz', 'Folha', 'Flor', 'Semente', 'Cacto',
  'Girassol', 'Rosa', 'Musgo', 'Coral', 'Concha', 'Horizonte', 'Crepúsculo', 'Primavera', 'Verão',
  'Outono', 'Inverno', 'Terremoto', 'Meteoro', 'Iceberg', 'Fóssil', 'Planta', 'Serra',
];

const ANIMAIS = [
  'Gato', 'Cachorro', 'Lobo', 'Raposa', 'Urso', 'Coruja', 'Águia', 'Papagaio', 'Pavão', 'Flamingo',
  'Pinguim', 'Cisne', 'Pombo', 'Galinha', 'Baleia', 'Golfinho', 'Tubarão', 'Polvo', 'Lagosta',
  'Caranguejo', 'Abelha', 'Formiga', 'Borboleta', 'Vaga-lume', 'Mosquito', 'Aranha', 'Minhoca',
  'Caracol', 'Camaleão', 'Jacaré', 'Cobra', 'Tartaruga', 'Sapo', 'Leão', 'Tigre', 'Zebra', 'Girafa',
  'Elefante', 'Macaco', 'Canguru', 'Panda', 'Coelho', 'Esquilo', 'Rato', 'Morcego', 'Cavalo', 'Vaca',
  'Porco', 'Ovelha', 'Beija-flor', 'Tatu', 'Preguiça', 'Onça', 'Capivara', 'Tucano', 'Arara',
  'Dinossauro', 'Escorpião', 'Pulga', 'Lagartixa', 'Pena',
];

const FANTASIA = [
  'Dragão', 'Unicórnio', 'Sereia', 'Lobisomem', 'Vampiro', 'Fantasma', 'Bruxa', 'Fada', 'Gigante',
  'Duende', 'Zumbi', 'Alienígena', 'Robô', 'Monstro', 'Saci', 'Curupira', 'Múmia', 'Gênio', 'Mago',
  'Feitiço', 'Poção', 'Varinha', 'Tesouro', 'Maldição',
];

const COMIDA = [
  'Queijo', 'Pão', 'Café', 'Chocolate', 'Pipoca', 'Pizza', 'Sorvete', 'Mel', 'Limão', 'Banana',
  'Morango', 'Abacaxi', 'Melancia', 'Uva', 'Maçã', 'Laranja', 'Coco', 'Pimenta', 'Alho', 'Cebola',
  'Tomate', 'Batata', 'Milho', 'Arroz', 'Feijão', 'Ovo', 'Leite', 'Manteiga', 'Bolo', 'Biscoito',
  'Brigadeiro', 'Pastel', 'Coxinha', 'Churrasco', 'Sopa', 'Salada', 'Sushi', 'Hambúrguer',
  'Macarrão', 'Açúcar', 'Sal', 'Azeite', 'Chá', 'Suco', 'Pudim', 'Paçoca', 'Tapioca', 'Açaí',
  'Mandioca', 'Goiabada', 'Canela', 'Caramelo', 'Chiclete', 'Pirulito', 'Panqueca', 'Torrada',
  'Melão', 'Abacate', 'Cenoura', 'Pepino', 'Cogumelo', 'Amendoim', 'Castanha', 'Pamonha', 'Quindim',
  'Feijoada', 'Farofa', 'Picolé', 'Algodão-doce', 'Gelatina', 'Iogurte', 'Mostarda', 'Vinagre',
  'Fermento', 'Pimentão', 'Beterraba', 'Jabuticaba', 'Caju', 'Goiaba', 'Maracujá', 'Manga', 'Bala',
  'Cravo',
];

const OBJETOS = [
  'Guarda-chuva', 'Piano', 'Bússola', 'Relógio', 'Espelho', 'Chave', 'Cadeado', 'Vela', 'Lâmpada',
  'Lanterna', 'Óculos', 'Chapéu', 'Sapato', 'Meia', 'Luva', 'Cachecol', 'Anel', 'Colar', 'Coroa',
  'Espada', 'Escudo', 'Martelo', 'Prego', 'Tesoura', 'Agulha', 'Botão', 'Zíper', 'Livro', 'Caderno',
  'Lápis', 'Caneta', 'Borracha', 'Mapa', 'Carta', 'Envelope', 'Selo', 'Moeda', 'Cofre', 'Mala',
  'Mochila', 'Garrafa', 'Copo', 'Xícara', 'Prato', 'Garfo', 'Faca', 'Colher', 'Panela', 'Geladeira',
  'Cama', 'Travesseiro', 'Cobertor', 'Sofá', 'Cadeira', 'Mesa', 'Janela', 'Porta', 'Escada',
  'Elevador', 'Telhado', 'Chaminé', 'Ponte', 'Torre', 'Castelo', 'Farol', 'Moinho', 'Balão', 'Pipa',
  'Bola', 'Boneca', 'Dado', 'Pião', 'Ioiô', 'Bicicleta', 'Patins', 'Skate', 'Carro', 'Ônibus', 'Trem',
  'Avião', 'Navio', 'Barco', 'Foguete', 'Submarino', 'Helicóptero', 'Âncora', 'Remo', 'Rede', 'Anzol',
  'Telescópio', 'Microscópio', 'Ímã', 'Bateria', 'Tomada', 'Antena', 'Rádio', 'Televisão', 'Câmera',
  'Celular', 'Computador', 'Teclado', 'Microfone', 'Violão', 'Guitarra', 'Tambor', 'Flauta',
  'Sanfona', 'Trompete', 'Violino', 'Apito', 'Sino', 'Pincel', 'Tinta', 'Máscara', 'Fantasia',
  'Confete', 'Presente', 'Vassoura', 'Balde', 'Esponja', 'Sabão', 'Escova', 'Pente', 'Toalha',
  'Chuveiro', 'Torneira', 'Mangueira', 'Vaso', 'Cerca', 'Portão', 'Campainha', 'Calendário',
  'Ampulheta', 'Termômetro', 'Balança', 'Régua', 'Globo', 'Trono', 'Tapete', 'Cortina', 'Varal',
  'Cabide', 'Gaveta', 'Caixa', 'Cesta', 'Barril', 'Corda', 'Corrente', 'Gancho', 'Roda', 'Engrenagem',
  'Mola', 'Parafuso', 'Hélice', 'Paraquedas', 'Capacete', 'Medalha', 'Troféu', 'Bandeira', 'Ingresso',
  'Passaporte', 'Lupa', 'Bengala', 'Ventilador', 'Abajur', 'Despertador', 'Chupeta', 'Carrossel',
  'Escorregador', 'Gangorra', 'Balanço', 'Baú', 'Lençol', 'Pijama', 'Guarda-roupa', 'Fósforo', 'Lixo',
  'Regador', 'Espantalho', 'Arco', 'Flecha', 'Alvo', 'Bumerangue', 'Quebra-cabeça', 'Tabuleiro',
  'Roleta', 'Bilhete', 'Buzina', 'Semáforo', 'Pneu', 'Volante', 'Gasolina', 'Bagagem', 'Peruca',
  'Gravata', 'Bolsa', 'Carteira', 'Leque', 'Boia', 'Trampolim', 'Tobogã', 'Trapézio', 'Pasta', 'Pilha',
];

const LUGARES = [
  'Escola', 'Hospital', 'Igreja', 'Museu', 'Cinema', 'Teatro', 'Circo', 'Zoológico', 'Parque',
  'Praça', 'Mercado', 'Feira', 'Padaria', 'Farmácia', 'Biblioteca', 'Aeroporto', 'Estação', 'Estádio',
  'Academia', 'Fazenda', 'Cidade', 'Prisão', 'Labirinto', 'Pirâmide', 'Iglu', 'Porão', 'Sótão',
  'Cozinha', 'Banheiro', 'Quarto', 'Varanda', 'Quintal', 'Piscina', 'Shopping', 'Masmorra', 'Aquário',
  'Hotel', 'Restaurante', 'Correio', 'Banco', 'Laboratório', 'Fábrica', 'Oficina', 'Garagem', 'Túnel',
  'Metrô', 'Estrada', 'Esquina', 'Calçada', 'Jardim', 'Cemitério', 'Palácio', 'Acampamento', 'Mansão',
  'Cabana', 'Rodoviária', 'Universidade', 'Prefeitura', 'Sauna',
];

const PESSOAS = [
  'Médico', 'Bombeiro', 'Policial', 'Astronauta', 'Pirata', 'Ninja', 'Cientista', 'Professor',
  'Palhaço', 'Mágico', 'Detetive', 'Cozinheiro', 'Padeiro', 'Pintor', 'Cantor', 'Bailarina', 'Rei',
  'Rainha', 'Príncipe', 'Princesa', 'Soldado', 'Marinheiro', 'Pescador', 'Carteiro', 'Piloto',
  'Jardineiro', 'Dentista', 'Espião', 'Herói', 'Vilão', 'Ladrão', 'Turista', 'Vizinho', 'Bebê', 'Avó',
  'Gêmeos', 'Noiva', 'Caubói', 'Samurai', 'Viking', 'Maestro', 'Goleiro', 'Juiz', 'Surfista',
  'Inventor', 'Explorador', 'Mímico', 'Faraó', 'Cavaleiro', 'Xerife', 'Escoteiro', 'Fazendeiro',
  'Motorista', 'Garçom',
];

const IDEIAS = [
  'Amor', 'Saudade', 'Medo', 'Sonho', 'Pesadelo', 'Segredo', 'Mentira', 'Verdade', 'Sorte', 'Azar',
  'Tempo', 'Memória', 'Silêncio', 'Barulho', 'Música', 'Dança', 'Festa', 'Aniversário', 'Casamento',
  'Férias', 'Viagem', 'Aventura', 'Mistério', 'Magia', 'Liberdade', 'Paz', 'Guerra', 'Vitória',
  'Derrota', 'Desafio', 'Riso', 'Lágrima', 'Beijo', 'Abraço', 'Grito', 'Sussurro', 'Cheiro', 'Sabor',
  'Sombra', 'Luz', 'Escuridão', 'Brilho', 'Eco', 'Ritmo', 'Promessa', 'Desejo', 'Coragem', 'Ciúme',
  'Raiva', 'Alegria', 'Tristeza', 'Infância', 'Futuro', 'Passado', 'Destino', 'Esperança', 'Infinito',
  'Vazio', 'Caos', 'Equilíbrio', 'Energia', 'Velocidade', 'Gravidade', 'Fome', 'Sede', 'Sono', 'Febre',
  'Cócegas', 'Soluço', 'Bocejo', 'Espirro', 'Dor', 'Veneno', 'Remédio', 'Vacina', 'Dinheiro', 'Fama',
  'Poder', 'Justiça', 'Fofoca', 'Notícia', 'Piada', 'História', 'Lenda', 'Poema', 'Enigma', 'Ilusão',
  'Surpresa', 'Susto', 'Nostalgia', 'Rotina', 'Pressa', 'Calma', 'Bagunça', 'Manhã', 'Noite',
  'Madrugada', 'Domingo', 'Segunda-feira', 'Natal', 'Carnaval', 'Páscoa', 'Réveillon', 'Olimpíadas',
  'Eleição', 'Vergonha', 'Orgulho', 'Paciência', 'Engarrafamento', 'Ronco', 'Fila',
];

const CORPO = [
  'Coração', 'Cérebro', 'Olho', 'Boca', 'Nariz', 'Orelha', 'Mão', 'Pé', 'Dente', 'Cabelo', 'Barba',
  'Bigode', 'Unha', 'Osso', 'Sangue', 'Pele', 'Língua', 'Umbigo', 'Joelho', 'Esqueleto', 'Sorriso',
  'Careca', 'Tatuagem', 'Sardas', 'Ruga', 'Cicatriz',
];

const MATERIAIS = [
  'Ouro', 'Prata', 'Diamante', 'Vidro', 'Papel', 'Madeira', 'Ferro', 'Plástico', 'Algodão', 'Seda',
  'Lã', 'Couro', 'Pérola', 'Mármore', 'Barro', 'Ferrugem', 'Vapor', 'Poeira', 'Lama', 'Espuma',
  'Bolha', 'Purpurina', 'Neon',
];

const LAZER = [
  'Futebol', 'Basquete', 'Vôlei', 'Tênis', 'Natação', 'Xadrez', 'Dominó', 'Karaokê', 'Pescaria',
  'Fogueira', 'Piquenique', 'Corrida', 'Maratona', 'Boxe', 'Judô', 'Capoeira', 'Samba', 'Forró', 'Balé',
  'Ioga', 'Videogame', 'Novela', 'Desenho', 'Quadrinhos', 'Fotografia', 'Tricô', 'Origami', 'Gol',
  'Pênalti', 'Torcida', 'Golfe', 'Esqui', 'Surfe', 'Mágica',
];

const TECNOLOGIA = [
  'Internet', 'Senha', 'Selfie', 'Emoji', 'Drone', 'Vírus', 'Código', 'Pixel', 'Podcast', 'Meme',
  'Aplicativo', 'Mensagem', 'Wi-Fi', 'Satélite',
];

export const WORDS: readonly string[] = Object.freeze([
  ...new Set(
    [
      ...NATUREZA,
      ...ANIMAIS,
      ...FANTASIA,
      ...COMIDA,
      ...OBJETOS,
      ...LUGARES,
      ...PESSOAS,
      ...IDEIAS,
      ...CORPO,
      ...MATERIAIS,
      ...LAZER,
      ...TECNOLOGIA,
    ].map((w) => w.trim()),
  ),
]);
