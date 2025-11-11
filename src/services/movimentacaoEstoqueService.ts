
import { produtoStorage } from '@/services/storageService';
import { estoqueStorage } from './storageService';
import { estoqueLocal } from '@/data/estoque_local';
import { estoqueService } from '@/services/apiServices';

// Re-export the type for backwards compatibility
export type { MovimentacaoEstoque } from '@/types/estoque';
import type { MovimentacaoEstoque } from '@/types/estoque';

// Obter todas as movimentações
export const obterMovimentacoes = (): MovimentacaoEstoque[] => {
  const movimentacoes = estoqueStorage.getMovimentacoes();
  
  // Se não há movimentações salvas, usar dados locais mock
  if (movimentacoes.length === 0) {
    estoqueStorage.saveMovimentacoes(estoqueLocal);
    return estoqueLocal;
  }
  
  return movimentacoes;
};

// Tenta obter movimentações do backend e atualizar o storage local (se disponível)
export const fetchMovimentacoesFromBackend = async (): Promise<MovimentacaoEstoque[]> => {
  try {
    const remote = await estoqueService.getMovimentacoes();
    if (Array.isArray(remote) && remote.length > 0) {
      estoqueStorage.saveMovimentacoes(remote as MovimentacaoEstoque[]);
      return remote as MovimentacaoEstoque[];
    }
  } catch (err) {
    // falha ao conectar com backend — fallback para local
    console.debug('Não foi possível obter movimentações do backend:', err);
  }
  return obterMovimentacoes();
};

// Salvar movimentações
const salvarMovimentacoes = (movimentacoes: MovimentacaoEstoque[]): void => {
  estoqueStorage.saveMovimentacoes(movimentacoes);
};

// Gerar ID único para movimentação
const gerarIdMovimentacao = (): number => {
  return Date.now() + Math.random();
};

// Registrar movimentação de estoque
export const registrarMovimentacao = (dados: Omit<MovimentacaoEstoque, 'id' | 'data' | 'produtoNome'>): MovimentacaoEstoque => {
  const produtos = produtoStorage.getAll();
  const produto = produtos.find(p => p.id === dados.produto_id);
  
  if (!produto) {
    throw new Error(`Produto ${dados.produto_id} não encontrado`);
  }

  const movimentacao: MovimentacaoEstoque = {
    id: gerarIdMovimentacao(),
    produtoNome: produto.nome,
    data: new Date().toISOString(),
    ...dados
  };

  estoqueStorage.addMovimentacao(movimentacao);

  // Tenta sincronizar com o backend (fire-and-forget). Se falhar, mantemos o registro local.
  try {
    // api aceita Omit<MovimentacaoEstoque, 'id'>
    estoqueService.addMovimentacao({
      produto_id: movimentacao.produto_id,
      tipo: movimentacao.tipo,
      quantidade: movimentacao.quantidade,
      origem: movimentacao.origem,
      observacoes: movimentacao.observacoes,
      referencia: movimentacao.referencia,
      data: movimentacao.data,
      produtoNome: movimentacao.produtoNome
    }).catch((e) => console.error('Erro ao sincronizar movimentação com backend:', e));
  } catch (e) {
    console.debug('Sync backend não disponível:', e);
  }

  console.log(`📝 Movimentação registrada (local): ${movimentacao.tipo} - ${movimentacao.quantidade}x ${produto.nome}`);
  return movimentacao;
};

// Registrar entrada de estoque
export const registrarEntrada = (produto_id: number, quantidade: number, origem: MovimentacaoEstoque['origem'], observacoes?: string, referencia?: string): void => {
  registrarMovimentacao({
    produto_id,
    tipo: 'entrada',
    quantidade,
    origem,
    observacoes,
    referencia
  });

  // Aumentar estoque do produto
  const produtos = produtoStorage.getAll();
  const produto = produtos.find(p => p.id === produto_id);
  if (produto) {
    const index = produtos.findIndex(p => p.id === produto_id);
    if (index !== -1) {
      produtos[index].estoque += quantidade;
      produtoStorage.save(produtos);
    }
    console.log(`↗️ Estoque aumentado: +${quantidade}x ${produto.nome} (Total: ${produto.estoque + quantidade})`);
  }
};

// Registrar saída de estoque
export const registrarSaida = (produto_id: number, quantidade: number, origem: MovimentacaoEstoque['origem'], referencia?: string, observacoes?: string): void => {
  registrarMovimentacao({
    produto_id,
    tipo: 'saida',
    quantidade,
    origem,
    observacoes,
    referencia
  });

  // Reduzir estoque do produto
  const produtos = produtoStorage.getAll();
  const produto = produtos.find(p => p.id === produto_id);
  if (produto) {
    const novoEstoque = Math.max(0, produto.estoque - quantidade);
    const index = produtos.findIndex(p => p.id === produto_id);
    if (index !== -1) {
      produtos[index].estoque = novoEstoque;
      produtoStorage.save(produtos);
    }
    console.log(`↘️ Estoque reduzido: -${quantidade}x ${produto.nome} (Total: ${novoEstoque})`);
  }
};

// Registrar entrada por cancelamento (restaurar estoque)
export const registrarCancelamento = (produto_id: number, quantidade: number, origem: 'cancelamento_venda_online' | 'cancelamento_venda_fisica', referencia?: string): void => {
  registrarEntrada(
    produto_id, 
    quantidade, 
    origem, 
    `Cancelamento - Estoque restaurado`, 
    referencia
  );
};

// Obter movimentações por produto
export const obterMovimentacoesPorProduto = (produto_id: number): MovimentacaoEstoque[] => {
  return obterMovimentacoes().filter(m => m.produto_id === produto_id);
};

// Limpar movimentações antigas (para manutenção)
export const limparMovimentacoesAntigas = (diasAtras: number = 90): void => {
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() - diasAtras);
  
  const movimentacoes = obterMovimentacoes();
  const movimentacoesFiltradas = movimentacoes.filter(m => 
    new Date(m.data) >= dataLimite
  );
  
  salvarMovimentacoes(movimentacoesFiltradas);
  console.log(`🧹 Movimentações antigas removidas (${movimentacoes.length - movimentacoesFiltradas.length} registros)`);
};
