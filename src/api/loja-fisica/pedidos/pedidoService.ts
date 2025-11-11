import * as mesaService from '@/services/mesaService';

export const cancelarPedido = async (mesa_id: number): Promise<void> => {
  // Endpoint pediido/{mesa_id}/cancelar pode não estar disponível em todas as versões do backend.
  // Se falhar, usar fallback local.
  try {
    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000'}/pedidos/${mesa_id}/cancelar`, {
      method: 'POST',
      credentials: 'include'
    });

    if (!res.ok) {
      throw new Error('API retornou erro');
    }

    return;
  } catch (error) {
    console.warn('[pedidoService] API de cancelar pedido indisponível, usando fallback local', error);
    try {
      mesaService.cancelarPedido(mesa_id);
      return;
    } catch (inner) {
      console.error('[pedidoService] fallback local falhou ao cancelar pedido:', inner);
      throw inner;
    }
  }
};

