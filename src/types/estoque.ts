// Movimentação de estoque
export interface MovimentacaoEstoque {
  id: number;
  produto_id: number;
  produtoNome: string;
  tipo: 'entrada' | 'saida';
  quantidade: number;
  origem: 'produto_cadastro' | 'venda_online' | 'venda_fisica' | 'cancelamento_venda_online' | 'cancelamento_venda_fisica';
  data: string;
  observacoes?: string;
  referencia?: string;
}

// Reserva de estoque
export interface EstoqueReserva {
  id: number;
  produto_id: number;
  quantidade: number;
  tipo: 'carrinho' | 'mesa';
  timestamp: number;
  mesa_id?: number;
}

// Estoque Reservado (for services)
export interface EstoqueReservado {
  produto_id: number;
  quantidade_reservada: number;
  reservas: Array<{
    id: number;
    quantidade: number;
    tipo: 'mesa' | 'carrinho';
    timestamp: number;
    mesa_id?: number;
    venda_confirmada?: boolean;
  }>;
}