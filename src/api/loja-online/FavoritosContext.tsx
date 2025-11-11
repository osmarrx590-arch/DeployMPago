// src/contexts/FavoritosProvider.tsx (ou o nome original do seu arquivo)
import React, { useState, ReactNode, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Produto } from '@/types/produto';
import { FavoritosContextType } from '@/types/favoritos';
import { FavoritosContext } from '@/contexts/FavoritosContext';
import { favoritosStorage } from '@/services/storageService';

export function FavoritosProvider({ children }: { children: ReactNode }) {
  const [favoritos, setFavoritos] = useState<Produto[]>(() => {
    return favoritosStorage.getItens();
  });

  const { toast } = useToast();

  const toggleFavorito = (produto: Produto) => {
    if (isFavorito(produto.id)) {
      removerFavorito(produto.id);
    } else {
      adicionarFavorito(produto);
    }
  };

  const adicionarFavorito = (produto: Produto) => {
    // Otimista: atualiza UI primeiro
    setFavoritos((prev) => [...prev, produto]);
    toast({
      title: "Produto favoritado!",
      description: `${produto.nome} foi adicionado aos seus favoritos.`,
    });

    // Enviar para o backend (fire-and-forget). Log no console para depuração.
    (async () => {
      const payload = { produto_id: produto.id };
      console.log('[favoritos] sending CREATE ->', payload);
      try {
        const backend = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000';
        const res = await fetch(`${backend}/favoritos/`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        let json = null;
        try { json = await res.json(); } catch (e) { /* ignore */ }
        console.log('[favoritos] backend response (CREATE):', res.status, json);
      } catch (err) {
        console.error('[favoritos] error sending CREATE:', err);
      }
    })();
  };

  const removerFavorito = (produto_id: number) => {
    // Otimista: atualiza UI primeiro
    setFavoritos((prev) => prev.filter((p) => p.id !== produto_id));
    toast({
      title: "Produto removido!",
      description: "Produto removido dos seus favoritos.",
    });

    // Enviar remoção para o backend
    (async () => {
      console.log('[favoritos] sending DELETE ->', { produto_id });
      try {
        const backend = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000';
        const res = await fetch(`${backend}/favoritos/${produto_id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        let json = null;
        try { json = await res.json(); } catch (e) { /* ignore */ }
        console.log('[favoritos] backend response (DELETE):', res.status, json);
      } catch (err) {
        console.error('[favoritos] error sending DELETE:', err);
      }
    })();
  };

  const isFavorito = (produto_id: number) => {
    return favoritos.some((p) => p.id === produto_id);
  };

  useEffect(() => {
    favoritosStorage.saveItens(favoritos);
  }, [favoritos]);

  // Ao montar, tentar obter favoritos do backend e, se houver dados, sobrescrever o localStorage
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const backend = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000';
        const res = await fetch(`${backend}/favoritos/`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted) return;
        if (Array.isArray(data) && data.length > 0) {
          // assume backend returns an array of Produto-like objects
          const local = favoritosStorage.getItens();
          const normalize = (arr: Produto[]) => arr.map(p => p.id).sort((a,b) => a-b).join(',');
          if (normalize(local) !== normalize(data)) {
            setFavoritos(data);
            favoritosStorage.saveItens(data);
          }
        }
      } catch (err) {
        console.warn('[favoritos] não foi possível sincronizar favoritos do servidor:', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const value: FavoritosContextType = {
    favoritos,
    toggleFavorito,
    isFavorito,
    removerFavorito,
    adicionarFavorito
  };

  return (
    <FavoritosContext.Provider value={value}>
      {children}
    </FavoritosContext.Provider>
  );
}