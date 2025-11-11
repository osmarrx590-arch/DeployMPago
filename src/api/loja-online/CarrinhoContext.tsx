// src/contexts/CarrinhoProvider.tsx (ou o nome original do seu arquivo)
import React, { useState, useEffect } from 'react';
import { reservarEstoque, liberarReservaEstoque, getEstoqueDisponivel } from '@/services/estoqueReservaService';
import { Produto, ItemCarrinho } from '@/types/produto';
import { CarrinhoContextData } from '@/types/carrinho';
import { CarrinhoContext } from '@/contexts/CarrinhoContext';
import { carrinhoStorage } from '@/services/storageService';
import { cartService, BackendCartItem } from '@/services/apiServices';

export function CarrinhoProvider({ children }: { children: React.ReactNode }) {
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>(() => {
    return carrinhoStorage.getItens();
  });

  const [cupom, setCupom] = useState<{ nome: string; desconto: number } | null>(() => {
    return carrinhoStorage.getCupom();
  });

  useEffect(() => {
    carrinhoStorage.saveItens(carrinho);
  }, [carrinho]);

  useEffect(() => {
    carrinhoStorage.saveCupom(cupom);
  }, [cupom]);

  // Ao montar, tentar sincronizar com o carrinho do backend
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const server = await cartService.getCart();
        if (!mounted) return;
        if (server && server.id) {
          // Mapear itens do servidor para ItemCarrinho
          const itens = (server.itens || []).map((it: BackendCartItem) => {
            const produtoId = it.produto_id ?? it.id ?? 0;
            return {
              id: produtoId,
              nome: it.nome || '' ,
              quantidade: it.quantidade || 0,
              venda: it.preco_unitario !== undefined ? Number(it.preco_unitario) : (it.venda !== undefined ? Number(it.venda) : 0),
              categoria: '',
              descricao: '',
              custo: 0,
              codigo: '',
              estoque: 0,
              empresa_id: 0,
              disponivel: true,
              imagem: '',
              slug: '',
            } as ItemCarrinho;
          });
          // comparar com o localStorage e só sobrescrever se houver diferença
          const local = carrinhoStorage.getItens();
          const normalize = (arr: ItemCarrinho[]) => arr.map(i => `${i.id}:${i.quantidade}:${i.venda}`).sort().join('|');
          if (normalize(local) !== normalize(itens)) {
            setCarrinho(itens);
          }
        }
      } catch (e) {
        // não bloquear a UI se falhar
        console.warn('Não foi possível sincronizar carrinho com o servidor:', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const adicionarAoCarrinho = async (produto: Produto): Promise<boolean> => {
    const itemExistente = carrinho.find(item => item.id === produto.id);
    const quantidadeAtual = itemExistente?.quantidade || 0;
    const novaQuantidade = quantidadeAtual + 1;

    const estoqueDisponivel = getEstoqueDisponivel(produto.id);
    if (estoqueDisponivel < novaQuantidade) {
      console.warn(`Estoque insuficiente para ${produto.nome}. Disponível: ${estoqueDisponivel}`);
      return false;
    }

    if (!reservarEstoque(produto.id, 1, 'carrinho')) {
      return false;
    }

    setCarrinho(carrinhoAtual => {
      if (itemExistente) {
        return carrinhoAtual.map(item =>
          item.id === produto.id
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        );
      }
      return [...carrinhoAtual, { ...produto, quantidade: 1 }];
    });
    
    // sincronizar com backend em background (não bloqueia UI)
    (async () => {
      try {
        await cartService.addItem({ produto_id: produto.id, quantidade: 1, venda: produto.venda });
        const server = await cartService.getCart();
        if (server && server.itens) {
          const itens = (server.itens || []).map((it: BackendCartItem) => {
            const produtoId = it.produto_id ?? it.id ?? 0;
            return {
              id: produtoId,
              nome: it.nome || '' ,
              quantidade: it.quantidade || 0,
              venda: it.preco_unitario !== undefined ? Number(it.preco_unitario) : (it.venda !== undefined ? Number(it.venda) : 0),
              categoria: '',
              descricao: '',
              custo: 0,
              codigo: '',
              estoque: 0,
              empresa_id: 0,
              disponivel: true,
              imagem: '',
              slug: '',
            } as ItemCarrinho;
          });
          setCarrinho(itens);
        }
      } catch (err) {
        console.warn('Backend indisponível, item salvo localmente:', err);
        // Mantém mudança local - não faz rollback quando backend está offline
      }
    })();

    return true;
  };

  const removerDoCarrinho = async (produto_id: number): Promise<boolean> => {
    const itemRemovido = carrinho.find(item => item.id === produto_id);
    if (itemRemovido) {
      liberarReservaEstoque(produto_id, itemRemovido.quantidade, 'carrinho');
    }

    setCarrinho(carrinhoAtual =>
      carrinhoAtual.filter(item => item.id !== produto_id)
    );

    // sincronizar remoção com backend em background
    (async () => {
      try {
        await cartService.clearCart();
        const current = carrinhoStorage.getItens().filter(it => it.id !== produto_id);
        for (const it of current) {
          await cartService.addItem({ produto_id: it.id, quantidade: it.quantidade, venda: it.venda });
        }
        const server = await cartService.getCart();
        if (server && server.itens) {
          const itens = (server.itens || []).map((it: BackendCartItem) => ({
            id: it.produto_id ?? it.id ?? 0,
            nome: it.nome || '',
            quantidade: it.quantidade || 0,
            venda: it.preco_unitario !== undefined ? Number(it.preco_unitario) : (it.venda !== undefined ? Number(it.venda) : 0),
            categoria: '', descricao: '', custo: 0, codigo: '', estoque: 0, empresa_id: 0, disponivel: true, imagem: '', slug: ''
          } as ItemCarrinho));
          setCarrinho(itens);
        }
      } catch (err) {
        console.warn('Backend indisponível, item removido localmente:', err);
        // Mantém mudança local - não faz rollback
      }
    })();
    
    return true;
  };

  const atualizarQuantidade = async (produto_id: number, quantidade: number): Promise<boolean> => {
    if (quantidade < 1) {
      return await removerDoCarrinho(produto_id);
    }

    const itemAtual = carrinho.find(item => item.id === produto_id);
    if (!itemAtual) return false;

    const diferenca = quantidade - itemAtual.quantidade;

    if (diferenca > 0) {
      if (!reservarEstoque(produto_id, diferenca, 'carrinho')) {
        return false;
      }
    } else if (diferenca < 0) {
      liberarReservaEstoque(produto_id, Math.abs(diferenca), 'carrinho');
    }

    setCarrinho(carrinhoAtual =>
      carrinhoAtual.map(item =>
        item.id === produto_id
          ? { ...item, quantidade }
          : item
      )
    );
    
    // sincronizar quantidade com backend em background
    (async () => {
      try {
        await cartService.clearCart();
        const current = carrinhoStorage.getItens().map(it => it.id === produto_id ? { ...it, quantidade } : it);
        for (const it of current) {
          await cartService.addItem({ produto_id: it.id, quantidade: it.quantidade, venda: it.venda });
        }
        const server = await cartService.getCart();
        if (server && server.itens) {
          const itens = (server.itens || []).map((it: BackendCartItem) => ({
            id: it.produto_id ?? it.id ?? 0,
            nome: it.nome || '',
            quantidade: it.quantidade || 0,
            venda: it.preco_unitario !== undefined ? Number(it.preco_unitario) : (it.venda !== undefined ? Number(it.venda) : 0),
            categoria: '', descricao: '', custo: 0, codigo: '', estoque: 0, empresa_id: 0, disponivel: true, imagem: '', slug: ''
          } as ItemCarrinho));
          setCarrinho(itens);
        }
      } catch (err) {
        console.warn('Backend indisponível, quantidade atualizada localmente:', err);
        // Mantém mudança local - não faz rollback
      }
    })();
    
    return true;
  };

  const limparCarrinho = async (): Promise<boolean> => {
    carrinho.forEach(item => {
      liberarReservaEstoque(item.id, item.quantidade, 'carrinho');
    });

    setCarrinho([]);
    setCupom(null);
    
    // limpar no servidor em background
    (async () => {
      try {
        await cartService.clearCart();
      } catch (err) {
        console.warn('Backend indisponível, carrinho limpo localmente:', err);
      }
    })();
    
    return true;
  };

  const subtotalCarrinho = carrinho.reduce(
    (total, item) => total + item.venda * item.quantidade,
    0
  );

  const descontoCupom = cupom ? subtotalCarrinho * (cupom.desconto / 100) : 0;
  const totalCarrinho = subtotalCarrinho - descontoCupom;
  const quantidadeItens = carrinho.reduce((total, item) => total + item.quantidade, 0);

  const aplicarCupom = (codigo: string) => {
    const cupons = {
      'PRIMEIRA10': { nome: 'PRIMEIRA10', desconto: 10 },
      'CHOPP20': { nome: 'CHOPP20', desconto: 20 },
    };

    const cupomEncontrado = cupons[codigo as keyof typeof cupons];
    if (cupomEncontrado) {
      setCupom(cupomEncontrado);
    }
  };

  const removerCupom = () => {
    setCupom(null);
  };

  const value: CarrinhoContextData = {
    carrinho,
    adicionarAoCarrinho,
    removerDoCarrinho,
    atualizarQuantidade,
    limparCarrinho,
    totalCarrinho,
    subtotalCarrinho,
    quantidadeItens,
    descontoCupom,
    cupom,
    aplicarCupom,
    removerCupom,
    getEstoqueDisponivel,
  };

  return (
    <CarrinhoContext.Provider value={value}>
      {children}
    </CarrinhoContext.Provider>
  );
}

