import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { salvarPedidoNoHistorico } from '@/services/pedidoHistoricoService';
import { confirmarConsumoEstoque } from '@/services/estoqueReservaService';
import { registrarSaida } from '@/services/movimentacaoEstoqueService';
import { useCarrinho } from '@/hooks/useCarrinho';

const PagamentoPendente = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { limparCarrinho } = useCarrinho();
  const [processando, setProcessando] = useState(true);
  const [numeroPedido, setNumeroPedido] = useState<number | null>(null);

  useEffect(() => {
    const processarPagamento = async () => {
      try {
        const pedidoPendenteStr = localStorage.getItem('pedido_pendente_mp');
        if (!pedidoPendenteStr) {
          console.warn('Nenhum pedido pendente encontrado');
          setProcessando(false);
          return;
        }

        const pedidoPendente = JSON.parse(pedidoPendenteStr);
        console.log('⏳ Pagamento pendente! Processando pedido...', pedidoPendente);

        // Confirmar consumo de estoque
        pedidoPendente.itens.forEach((item: any) => {
          confirmarConsumoEstoque(item.id, item.quantidade);
          registrarSaida(item.id, item.quantidade, 'venda_online', `pedido-online-${Date.now()}`);
        });

        // Salvar pedido no histórico
        const pedidoSalvo = salvarPedidoNoHistorico({
          metodoPagamento: pedidoPendente.metodoPagamento,
          itens: pedidoPendente.itens,
          subtotal: pedidoPendente.subtotal,
          desconto: pedidoPendente.desconto,
          total: pedidoPendente.total,
          nome: pedidoPendente.nome,
        });

        console.log('💾 Pedido salvo (pendente):', pedidoSalvo);
        setNumeroPedido(pedidoSalvo.numero);

        // Limpar carrinho e pedido pendente
        limparCarrinho();
        localStorage.removeItem('pedido_pendente_mp');

        toast({
          title: "Pedido registrado",
          description: `Pedido #${pedidoSalvo.numero} aguardando confirmação de pagamento.`,
          duration: 5000,
        });
      } catch (error) {
        console.error('❌ Erro ao processar pedido pendente:', error);
        toast({
          title: "Erro ao processar pedido",
          description: "Houve um problema ao registrar seu pedido.",
          variant: "destructive",
          duration: 5000,
        });
      } finally {
        setProcessando(false);
      }
    };

    processarPagamento();
  }, [toast, limparCarrinho]);

  if (processando) {
    return (
      <div className="container mx-auto py-12 px-4">
        <Card className="w-full max-w-md mx-auto text-center">
          <CardContent className="pt-12 pb-12">
            <Loader2 className="h-16 w-16 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-lg font-medium">Processando informações...</p>
            <p className="text-sm text-muted-foreground mt-2">Aguarde um momento</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4">
      <Card className="w-full max-w-md mx-auto text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <Clock className="h-16 w-16 text-yellow-500" />
          </div>
          <CardTitle className="text-2xl">Pagamento Pendente</CardTitle>
          <CardDescription>
            {numeroPedido ? `Pedido #${numeroPedido} aguardando confirmação.` : 'Seu pagamento está sendo processado.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Você receberá uma notificação assim que o pagamento for confirmado.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button onClick={() => navigate('/loja-online/historico')} className="w-full">
            Ver Meus Pedidos
          </Button>
          <Button variant="outline" onClick={() => navigate('/loja-online/produtos')} className="w-full">
            Continuar Comprando
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PagamentoPendente;
