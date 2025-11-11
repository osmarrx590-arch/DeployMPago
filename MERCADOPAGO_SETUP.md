# Integração Mercado Pago - Configuração

## 📋 Credenciais de Teste Configuradas

As seguintes credenciais de teste do Mercado Pago já estão configuradas no projeto:

- **Public Key**: `APP_USR-c1f99119-2376-47f9-b456-1fa509473fb6`
- **Access Token**: `APP_USR-3542135147633802-102621-efdb375d6e6fab25f7ab0c586304c0d3-2939944844`
- **Modo Sandbox**: Ativado (`MP_FORCE_SANDBOX=true`)

## 🚀 Como Testar

### 1. Instalar Dependências do Backend

```bash
cd backend
pip install -r requirements.txt
```

### 2. Iniciar o Backend

```bash
# Na pasta raiz do projeto
python -m uvicorn backend.main:app --reload --port 8000
```

### 3. Iniciar o Frontend

Em outro terminal:

```bash
npm install
npm run dev
```

### 4. Realizar um Pedido de Teste

1. Acesse a loja online em `http://localhost:8080/loja-online`
2. Adicione produtos ao carrinho
3. Vá para o checkout em `http://localhost:8080/loja-online/checkout`
4. Clique em "Realizar Compra"
5. Você será redirecionado para a página de pagamento do Mercado Pago (modo sandbox)

### 5. Dados de Teste do Mercado Pago

Use os seguintes dados para testar pagamentos no ambiente sandbox:

**Cartões de Teste:**

| Bandeira | Número | CVV | Validade |
|----------|--------|-----|----------|
| Mastercard (aprovado) | 5031 4332 1540 6351 | 123 | Qualquer data futura |
| Visa (aprovado) | 4235 6477 2802 5682 | 123 | Qualquer data futura |
| Visa (recusado) | 4509 9535 6623 3704 | 123 | Qualquer data futura |

**Nome do titular:** Qualquer nome
**CPF:** 12345678909

## 🔄 Fluxo de Pagamento

1. **Frontend** → Usuário clica em "Realizar Compra"
2. **Frontend** → Envia itens do carrinho para `POST /api/mercadopago/create`
3. **Backend** → Cria preferência de pagamento no Mercado Pago
4. **Backend** → Retorna link de pagamento (sandbox_init_point)
5. **Frontend** → Abre link do Mercado Pago em nova aba
6. **Mercado Pago** → Processa pagamento
7. **Mercado Pago** → Redireciona para:
   - `/loja-online/pagamento/sucesso` (pagamento aprovado)
   - `/loja-online/pagamento/falha` (pagamento recusado)
   - `/loja-online/pagamento/pendente` (pagamento em análise)

## 📁 Arquivos Importantes

### Backend
- `backend/main.py` - Endpoint `/api/mercadopago/create` (linha 927+)
- `backend/.env` - Configurações do Mercado Pago
- `backend/requirements.txt` - SDK mercadopago==2.2.3

### Frontend
- `src/pages/loja-online/Checkout.tsx` - Lógica de checkout
- `src/pages/loja-online/PagamentoSucesso.tsx` - Página de sucesso
- `src/pages/loja-online/PagamentoFalha.tsx` - Página de falha
- `src/pages/loja-online/PagamentoPendente.tsx` - Página pendente
- `src/pages/loja-online/RotasLojaOnline.tsx` - Rotas configuradas

## 🔧 Webhook (Opcional)

Para receber notificações de pagamento, configure:

1. Exponha o backend com ngrok: `ngrok http 8000`
2. Atualize `MP_NOTIFICATION_URL` no `.env` com a URL do ngrok
3. Configure o webhook no painel do Mercado Pago

O endpoint `/webhooks/mercadopago` já está implementado no backend.

## ☁️ Deploy no Render (passo-a-passo)

Se você está usando o Render para hospedar o backend e o frontend, siga estes passos para configurar as variáveis de ambiente, o webhook e o build corretamente.

### 1) Backend (Web Service)

- Vá ao painel do seu serviço backend (ex.: `choperia-backend`) → Environment → Environment Variables / Secret Files.
- Adicione as seguintes variáveis (marque como secret quando disponível):
   - `MERCADO_PAGO_ACCESS_TOKEN` = <SEU_ACCESS_TOKEN_DO_MERCADO_PAGO>
   - `MP_ACCESS_TOKEN` = (opcional) <mesmo_valor_outra_chave> — usado como fallback
   - `MP_PUBLIC_KEY` = (opcional) <SUA_PUBLIC_KEY> — só necessário se for usar o SDK cliente no browser
   - `MP_FORCE_SANDBOX` = `true` ou `false` (use `true` para testes)
   - `MP_NOTIFICATION_URL` = `https://<SEU_BACKEND_ONRENDER>/webhooks/mercadopago`

- Observações:
   - Prefira usar *Secret Files* ou marcar as variáveis como secret no Render para evitar vazar tokens.
   - Substitua `<SEU_BACKEND_ONRENDER>` pelo domínio público do seu serviço (ex.: `choperia-backend-9ty4.onrender.com`).

### 2) Frontend (Static Site)

- No painel do serviço frontend (ex.: `choperia-frontend`) → Environment → Environment Variables, defina:
   - `VITE_BACKEND_URL` = `https://<SEU_BACKEND_ONRENDER>` (necessário no momento do build)
   - `VITE_MP_PUBLIC_KEY` = (opcional) sua public key, se for usar o SDK JS do Mercado Pago no navegador

- Observação importante: variáveis `VITE_` são incorporadas em tempo de build. Se você alterar `VITE_BACKEND_URL` no painel, será necessário re-deploy do site para que o novo valor seja aplicado no bundle.

### 3) Webhook no painel do Mercado Pago

- No painel de desenvolvedor do Mercado Pago, configure o webhook apontando para o valor de `MP_NOTIFICATION_URL` que você definiu no Render.
- No backend, o endpoint que recebe as notificações é `/webhooks/mercadopago` e já está implementado.

### 4) Testes pós-deploy

- Fazer um POST de teste para criar preferência (ex.: via curl/PowerShell) para verificar se o backend retorna `init_point` / `sandbox_init_point`.
- Envie uma notificação de teste do Mercado Pago para a URL do webhook (ou use o painel do Mercado Pago para testes) e verifique os logs do serviço no painel do Render.

### 5) Segurança e boas práticas

- Nunca comite tokens no repositório. Se tokens já foram comitados, rotacione (gere novos) no painel do Mercado Pago.
- Use as funcionalidades de *Environment Variables* ou *Secret Files* do Render para armazenar credenciais.
- Para ambientes de produção, defina `MP_FORCE_SANDBOX=false` e use as credenciais de produção.

## 🎯 Próximos Passos (Produção)

Para usar em produção:

1. Obtenha credenciais de produção no [painel do Mercado Pago](https://www.mercadopago.com.br/developers)
2. Substitua as credenciais no `.env`
3. Remova ou configure `MP_FORCE_SANDBOX=false`
4. Configure o webhook de produção
5. Habilite Lovable Cloud para gerenciar secrets de forma segura

## 📚 Documentação

- [Mercado Pago - Documentação Oficial](https://www.mercadopago.com.br/developers/pt/docs)
- [Checkout Pro - Integração](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/landing)
- [Cartões de Teste](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/test-cards)
