
import { Produto } from './produto';

export interface FavoritosContextType {
  favoritos: Produto[];
  toggleFavorito: (produto: Produto) => void;
  isFavorito: (produto_id: number) => boolean;
  removerFavorito: (produto_id: number) => void;
  adicionarFavorito: (produto: Produto) => void;
}
