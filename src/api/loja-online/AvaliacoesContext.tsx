// src/contexts/AvaliacoesProvider.tsx (ou o nome original do seu arquivo)
import React, { useState, ReactNode, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Avaliacao, AvaliacoesContextType } from '@/types/avaliacoes';
import { AvaliacoesContext } from '@/contexts/AvaliacoesContext';
import { avaliacoesStorage } from '@/services/storageService';

export function AvaliacoesProvider({ children }: { children: ReactNode }) {
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>(() => {
    return avaliacoesStorage.getItens();
  });

  const { toast } = useToast();

  useEffect(() => {
    avaliacoesStorage.saveItens(avaliacoes);
  }, [avaliacoes]);

  // Ao montar, tentar obter avaliações do backend e, se houver dados, sobrescrever o localStorage
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const backend = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000';
        const res = await fetch(`${backend}/avaliacoes/`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted) return;
        if (Array.isArray(data) && data.length > 0) {
          const local = avaliacoesStorage.getItens();
          const normalize = (arr: Avaliacao[]) => arr.map(a => `${a.produto_id}:${a.rating}:${a.comentario||''}`).sort().join('|');
          if (normalize(local) !== normalize(data)) {
            setAvaliacoes(data);
            avaliacoesStorage.saveItens(data);
          }
        }
      } catch (err) {
        console.warn('[avaliacoes] não foi possível sincronizar avaliações do servidor:', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const avaliarProduto = (produto_id: number, rating: number, comentario?: string) => {
    setAvaliacoes((prev) => {
      const index = prev.findIndex((a) => a.produto_id === produto_id);
      const novaAvaliacao: Avaliacao = {
        produto_id,
        rating,
        comentario: comentario || undefined,
        dataAvaliacao: new Date().toISOString()
      };

      if (index >= 0) {
        const newAvaliacoes = [...prev];
        newAvaliacoes[index] = novaAvaliacao;
        return newAvaliacoes;
      }
      return [...prev, novaAvaliacao];
    });

    toast({
      title: "Produto avaliado!",
      description: `Você deu ${rating} estrelas para este produto.`,
    });

    // Enviar para o backend (fire-and-forget). Log no console para depuração.
    (async () => {
      const payload = { produto_id, rating, comentario };
      console.log('[avaliacoes] sending CREATE/UPDATE ->', payload);
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000'}/avaliacoes/`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        let json = null;
        try { json = await res.json(); } catch (e) { /* ignore non-json */ }
        console.log('[avaliacoes] backend response (CREATE/UPDATE):', res.status, json);
      } catch (err) {
        console.error('[avaliacoes] error sending CREATE/UPDATE:', err);
      }
    })();
  };

  const removerAvaliacao = (produto_id: number) => {
    // Otimista: remove localmente
    setAvaliacoes((prev) => prev.filter((a) => a.produto_id !== produto_id));
    toast({
      title: "Avaliação removida",
      description: "Sua avaliação foi removida.",
    });

    // Enviar remoção para o backend
    (async () => {
      console.log('[avaliacoes] sending DELETE ->', { produto_id });
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000'}/avaliacoes/${produto_id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        let json = null;
        try { json = await res.json(); } catch (e) { /* ignore */ }
        console.log('[avaliacoes] backend response (DELETE):', res.status, json);
      } catch (err) {
        console.error('[avaliacoes] error sending DELETE:', err);
      }
    })();
  };

  const getAvaliacao = (produto_id: number) => {
    return avaliacoes.find((a) => a.produto_id === produto_id)?.rating || 0;
  };

  const getComentario = (produto_id: number) => {
    return avaliacoes.find((a) => a.produto_id === produto_id)?.comentario || '';
  };

  const getAvaliacaoCompleta = (produto_id: number) => {
    return avaliacoes.find((a) => a.produto_id === produto_id);
  };

  const value = {
    avaliacoes,
    avaliarProduto,
    removerAvaliacao,
    getAvaliacao,
    getComentario,
    getAvaliacaoCompleta
  };

  return (
    <AvaliacoesContext.Provider value={value as AvaliacoesContextType}>
      {children}
    </AvaliacoesContext.Provider>
  );
}