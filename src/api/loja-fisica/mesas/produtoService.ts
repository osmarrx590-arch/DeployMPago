import { produtoService, estoqueService } from '@/services/apiServices';
import { Produto } from '@/types/produto';
  
export const getProdutos = async (): Promise<Produto[]> => {
    try {
      return await produtoService.getAll();
    } catch (error) {
      console.warn('Backend indisponível, usando produtos do localStorage:', error);
      // FALLBACK: Usar localStorage
      try {
        const { produtoStorage } = await import('@/services/storageService');
        return produtoStorage.getAll();
      } catch (localError) {
        console.error('Fallback local também falhou:', localError);
        throw error;
      }
    }
};
  
export const decrementarEstoque = async (id: number, quantidade: number): Promise<void> => {
    try {
      await estoqueService.addMovimentacao({
        produto_id: id,
        produtoNome: '',
        quantidade,
        tipo: 'saida',
        origem: 'venda_fisica',
        data: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.warn('Backend indisponível, decrementando estoque localmente:', error);
      // FALLBACK: Usar localStorage para movimentação de estoque
      try {
        const { estoqueStorage, produtoStorage } = await import('@/services/storageService');
        
        // Buscar nome do produto para a movimentação
        const produtos = produtoStorage.getAll();
        const produto = produtos.find(p => p.id === id);
        
        // Adicionar movimentação local
        estoqueStorage.addMovimentacao({
          id: Date.now(),
          produto_id: id,
          produtoNome: produto?.nome || `Produto ${id}`,
          quantidade,
          tipo: 'saida',
          origem: 'venda_fisica',
          data: new Date().toISOString().split('T')[0],
          observacoes: 'Movimentação offline - será sincronizada'
        });
        
        // Atualizar estoque do produto localmente
        if (produto) {
          const novoEstoque = Math.max(0, produto.estoque - quantidade);
          produtoStorage.update(id, { ...produto, estoque: novoEstoque });
        }
        
        console.log('✅ Estoque decrementado localmente (modo offline)');
      } catch (localError) {
        console.error('Fallback local de estoque também falhou:', localError);
        // Não lançar erro para não bloquear adição do item à mesa
        console.warn('⚠️ Continuando sem decrementar estoque (será ajustado quando sincronizar)');
      }
    }
};
  
export const incrementarEstoque = async (id: number, quantidade: number): Promise<void> => {
    try {
      await estoqueService.addMovimentacao({
        produto_id: id,
        produtoNome: '',
        quantidade,
        tipo: 'entrada',
        origem: 'produto_cadastro',
        data: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.warn('Backend indisponível, incrementando estoque localmente:', error);
      // FALLBACK: Usar localStorage
      try {
        const { estoqueStorage, produtoStorage } = await import('@/services/storageService');
        
        const produtos = produtoStorage.getAll();
        const produto = produtos.find(p => p.id === id);
        
        estoqueStorage.addMovimentacao({
          id: Date.now(),
          produto_id: id,
          produtoNome: produto?.nome || `Produto ${id}`,
          quantidade,
          tipo: 'entrada',
          origem: 'produto_cadastro',
          data: new Date().toISOString().split('T')[0],
          observacoes: 'Movimentação offline - será sincronizada'
        });
        
        if (produto) {
          const novoEstoque = produto.estoque + quantidade;
          produtoStorage.update(id, { ...produto, estoque: novoEstoque });
        }
        
        console.log('✅ Estoque incrementado localmente (modo offline)');
      } catch (localError) {
        console.error('Fallback local de estoque também falhou:', localError);
        throw new Error('Não foi possível incrementar estoque');
      }
    }
};
