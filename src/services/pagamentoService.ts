
import { salvarPedidoNoHistorico } from './pedidoHistoricoService';
import * as mesaService from '@/services/mesaService';
import { ItemMesa } from '@/types/mesa';
import { confirmarConsumoEstoque } from './estoqueReservaService';
import { registrarSaida } from './movimentacaoEstoqueService';

import { DadosPagamento } from '@/types/pedido';
import { apiFetch } from './apiServices';

export const processarPagamento = async (dados: DadosPagamento): Promise<void> => {
  try {
    console.log('💳 Iniciando processamento de pagamento físico:', {
      mesa: dados.mesaNome,
      pedido: dados.pedidoNumero,
      total: dados.total,
      itens: dados.itens.length
    });

    // Confirmar consumo de estoque para todos os itens
    dados.itens.forEach(item => {
      confirmarConsumoEstoque(item.produto_id, item.quantidade, dados.mesa_id);
      registrarSaida(
        item.produto_id, 
        item.quantidade, 
        'venda_fisica', 
        `mesa-${dados.mesa_id}-pedido-${dados.pedidoNumero}`
      );
    });

    console.log('✅ Estoque consumido para venda física');

    // Tentar chamar backend para processar pagamento centralizado
    try {
      const mesaAtualizada = await apiFetch(`/mesas/${dados.mesa_id}/pagamento`, {
        method: 'POST',
        body: ({
          metodo: dados.metodoPagamento,
          itens: dados.itens,
          total: dados.total,
          numero: dados.pedidoNumero,
        } as unknown) as BodyInit,
      });

      console.log('✅ Pagamento processado via backend, mesa atualizada:', mesaAtualizada);
      // Atualizar o estado local da mesa para refletir o que veio do backend
      try {
        const mesa = (mesaAtualizada && mesaAtualizada.mesa) ? mesaAtualizada.mesa : null;
        if (mesa) {
          // mapear nome do campo usuario_responsavel_id -> usuario_id usado localmente
          const usuario_id = (mesa.usuario_responsavel_id !== undefined) ? mesa.usuario_responsavel_id : mesa.usuario_id;
          // Atualizar localmente
          mesaService.atualizarMesa(mesa.id, {
            status: mesa.status,
            pedido: mesa.pedido ?? 0,
            itens: Array.isArray(mesa.itens) ? mesa.itens : [],
            usuario_id: usuario_id,
            statusPedido: undefined,
          });
        }
      } catch (e) {
        console.warn('Falha ao sincronizar mesa localmente após pagamento backend', e);
      }
      return;
    } catch (err) {
      console.warn('Backend indisponível para processar pagamento, usando fluxo local', err);

      // Salva o pedido no histórico (local)
      const pedidoHistorico = salvarPedidoNoHistorico({
        metodoPagamento: dados.metodoPagamento,
        itens: dados.itens.map(item => ({
          ...item,
          venda: item.venda
        })),
        subtotal: dados.subtotal,
        desconto: dados.desconto,
        total: dados.total,
        nome: dados.mesaNome
      });

      // Libera a mesa (volta ao status 'Livre') localmente
      mesaService.atualizarMesa(dados.mesa_id, {
        status: 'Livre',
        pedido: 0,
        itens: [],
        usuario_id: undefined,
        statusPedido: undefined
      });

      console.log('✅ Pagamento processado localmente (fallback):', {
        pedido_id: pedidoHistorico.id,
        mesa_id: dados.mesa_id,
        total: dados.total,
        estoque_atualizado: true
      });
      return;
    }

  } catch (error) {
    console.error('❌ Erro ao processar pagamento:', error);
    throw error;
  }
};
