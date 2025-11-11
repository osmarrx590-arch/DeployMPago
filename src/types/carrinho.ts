
import { Produto, ItemCarrinho } from './produto';

export interface CarrinhoContextData {
  carrinho: ItemCarrinho[];
  adicionarAoCarrinho: (produto: Produto) => Promise<boolean>;
  removerDoCarrinho: (produto_id: number) => Promise<boolean>;
  atualizarQuantidade: (produto_id: number, quantidade: number) => Promise<boolean>;
  limparCarrinho: () => Promise<boolean>;
  totalCarrinho: number;
  subtotalCarrinho: number;
  quantidadeItens: number;
  descontoCupom: number;
  cupom: { nome: string; desconto: number } | null;
  aplicarCupom: (codigo: string) => void;
  removerCupom: () => void;
  getEstoqueDisponivel: (produto_id: number) => number;
}
