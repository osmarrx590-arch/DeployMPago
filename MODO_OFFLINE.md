# Sistema de Fallback Offline

Este projeto implementa um sistema robusto de fallback para localStorage quando o backend está indisponível.

## Funcionalidades

### ✅ Autenticação Offline
- **Login**: Valida credenciais usando dados salvos no localStorage
- **Registro**: Cria novos usuários localmente quando backend está offline
- **Sessão Persistente**: Mantém usuário logado mesmo após recarregar a página
- **Sincronização Automática**: Quando backend volta, dados são sincronizados

### ✅ Dados Locais
Todos os seguintes dados funcionam com fallback automático:
- **Produtos**: Lista completa de produtos disponíveis
- **Carrinho**: Itens no carrinho de compras
- **Favoritos**: Produtos marcados como favoritos
- **Avaliações**: Avaliações e comentários de produtos
- **Pedidos Locais**: Histórico de pedidos da loja física
- **Mesas**: Gerenciamento de mesas e comandas
- **Itens da Mesa**: Adição e remoção de itens nas mesas
- **Estoque**: Movimentações de entrada e saída de produtos
- **Empresas**: Dados das empresas cadastradas

## Como Funciona

### 1. Detecção Automática
O sistema detecta automaticamente quando o backend está indisponível:
```typescript
// Tentativa de requisição ao backend
try {
  const response = await fetch(`${BACKEND}/endpoint`);
  // Usa resposta do backend
} catch (error) {
  // Backend indisponível - usa localStorage
  const localData = localStorage.getItem('key');
  return localData;
}
```

### 2. Sincronização Bidirecional
- **Backend → localStorage**: Quando backend está online, dados são salvos localmente
- **localStorage → Backend**: Quando backend volta, mudanças locais são enviadas

### 3. Indicador Visual
Um componente `ConnectionStatus` exibe alertas quando:
- Backend está offline (amarelo)
- Conexão foi restabelecida (verde, desaparece após 5s)

## Estrutura de Arquivos

```
src/
├── components/
│   └── ConnectionStatus.tsx        # Indicador de status de conexão
├── contexts/
│   └── AuthContext.tsx             # Autenticação com fallback
├── services/
│   ├── storageService.ts           # Gerenciamento de localStorage
│   └── apiServices.ts              # Chamadas de API
├── lib/
│   └── apiWithFallback.ts          # Utilitários de fallback
└── api/loja-online/
    ├── CarrinhoContext.tsx         # Carrinho com sincronização
    ├── FavoritosContext.tsx        # Favoritos com sincronização
    └── AvaliacoesContext.tsx       # Avaliações com sincronização
```

## Uso nos Componentes

### AuthContext
```typescript
// Login automático com fallback
const { signIn } = useAuth();
await signIn(email, password);
// ✅ Funciona online e offline
```

### Carrinho
```typescript
const { adicionarAoCarrinho } = useCarrinho();
await adicionarAoCarrinho(produto);
// ✅ Salva localmente e tenta sincronizar com backend
```

### Favoritos
```typescript
const { toggleFavorito } = useFavoritos();
toggleFavorito(produto);
// ✅ Atualiza UI instantaneamente, sincroniza em background
```

### Mesas (Loja Física)
```typescript
import { adicionarItemMesa } from '@/api/loja-fisica/mesas/itemService';
await adicionarItemMesa(mesa_id, item, usuario_id);
// ✅ Funciona offline, gerencia estoque local e número de pedido
```

### Estoque
```typescript
import { decrementarEstoque } from '@/api/loja-fisica/mesas/produtoService';
await decrementarEstoque(produto_id, quantidade);
// ✅ Atualiza estoque local e registra movimentação offline
```

## Benefícios

1. **Experiência Sem Interrupção**: Usuários podem continuar usando o app mesmo sem backend
2. **Desenvolvimento Local**: Desenvolvedores podem trabalhar sem precisar rodar backend
3. **Resiliência**: App continua funcionando em caso de falhas no servidor
4. **Performance**: Operações locais são instantâneas
5. **Sincronização Inteligente**: Dados são sincronizados automaticamente quando possível

## Limitações

1. **Dados Sensíveis**: Senhas são armazenadas localmente (em produção, use hashing adequado)
2. **Múltiplos Dispositivos**: Mudanças em um dispositivo não aparecem em outros até backend sincronizar
3. **Capacidade**: localStorage tem limite de ~5-10MB dependendo do navegador
4. **Validação**: Validações complexas do servidor não são executadas offline

## Configuração

### Variáveis de Ambiente
```bash
VITE_BACKEND_URL=http://localhost:8000
```

### Ativar/Desativar Modo Offline
O modo offline é **sempre ativo** como fallback. Para desabilitar:
1. Comente a importação de `ConnectionStatus` em `App.tsx`
2. Remova tratamento de erro nos contextos

## Testes

### Simular Backend Offline
1. Pare o servidor backend
2. Tente fazer login ou navegar pelo app
3. Observe o alerta "Backend indisponível"
4. Funcionalidades continuam operando normalmente

### Verificar Sincronização
1. Faça mudanças offline (adicione produto ao carrinho)
2. Inicie o backend
3. Observe logs no console: "Sincronizando carrinho com servidor"
4. Dados locais são enviados para backend

## Debugging

### Console Logs
O sistema emite logs informativos:
```
📦 Usando produtos do localStorage
⭐ Usando favoritos do localStorage
🛒 Sincronizando carrinho do backend
Backend indisponível, usando dados locais
```

### Inspecionar localStorage
Abra DevTools → Application → Local Storage:
- `usuario_logado`: Usuário autenticado
- `carrinho_items`: Itens do carrinho
- `favoritos_items`: Produtos favoritos
- `produtos_cadastrados`: Lista de produtos
- etc.

## Manutenção

### Limpar Cache Local
```typescript
import { clearAllStorage } from '@/services/storageService';
clearAllStorage();
```

### Adicionar Novo Tipo de Dado
1. Adicione chave em `STORAGE_KEYS` em `storageService.ts`
2. Crie funções get/set específicas
3. Implemente fallback no contexto ou serviço correspondente
4. Adicione sincronização em `apiWithFallback.ts`

## Suporte

Para dúvidas ou problemas:
1. Verifique logs do console
2. Inspecione localStorage no DevTools
3. Teste com backend online para verificar sincronização
4. Revise documentação dos serviços individuais


