import { produtoStorage } from '@/services/storageService';
import { Produto } from '@/data/produtos_locais';

import { EstoqueReservado } from '@/types/estoque';

const STORAGE_KEY = 'estoque_reservado';
const TIMEOUT_RESERVA = 30 * 60 * 1000;

// Obter estoque reservado
const getEstoqueReservado = (): EstoqueReservado[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

// Salvar estoque reservado
const salvarEstoqueReservado = (estoqueReservado: EstoqueReservado[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(estoqueReservado));
};

// Limpar reservas expiradas
const limparReservasExpiradas = (): void => {
  const estoqueReservado = getEstoqueReservado();
  const agora = Date.now();
  
  const estoqueAtualizado = estoqueReservado.map(item => ({
    ...item,
    reservas: item.reservas.filter(reserva => 
      reserva.tipo === 'mesa' || reserva.venda_confirmada || (agora - reserva.timestamp) < TIMEOUT_RESERVA
    ),
  })).filter(item => item.reservas.length > 0);

  estoqueAtualizado.forEach(item => {
    item.quantidade_reservada = item.reservas.reduce((total, reserva) => 
      total + reserva.quantidade, 0
    );
  });

  salvarEstoqueReservado(estoqueAtualizado);
};

// Reservar estoque
export const reservarEstoque = (produto_id: number, quantidade: number, tipo: 'mesa' | 'carrinho', mesa_id?: number): boolean => {
  limparReservasExpiradas();
  
  const produtos = produtoStorage.getAll();
  const produto = produtos.find(p => p.id === produto_id);
  if (!produto) return false;

  const estoqueReservado = getEstoqueReservado();
  const itemReservado = estoqueReservado.find(item => item.produto_id === produto_id);
  const quantidadeReservada = itemReservado?.quantidade_reservada || 0;
  const estoqueDisponivel = produto.estoque - quantidadeReservada;

  if (estoqueDisponivel < quantidade) {
    console.warn(`Estoque insuficiente para produto ${produto_id}. Disponível: ${estoqueDisponivel}, Solicitado: ${quantidade}`);
    return false;
  }

  const novaReserva = {
    id: Date.now(), // Usando timestamp como ID único
    quantidade,
    tipo,
    timestamp: Date.now(),
    mesa_id,
    venda_confirmada: false // Inicialmente, a venda não está confirmada
  };

  if (itemReservado) {
    itemReservado.reservas.push(novaReserva);
    itemReservado.quantidade_reservada += quantidade;
  } else {
    estoqueReservado.push({
      produto_id,
      quantidade_reservada: quantidade,
      reservas: [novaReserva]
    });
  }

  salvarEstoqueReservado(estoqueReservado);
  console.log(`✅ Estoque reservado: ${quantidade}x produto ${produto_id}`);
  return true;
};

// Liberar reserva de estoque
export const liberarReservaEstoque = (produto_id: number, quantidade: number, tipo: 'mesa' | 'carrinho', mesa_id?: number): void => {
  const estoqueReservado = getEstoqueReservado();
  const itemIndex = estoqueReservado.findIndex(item => item.produto_id === produto_id);
  
  if (itemIndex === -1) return;

  const item = estoqueReservado[itemIndex];
  let quantidadeALiberar = quantidade;

  item.reservas = item.reservas.filter(reserva => {
    if (quantidadeALiberar <= 0) return true;
    
    const match = reserva.tipo === tipo && (!mesa_id || reserva.mesa_id === mesa_id);
    if (match && reserva.quantidade <= quantidadeALiberar) {
      quantidadeALiberar -= reserva.quantidade;
      return false; // Remove esta reserva
    }
    return true;
  });

  item.quantidade_reservada = item.reservas.reduce((total, reserva) => 
    total + reserva.quantidade, 0
  );

  if (item.quantidade_reservada === 0) {
    estoqueReservado.splice(itemIndex, 1);
  }

  salvarEstoqueReservado(estoqueReservado);
  console.log(`✅ Reserva liberada: ${quantidade}x produto ${produto_id}`);
};

// Confirmar consumo de estoque (converte reserva em consumo real)
export const confirmarConsumoEstoque = (produto_id: number, quantidade: number, mesa_id?: number): void => {
  const produtos = produtoStorage.getAll();
  const produto = produtos.find(p => p.id === produto_id);
  if (!produto) return;

  // Marcar reserva como venda confirmada
  const estoqueReservado = getEstoqueReservado();
  const item = estoqueReservado.find(item => item.produto_id === produto_id);
  if (item) {
    item.reservas.forEach(reserva => {
      if (reserva.mesa_id === mesa_id) {
        reserva.venda_confirmada = true;
      }
    });
    salvarEstoqueReservado(estoqueReservado);
  }

  // Decrementa estoque real
  const novoEstoque = Math.max(0, produto.estoque - quantidade);
  produtoStorage.update(produto_id, {
    ...produto,
    estoque: novoEstoque
  });

  // Libera a reserva correspondente
  liberarReservaEstoque(produto_id, quantidade, 'mesa', mesa_id);
  
  console.log(`✅ Estoque consumido: ${quantidade}x ${produto.nome} (${produto.estoque} → ${novoEstoque})`);
};

// Obter estoque disponível (real - reservado)
export const getEstoqueDisponivel = (produto_id: number): number => {
  limparReservasExpiradas();
  
  const produtos = produtoStorage.getAll();
  const produto = produtos.find(p => p.id === produto_id);
  if (!produto) return 0;

  const estoqueReservado = getEstoqueReservado();
  const itemReservado = estoqueReservado.find(item => item.produto_id === produto_id);
  const quantidadeReservada = itemReservado?.quantidade_reservada || 0;

  return Math.max(0, produto.estoque - quantidadeReservada);
};

// Cancelar reservas de mesa (sem venda confirmada)
export const cancelarReservasMesa = (mesa_id: number): void => {
  const estoqueReservado = getEstoqueReservado();
  
  // Apenas libera reservas - NÃO registra cancelamento para pedidos não confirmados
  estoqueReservado.forEach(item => {
    const reservasDaMesa = item.reservas.filter(reserva => 
      reserva.mesa_id === mesa_id && !reserva.venda_confirmada
    );
    
    if (reservasDaMesa.length > 0) {
      const quantidadeLiberada = reservasDaMesa.reduce((total, reserva) => total + reserva.quantidade, 0);
      console.log(`🛒 Pedido de mesa ${mesa_id} cancelado: ${quantidadeLiberada}x produto ${item.produto_id} - reserva liberada`);
    }
  });
  
  estoqueReservado.forEach(item => {
    item.reservas = item.reservas.filter(reserva => 
      reserva.mesa_id !== mesa_id || reserva.venda_confirmada
    );
    item.quantidade_reservada = item.reservas.reduce((total, reserva) => 
      total + reserva.quantidade, 0
    );
  });

  const estoqueAtualizado = estoqueReservado.filter(item => item.quantidade_reservada > 0);
  salvarEstoqueReservado(estoqueAtualizado);
  
  console.log(`✅ Reservas da mesa ${mesa_id} canceladas (sem registro de cancelamento)`);
};

// Cancelar venda já confirmada (registra cancelamento e restaura estoque)
export const cancelarVendaConfirmada = (produto_id: number, quantidade: number, origem: 'mesa' | 'online', referencia?: string): void => {
  const origemCancelamento = origem === 'mesa' ? 'cancelamento_venda_fisica' : 'cancelamento_venda_online';
  
  console.log(`🚫 Cancelando venda confirmada: ${quantidade}x produto ${produto_id}`);
  
  // Importar registrarCancelamento dinamicamente para evitar imports circulares
  import('./movimentacaoEstoqueService').then(({ registrarCancelamento }) => {
    registrarCancelamento(produto_id, quantidade, origemCancelamento, referencia);
  });
};
