import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';

const PagamentoFalha = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Limpar pedido pendente em caso de falha
    localStorage.removeItem('pedido_pendente_mp');
    console.log('❌ Pagamento falhou, pedido pendente removido');
  }, []);

  return (
    <div className="container mx-auto py-12 px-4">
      <Card className="w-full max-w-md mx-auto text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <XCircle className="h-16 w-16 text-red-500" />
          </div>
          <CardTitle className="text-2xl">Pagamento Não Aprovado</CardTitle>
          <CardDescription>
            Houve um problema ao processar seu pagamento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Por favor, verifique seus dados e tente novamente ou escolha outra forma de pagamento.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button onClick={() => navigate('/loja-online/checkout')} className="w-full">
            Tentar Novamente
          </Button>
          <Button variant="outline" onClick={() => navigate('/loja-online/produtos')} className="w-full">
            Voltar para Produtos
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PagamentoFalha;
