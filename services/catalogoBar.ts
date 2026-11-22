import { BarUnidade } from '../types';

export interface ItemCatalogo {
  nome: string;
  categoria: string;
  unidade: BarUnidade;
  /** Preço sugerido: a casa ajusta antes de cadastrar. */
  preco: number;
}

/**
 * Cardápio comum de bar de clube de poker, para a casa não começar do zero.
 * Nada é cadastrado sem a casa escolher e conferir os preços.
 */
export const CATALOGO_PADRAO: ItemCatalogo[] = [
  // Cervejas
  { nome: 'Brahma Lata 350ml', categoria: 'Cervejas', unidade: 'lata', preco: 6 },
  { nome: 'Skol Lata 350ml', categoria: 'Cervejas', unidade: 'lata', preco: 6 },
  { nome: 'Amstel Lata 350ml', categoria: 'Cervejas', unidade: 'lata', preco: 7 },
  { nome: 'Heineken Lata 350ml', categoria: 'Cervejas', unidade: 'lata', preco: 8 },
  { nome: 'Budweiser Long Neck', categoria: 'Cervejas', unidade: 'long neck', preco: 10 },
  { nome: 'Heineken Long Neck', categoria: 'Cervejas', unidade: 'long neck', preco: 11 },
  { nome: 'Stella Artois Long Neck', categoria: 'Cervejas', unidade: 'long neck', preco: 11 },
  { nome: 'Corona Long Neck', categoria: 'Cervejas', unidade: 'long neck', preco: 12 },
  { nome: 'Heineken Zero Long Neck', categoria: 'Cervejas', unidade: 'long neck', preco: 11 },
  { nome: 'Original 600ml', categoria: 'Cervejas', unidade: 'garrafa', preco: 15 },
  { nome: 'Heineken 600ml', categoria: 'Cervejas', unidade: 'garrafa', preco: 18 },

  // Refrigerantes
  { nome: 'Coca-Cola 310ml', categoria: 'Refrigerantes', unidade: 'lata', preco: 6.99 },
  { nome: 'Coca-Cola Lata 350ml', categoria: 'Refrigerantes', unidade: 'lata', preco: 6 },
  { nome: 'Coca-Cola Zero Lata 350ml', categoria: 'Refrigerantes', unidade: 'lata', preco: 6 },
  { nome: 'Guaraná Antarctica Lata 350ml', categoria: 'Refrigerantes', unidade: 'lata', preco: 6 },
  { nome: 'Guaraná Antarctica Zero Lata 350ml', categoria: 'Refrigerantes', unidade: 'lata', preco: 6 },
  { nome: 'Fanta Laranja Lata 350ml', categoria: 'Refrigerantes', unidade: 'lata', preco: 6 },
  { nome: 'Sprite Lata 350ml', categoria: 'Refrigerantes', unidade: 'lata', preco: 6 },
  { nome: 'Schweppes Citrus Lata 350ml', categoria: 'Refrigerantes', unidade: 'lata', preco: 6 },
  { nome: 'Coca-Cola 2L', categoria: 'Refrigerantes', unidade: 'garrafa', preco: 15 },

  // Águas e sucos
  { nome: 'Água sem Gás 500ml', categoria: 'Águas e sucos', unidade: 'garrafa', preco: 4 },
  { nome: 'Água com Gás 500ml', categoria: 'Águas e sucos', unidade: 'garrafa', preco: 5 },
  { nome: 'H2OH! Limão 500ml', categoria: 'Águas e sucos', unidade: 'garrafa', preco: 7 },
  { nome: 'Suco Del Valle Lata 290ml', categoria: 'Águas e sucos', unidade: 'lata', preco: 7 },
  { nome: 'Água de Coco 300ml', categoria: 'Águas e sucos', unidade: 'un', preco: 7 },

  // Energéticos
  { nome: 'Red Bull 250ml', categoria: 'Energéticos', unidade: 'lata', preco: 15 },
  { nome: 'Red Bull Sugar Free 250ml', categoria: 'Energéticos', unidade: 'lata', preco: 15 },
  { nome: 'Monster Energy 473ml', categoria: 'Energéticos', unidade: 'lata', preco: 14 },
  { nome: 'Monster Mango Loco 473ml', categoria: 'Energéticos', unidade: 'lata', preco: 14 },
  { nome: 'TNT Energy 473ml', categoria: 'Energéticos', unidade: 'lata', preco: 10 },

  // Espetos
  { nome: 'Espeto Bovino', categoria: 'Espetos', unidade: 'un', preco: 8 },
  { nome: 'Espeto de Picanha', categoria: 'Espetos', unidade: 'un', preco: 14 },
  { nome: 'Espeto de Cupim', categoria: 'Espetos', unidade: 'un', preco: 10 },
  { nome: 'Espeto de Kafta', categoria: 'Espetos', unidade: 'un', preco: 9 },
  { nome: 'Espeto de Frango', categoria: 'Espetos', unidade: 'un', preco: 8 },
  { nome: 'Espeto Medalhão de Frango', categoria: 'Espetos', unidade: 'un', preco: 8 },
  { nome: 'Espeto de Tulipa', categoria: 'Espetos', unidade: 'un', preco: 8 },
  { nome: 'Espeto de Coração', categoria: 'Espetos', unidade: 'un', preco: 8 },
  { nome: 'Espeto de Linguiça Toscana', categoria: 'Espetos', unidade: 'un', preco: 8 },
  { nome: 'Espeto de Panceta', categoria: 'Espetos', unidade: 'un', preco: 10 },
  { nome: 'Espeto de Lombo', categoria: 'Espetos', unidade: 'un', preco: 8 },
  { nome: 'Espeto Misto', categoria: 'Espetos', unidade: 'un', preco: 9 },
  { nome: 'Espeto de Queijo Coalho', categoria: 'Espetos', unidade: 'un', preco: 9 },
  { nome: 'Espeto de Pão de Alho', categoria: 'Espetos', unidade: 'un', preco: 7 },

  // Porções
  { nome: 'Porção de Batata Frita', categoria: 'Porções', unidade: 'porção', preco: 25 },
  { nome: 'Porção de Calabresa Acebolada', categoria: 'Porções', unidade: 'porção', preco: 30 },
  { nome: 'Porção de Mandioca Frita', categoria: 'Porções', unidade: 'porção', preco: 25 },
  { nome: 'Porção de Amendoim', categoria: 'Porções', unidade: 'porção', preco: 10 },

  // Doses e drinks
  { nome: 'Dose de Cachaça', categoria: 'Doses', unidade: 'dose', preco: 6 },
  { nome: 'Dose de Vodka', categoria: 'Doses', unidade: 'dose', preco: 12 },
  { nome: 'Dose de Whisky Red Label', categoria: 'Doses', unidade: 'dose', preco: 18 },
  { nome: 'Dose de Whisky Black Label', categoria: 'Doses', unidade: 'dose', preco: 28 },
  { nome: 'Caipirinha de Limão', categoria: 'Drinks', unidade: 'copo', preco: 18 },
  { nome: 'Caipiroska de Limão', categoria: 'Drinks', unidade: 'copo', preco: 22 },
  { nome: 'Gin Tônica', categoria: 'Drinks', unidade: 'copo', preco: 25 },

  // Doces
  { nome: 'Chocolate KitKat', categoria: 'Doces', unidade: 'un', preco: 6 },
  { nome: 'Chocolate Snickers', categoria: 'Doces', unidade: 'un', preco: 7 },
  { nome: 'Chocolate Bis', categoria: 'Doces', unidade: 'un', preco: 6 },
  { nome: 'Trento', categoria: 'Doces', unidade: 'un', preco: 4 },
  { nome: 'Bombom Sonho de Valsa', categoria: 'Doces', unidade: 'un', preco: 2.5 },
  { nome: 'Bombom Ouro Branco', categoria: 'Doces', unidade: 'un', preco: 2.5 },
  { nome: 'Paçoca', categoria: 'Doces', unidade: 'un', preco: 2 },
  { nome: 'Bala Halls', categoria: 'Doces', unidade: 'un', preco: 3 },
  { nome: 'Chiclete Trident', categoria: 'Doces', unidade: 'un', preco: 4 },
];
