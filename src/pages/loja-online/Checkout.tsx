// src/pages/loja-online/Checkout.tsx
import React, { useState } from 'react';
import { useCarrinho } from '@/hooks/useCarrinho';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, ArrowLeft, Send, CreditCard, Banknote } from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { salvarPedidoNoHistorico } from '@/services/pedidoHistoricoService';
import { useAuth } from '@/contexts/AuthContext';
import { formataPreco } from '@/contexts/moeda';
import { confirmarConsumoEstoque } from '@/services/estoqueReservaService';
import { registrarSaida } from '@/services/movimentacaoEstoqueService';

const Checkout = () => {
  // Hooks para gerenciamento do carrinho e navegação
  const { carrinho, totalCarrinho, limparCarrinho, subtotalCarrinho, descontoCupom } = useCarrinho();
  // Não precisamos mais do modal de seleção de método — usaremos MercadoPago (cartão)
  const [showPagamentoModal, setShowPagamentoModal] = useState(false); // mantido apenas por compatibilidade visual se necessário
  const [metodoPagamento] = useState('cartao'); // padrão: cartão via Mercado Pago
  const [isProcessing, setIsProcessing] = useState(false); // Estado para controlar processamento
  const { toast } = useToast(); // Hook para exibir notificações
  const navigate = useNavigate(); // Hook para navegação entre páginas
  const { user, profile } = useAuth(); // Pega o usuário autenticado do contexto

  // Função para criar preferência MP e redirecionar (SEM processar pedido ainda)
  const handlePagamento = async () => {
    if (isProcessing || !metodoPagamento) return;
    setIsProcessing(true);

    try {
      console.log('🚀 Criando preferência Mercado Pago...', { carrinho, total: totalCarrinho });

      // Salvar dados do pedido pendente no localStorage para processar após retorno do MP
      const pedidoPendente = {
        metodoPagamento,
        itens: carrinho,
        subtotal: subtotalCarrinho,
        desconto: descontoCupom,
        total: totalCarrinho,
        nome: profile?.nome,
        timestamp: Date.now()
      };
      localStorage.setItem('pedido_pendente_mp', JSON.stringify(pedidoPendente));
      console.log('💾 Dados do pedido salvos temporariamente:', pedidoPendente);

      // Criar preferência no Mercado Pago
      const mpPayload = {
        items: carrinho.map(item => ({
          id: String(item.id),
          title: item.nome,
          quantity: Number(item.quantidade),
          currency_id: 'BRL',
          unit_price: Number(item.venda)
        })),
        back_urls: {
          success: `${window.location.origin}/loja-online/pagamento/sucesso`,
          failure: `${window.location.origin}/loja-online/pagamento/falha`,
          pending: `${window.location.origin}/loja-online/pagamento/pendente`,
        },
        auto_return: 'approved'
      };

      console.log('🧩 Enviando payload MercadoPago:', mpPayload);

      const mpResp = await fetch(`${import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000'}/api/mercadopago/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mpPayload)
      });

      if (!mpResp.ok) {
        const text = await mpResp.text();
        console.warn('Erro ao criar preferência MercadoPago', text);
        throw new Error('Erro ao iniciar pagamento (MercadoPago)');
      }

      const mpJson = await mpResp.json();
      console.log('📦 Resposta MercadoPago:', mpJson);
      const link = mpJson.init_point || mpJson.sandbox_init_point;
      
      if (link) {
        // Redirecionar para a página do Mercado Pago
        console.log('🔗 Redirecionando para Mercado Pago...');
        window.location.href = link;
      } else {
        console.warn('Resposta MercadoPago sem link', mpJson);
        throw new Error('Link de pagamento não recebido');
      }
    } catch (error: unknown) {
      console.error('❌ Erro ao criar preferência MP:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      toast({
        title: "Erro ao iniciar pagamento",
        description: `Não foi possível conectar ao Mercado Pago. ${errorMessage}`,
        variant: "destructive",
        duration: 3000,
      });
      
      setIsProcessing(false);
    }
  };

  const handleVoltar = () => navigate(-1);

  if (carrinho.length === 0) {
    return (
      <div className="container mx-auto py-12 px-4">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Carrinho vazio</CardTitle>
            <CardDescription>Seu carrinho está vazio. Adicione produtos antes de continuar.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full" onClick={() => navigate('/loja-online/produtos')}>
              Ver produtos
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4">
      {/* Botão para voltar à página anterior */}
      <Button variant="outline" onClick={handleVoltar} className="mb-8">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>

      {/* Layout principal com grid responsivo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Coluna principal: Resumo do pedido */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Resumo do Pedido
              </CardTitle>
              <CardDescription>Confira os itens do seu pedido</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Lista de itens do carrinho */}
                {carrinho.map((item) => (
                  <div key={item.id} className="flex justify-between border-b pb-3">
                    <div>
                      <p className="font-medium">{item.nome}</p>
                      <p className="text-sm text-muted-foreground">                        
                        {item.quantidade} x {formataPreco(item.venda)}
                      </p>
                    </div>
                    <p className="font-medium">
                      {formataPreco(item.venda * item.quantidade)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna lateral: Resumo financeiro e finalização */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Resumo Financeiro</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formataPreco(subtotalCarrinho)}</span>

                </div>
                {/* Mostrar desconto se houver */}
                {descontoCupom > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Desconto:</span>
                    <span>- {formataPreco(descontoCupom)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total:</span>
                  <span>{formataPreco(totalCarrinho)}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                size="lg"
                onClick={handlePagamento}
                disabled={isProcessing}
              >
                <Send className="mr-2 h-5 w-5" />
                {isProcessing ? 'Processando...' : 'Realizar Compra'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Agora o botão 'Realizar Compra' chama diretamente handlePagamento e cria preferência no backend */}
    </div>
  );
};

export default Checkout;
