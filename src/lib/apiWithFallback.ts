// Utilitário para fazer requisições de API com fallback para localStorage
import { produtoStorage, favoritosStorage, avaliacoesStorage, carrinhoStorage } from '@/services/storageService';
import { Produto } from '@/types/produto';
import { Avaliacao } from '@/types/avaliacoes';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000';

type FetchOptions = RequestInit & {
  timeout?: number;
};

/**
 * Detecta se o backend está disponível
 */
export async function isBackendAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(`${BACKEND_URL}/health`, {
      signal: controller.signal,
    }).catch(() => null);
    
    clearTimeout(timeoutId);
    return response?.ok ?? false;
  } catch {
    return false;
  }
}

/**
 * Faz uma requisição com timeout e fallback automático
 */
export async function fetchWithFallback<T>(
  endpoint: string,
  options: FetchOptions = {},
  fallbackData?: T
): Promise<{ data: T | null; fromCache: boolean; error?: string }> {
  const { timeout = 10000, ...fetchOptions } = options;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      ...fetchOptions,
      credentials: 'include',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return { data, fromCache: false };
  } catch (error) {
    console.warn(`Backend request failed for ${endpoint}, using fallback:`, error);
    
    if (fallbackData !== undefined) {
      return { data: fallbackData, fromCache: true, error: String(error) };
    }
    
    return { data: null, fromCache: true, error: String(error) };
  }
}

/**
 * Serviços com fallback automático para localStorage
 */
export const offlineServices = {
  produtos: {
    async getAll(): Promise<Produto[]> {
      const { data, fromCache } = await fetchWithFallback<Produto[]>(
        '/produtos',
        {},
        produtoStorage.getAll()
      );
      
      if (fromCache) {
        console.log('📦 Usando produtos do localStorage');
      }
      
      return data ?? produtoStorage.getAll();
    },
  },
  
  favoritos: {
    async getAll(): Promise<Produto[]> {
      const { data, fromCache } = await fetchWithFallback<Produto[]>(
        '/favoritos/',
        {},
        favoritosStorage.getItens()
      );
      
      if (fromCache) {
        console.log('⭐ Usando favoritos do localStorage');
      }
      
      return data ?? favoritosStorage.getItens();
    },
    
    async toggle(produto: Produto): Promise<boolean> {
      const favoritos = favoritosStorage.getItens();
      const isFavorito = favoritos.some(p => p.id === produto.id);
      
      try {
        if (isFavorito) {
          await fetch(`${BACKEND_URL}/favoritos/${produto.id}`, {
            method: 'DELETE',
            credentials: 'include',
          });
        } else {
          await fetch(`${BACKEND_URL}/favoritos/`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ produto_id: produto.id }),
          });
        }
      } catch (error) {
        console.warn('Backend indisponível, salvando favorito localmente:', error);
      }
      
      // Sempre atualizar localStorage
      if (isFavorito) {
        const updated = favoritos.filter(p => p.id !== produto.id);
        favoritosStorage.saveItens(updated);
      } else {
        favoritosStorage.saveItens([...favoritos, produto]);
      }
      
      return !isFavorito;
    },
  },
  
  avaliacoes: {
    async getAll(): Promise<Avaliacao[]> {
      const { data, fromCache } = await fetchWithFallback<Avaliacao[]>(
        '/avaliacoes/',
        {},
        avaliacoesStorage.getItens()
      );
      
      if (fromCache) {
        console.log('⭐ Usando avaliações do localStorage');
      }
      
      return data ?? avaliacoesStorage.getItens();
    },
    
    async add(avaliacao: Avaliacao): Promise<void> {
      try {
        await fetch(`${BACKEND_URL}/avaliacoes/`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(avaliacao),
        });
      } catch (error) {
        console.warn('Backend indisponível, salvando avaliação localmente:', error);
      }
      
      // Sempre atualizar localStorage
      const avaliacoes = avaliacoesStorage.getItens();
      const index = avaliacoes.findIndex(a => a.produto_id === avaliacao.produto_id);
      
      if (index >= 0) {
        avaliacoes[index] = avaliacao;
      } else {
        avaliacoes.push(avaliacao);
      }
      
      avaliacoesStorage.saveItens(avaliacoes);
    },
  },
  
  carrinho: {
    async sync(): Promise<void> {
      const localItems = carrinhoStorage.getItens();
      
      try {
        // Tentar sincronizar com backend
        const response = await fetch(`${BACKEND_URL}/carrinho/`, {
          credentials: 'include',
        });
        
        if (response.ok) {
          const backendCart = await response.json();
          // Sincronizar apenas se houver divergências
          if (backendCart.itens?.length > 0) {
            console.log('🛒 Sincronizando carrinho do backend');
          }
        }
      } catch (error) {
        console.warn('Backend indisponível, usando carrinho local:', error);
      }
      
      return Promise.resolve();
    },
  },
};

export default offlineServices;
