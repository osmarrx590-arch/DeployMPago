import { Produto } from '@/types/produto';
import { Mesa } from '@/types/mesa';
import { Empresa } from '@/types/empresa';
import { PedidoLocal } from '@/types/pedido';
import { MovimentacaoEstoque } from '@/types/estoque';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000';

// Helper para fazer requisições autenticadas
const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  // Normalizar body (conversão camelCase -> snake_case) quando for objeto
  const prepareBody = (body: unknown) => {
    // se já for string, enviar como está
    if (typeof body === 'string') return body;

    const toSnake = (s: string) => s.replace(/([A-Z])/g, '_$1').toLowerCase();

    const keysToSnake = (obj: unknown): unknown => {
      if (obj === null || obj === undefined) return obj;
      if (Array.isArray(obj)) return obj.map(keysToSnake) as unknown;
      if (typeof obj === 'object') {
        return Object.entries(obj as Record<string, unknown>).reduce((acc: Record<string, unknown>, [k, v]) => {
          const key = toSnake(k);
          // converter Date para ISO
          if (v instanceof Date) acc[key] = v.toISOString();
          else if (v && typeof v === 'object') acc[key] = keysToSnake(v);
          else acc[key] = v;
          return acc;
        }, {} as Record<string, unknown>);
      }
      return obj;
    };

    return JSON.stringify(keysToSnake(body));
  };

  const bodyToSend = (options.body !== undefined && options.body !== null) ? prepareBody((options as RequestInit & { body?: unknown }).body) : undefined;

  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: bodyToSend,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || 'Erro na requisição');
  }

  return response.json();
};

// Payload type for backend-shaped requests (avoids explicit `any`)
type BackendProdutoPayload = Record<string, unknown>;

// === PRODUTOS ===
// Serviço para gerenciar produtos
// === CARRINHO ===
// Tipos de resposta do backend para carrinho
export type BackendCartItem = {
  id?: number;
  produto_id?: number;
  nome?: string;
  quantidade?: number;
  preco_unitario?: number;
  venda?: number;
  subtotal?: number;
};

export type BackendCart = {
  id: number | null;
  itens: BackendCartItem[];
  total: number;
};

export const cartService = {
  async getCart(): Promise<BackendCart> {
    return apiFetch('/carrinho/');
  },

  async addItem(payload: { produto_id?: number; quantidade?: number; venda?: number; precoUnitario?: number; user_id?: number }) {
    return apiFetch('/carrinho/items', {
      method: 'POST',
      body: payload as unknown as BodyInit,
    });
  },

  async updateItem(item_id: number, payload: { quantidade: number }) {
    return apiFetch(`/carrinho/items/${item_id}`, {
      method: 'PATCH',
      body: payload as unknown as BodyInit,
    });
  },

  async removeItem(item_id: number) {
    return apiFetch(`/carrinho/items/${item_id}`, {
      method: 'DELETE',
    });
  },

  async clearCart(payload: { cart_id?: number; user_id?: number } = {}) {
    return apiFetch('/carrinho/clear', {
      method: 'POST',
      body: payload as unknown as BodyInit,
    });
  },
};

//
export const produtoService = {
  async getAll(): Promise<Produto[]> {
    return apiFetch('/produtos');
  },

  // Recupera um produto pelo ID
  async create(produto: BackendProdutoPayload): Promise<Produto> {
    return apiFetch('/produtos', {
      method: 'POST',
      body: produto as unknown as BodyInit,
    });
  },

  // Atualiza um produto existente
  async update(id: number, produto: BackendProdutoPayload): Promise<void> {
    await apiFetch(`/produtos/${id}`, {
      method: 'PUT',
      body: produto as unknown as BodyInit,
    });
  },

  // Deleta um produto pelo ID
  async delete(id: number): Promise<void> {
    await apiFetch(`/produtos/${id}`, {
      method: 'DELETE',
    });
  },
};

// === MESAS ===
export const mesaService = {
  async getAll(): Promise<Mesa[]> {
    return apiFetch('/mesas'); // Busca todas as mesas do backend
  },

  // Recupera uma mesa pelo ID
  async getById(id: number): Promise<Mesa | null> {
    try {
      return await apiFetch(`/mesas/${id}`);
    } catch {
      return null;
    }
  },

  // Recupera uma mesa pelo slug
  async getBySlug(slug: string): Promise<Mesa | null> {
    try {
      return await apiFetch(`/mesas/slug/${encodeURIComponent(slug)}`);
    } catch {
      return null;
    }
  },

  // Cria uma nova mesa
  async create(mesa: Omit<Mesa, 'id'>): Promise<Mesa> {
    return apiFetch('/mesas', {
      method: 'POST',
      body: mesa as unknown as BodyInit,
    });
  },

  // Atualiza uma mesa existente
  async update(id: number, mesaData: Partial<Mesa>): Promise<void> {
    await apiFetch(`/mesas/${id}`, {
      method: 'PUT',
      body: mesaData as unknown as BodyInit,
    });
  },

  //
  async delete(id: number): Promise<void> {
    await apiFetch(`/mesas/${id}`, {
      method: 'DELETE',
    });
  },
};

// === EMPRESAS ===
export const empresaService = {
  async getAll(): Promise<Empresa[]> {
    return apiFetch('/empresas');
  },

  async create(empresa: Omit<Empresa, 'id'>): Promise<Empresa> {
    return apiFetch('/empresas', {
      method: 'POST',
      body: empresa as unknown as BodyInit,
    });
  },
};

// === PEDIDOS ===
export const pedidoService = {
  async getAll(): Promise<PedidoLocal[]> {
    return apiFetch('/pedidos');
  },

  async create(pedido: Omit<PedidoLocal, 'id'>): Promise<PedidoLocal> {
    return apiFetch('/pedidos', {
      method: 'POST',
      body: pedido as unknown as BodyInit,
    });
  },

  async updateStatus(id: number, status: PedidoLocal['status']): Promise<void> {
    await apiFetch(`/pedidos/${id}/status`, {
      method: 'PUT',
      body: { status } as unknown as BodyInit,
    });
  },
};

// === ESTOQUE ===
export const estoqueService = {
  async getMovimentacoes(): Promise<MovimentacaoEstoque[]> {
    return apiFetch('/estoque/movimentacoes');
  },

  async addMovimentacao(movimentacao: Omit<MovimentacaoEstoque, 'id'>): Promise<void> {
    await apiFetch('/estoque/movimentacoes', {
      method: 'POST',
      body: movimentacao as unknown as BodyInit,
    });
  },
};

export default {
  produtoService,
  mesaService,
  empresaService,
  pedidoService,
  estoqueService,
};
// === CHECKOUT / PAGAMENTOS ===
export const checkoutService = {
  async createSession(pedido_id: number, tipoPagamento = 'pix', retorno: Record<string, string> = {}) {
    return apiFetch('/checkout/create-session', {
      method: 'POST',
      body: { pedido_id: pedido_id, tipoPagamento, retorno } as unknown as BodyInit,
    });
  },
};

export { apiFetch };

