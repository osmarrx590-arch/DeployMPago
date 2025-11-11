
//src\api\mesas\itemService.ts

import { ItemMesa } from '@/types/mesa';
import { decrementarEstoque } from './produtoService';
import apiServices from '@/services/apiServices';
import { getNextPedidoNumber } from '@/services/mesaService';

// Adiciona item à mesa via backend API
export const adicionarItemMesa = async (mesa_id: number, item: ItemMesa, usuario_id?: number): Promise<Record<string, unknown>> => {
  console.log('[itemService] adicionando item à mesa via API', { mesa_id, item, usuario_id });
  try {
    // Primeiro decrementar o estoque. Se falhar, não adicionamos o item à mesa
    await decrementarEstoque(item.produto_id, item.quantidade);

    // Chamar endpoint /mesas/{mesa_id}/itens para adicionar o item na mesa
    // Quando estamos online, delegar a geração do número ao backend (servidor retorna número sequencial).
    // Apenas quando estivermos offline enviamos um número sugerido localmente para melhor UX.
    const isOnline = (typeof navigator !== 'undefined') ? Boolean(navigator.onLine) : true;
    const bodyObj: Record<string, unknown> = {
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      nome: item.nome,
      // enviar o preço de venda como 'venda' (frontend usa 'venda' agora)
      venda: item.venda,
      usuario_id: usuario_id
    };
    if (!isOnline) {
      // gerar numero localmente apenas em fallback offline
      try {
        bodyObj.numero = getNextPedidoNumber();
      } catch (e) {
        // se falhar ao gerar numero local, não impedir a operação offline — simplesmente não enviar
        console.warn('[itemService] falha ao gerar numero sugerido localmente, continuando sem numero', e);
      }
    }

    // Chamar API para adicionar o item na mesa com a rota mesas/{mesa_id}/itens
    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000'}/mesas/${mesa_id}/itens`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyObj)
    });

  if (!res.ok) {
      // tentar restaurar o estoque se a API de adicionar item falhar
      try {
        await fetch(`${import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000'}/estoque/movimentacoes`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ produto_id: item.produto_id, produtoNome: item.nome || '', quantidade: item.quantidade, tipo: 'entrada', origem: 'cancelamento_venda_fisica', data: new Date().toISOString().split('T')[0], observacoes: 'Rollback: falha ao adicionar item à mesa' })
        });
      } catch (rbErr) {
        console.error('[itemService] rollback falhou ao restaurar estoque:', rbErr);
      }

      throw new Error('Erro ao adicionar item na mesa (servidor)');
    }

    // Ler e retornar o body do servidor se houver (p.ex. mesa atualizada com número)
    try {
      const data = await res.json();
      // Se o backend retornou o número do pedido (campo 'pedido'), sincronizar o contador local
      try {
        const responseBody = data as unknown;
        let servidorPedidoRaw: unknown = undefined;
        if (responseBody && typeof responseBody === 'object') {
          const rb = responseBody as Record<string, unknown>;
          servidorPedidoRaw = rb['pedido'];
        }
        const servidorPedido = typeof servidorPedidoRaw === 'number' ? servidorPedidoRaw : parseInt(String(servidorPedidoRaw ?? ''), 10);
        if (!isNaN(servidorPedido)) {
          const key = 'highestPedido';
          const atualRaw = localStorage.getItem(key);
          const atual = atualRaw ? parseInt(atualRaw, 10) : 0;
          if (isNaN(atual) || servidorPedido > atual) {
            try {
              localStorage.setItem(key, String(servidorPedido));
              console.log('[itemService] sincronizou highestPedido com servidor:', servidorPedido);
            } catch (e) {
              // ignore problema ao gravar no localStorage
            }
          }
        }
      } catch (e) {
        // não bloquear fluxo caso parsing falhe
      }
      return data;
    } catch (parseErr) {
      return {};
    }
  } catch (error) {
    console.warn('[itemService] Backend indisponível, usando fallback local:', error);
    
    // FALLBACK: Usar localStorage quando backend está offline
    try {
      // Importar função local de adicionar item à mesa
      const { adicionarItemMesa: adicionarItemMesaLocal } = await import('@/services/mesaService');
      
      // Gerar número de pedido local se necessário
      const numeroPedido = getNextPedidoNumber();
      
      // Adicionar item usando serviço local
      adicionarItemMesaLocal(mesa_id, item, usuario_id, numeroPedido);
      
      console.log('✅ Item adicionado à mesa localmente (modo offline)');
      
      return {
        success: true,
        offline: true,
        pedido: numeroPedido,
        message: 'Item adicionado localmente. Será sincronizado quando o backend voltar.'
      };
    } catch (localError) {
      console.error('[itemService] Fallback local também falhou:', localError);
      throw new Error('Não foi possível adicionar item à mesa (backend e fallback local falharam)');
    }
  }
};

export const removerItemMesa = async (mesa_id: number, itemId: number): Promise<void> => {
  try {
    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000'}/mesas/${mesa_id}/itens/${itemId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!res.ok) {
      throw new Error('Erro ao remover item no servidor');
    }
  } catch (error) {
    console.warn('[itemService] Backend indisponível, usando fallback local para remover item:', error);
    
    // FALLBACK: Usar localStorage quando backend está offline
    try {
      const { removerItemMesa: removerItemMesaLocal } = await import('@/services/mesaService');
      removerItemMesaLocal(mesa_id, itemId);
      console.log('✅ Item removido da mesa localmente (modo offline)');
    } catch (localError) {
      console.error('[itemService] Fallback local também falhou:', localError);
      throw new Error('Não foi possível remover item da mesa (backend e fallback local falharam)');
    }
  }
};


