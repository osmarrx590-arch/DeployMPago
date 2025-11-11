
export interface Avaliacao {
  produto_id: number;
  rating: number;
  comentario?: string;
  dataAvaliacao?: string;
}

export interface AvaliacoesContextType {
  avaliacoes: Avaliacao[];
  avaliarProduto: (produto_id: number, rating: number, comentario?: string) => void;
  getAvaliacao: (produto_id: number) => number;
  getComentario: (produto_id: number) => string;
  getAvaliacaoCompleta: (produto_id: number) => Avaliacao | undefined;
}
