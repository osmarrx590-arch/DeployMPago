import { Mesa, ItemMesa } from '@/types/mesa';
import { STORAGE_KEYS } from '@/services/storageService';
import { reservarEstoque, liberarReservaEstoque, cancelarReservasMesa } from '@/services/estoqueReservaService';
import { cancelarPedidoLocal, sincronizarMesaParaPedido } from '@/services/sincronizacaoService';

const LAST_RESET_DATE_KEY = 'lastResetDate';
const HIGHEST_PEDIDO_KEY = 'highestPedido';

// BroadcastChannel para sincronizar número de pedido entre abas (melhora, mas não é 100% à prova de colisões)
let pedidoBroadcast: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    pedidoBroadcast = new BroadcastChannel('pedido_channel');
    pedidoBroadcast.onmessage = (ev: MessageEvent) => {
      try {
        const msg = ev.data;
        if (msg?.type === 'claimed' && typeof msg.number === 'number') {
          const raw = localStorage.getItem(HIGHEST_PEDIDO_KEY);
          const current = raw ? parseInt(raw, 10) : 0;
          if (!isNaN(current) && msg.number > current) {
            localStorage.setItem(HIGHEST_PEDIDO_KEY, String(msg.number));
          }
        }
      } catch (e) {
        // ignorar erros de parsing
      }
    };
  }
} catch (e) {
  // ambiente sem window ou BroadcastChannel — ok
  pedidoBroadcast = null;
}

// Função para gerar slug baseado no nome da mesa
const gerarSlugMesa = (nome: string): string => {
  if (!nome) return '';
  const trimmed = nome.trim();
  const onlyDigits = trimmed.replace(/\D/g, '');
  if (onlyDigits && onlyDigits === trimmed.replace(/\s/g, '')) {
    return `Mesa-${String(onlyDigits).padStart(2, '0')}`;
  }
  // Título-case e separar por hífen
  const parts = trimmed.split(/[-_\s]+/).filter(Boolean).map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase());
  return parts.join('-');
};

const inicializarMesas = (): Mesa[] => {
  const mesas: Mesa[] = Array.from({ length: 10 }, (_, index) => {
    const nome = String(index + 1).padStart(2, '0');
    return {
      id: index + 1,
      nome: nome,
      status: 'Livre',
      pedido: 0,
      itens: [],
      slug: gerarSlugMesa(`mesa-${nome}`),
      usuario_id: undefined // Mesa livre não tem usuário
    };
  });
  localStorage.setItem(STORAGE_KEYS.MESAS, JSON.stringify(mesas));
  return mesas;
};

const checkAndResetPedidos = () => {
  const today = new Date().toDateString();
  const lastResetDate = localStorage.getItem(LAST_RESET_DATE_KEY);

  if (lastResetDate !== today) {
    localStorage.setItem(LAST_RESET_DATE_KEY, today);
    localStorage.setItem(HIGHEST_PEDIDO_KEY, '0');
  }
};

export const getNextPedidoNumber = (): number => {
  // Garante que o contador é reiniciado diariamente quando necessário
  checkAndResetPedidos();
  // Implementação com tentativa de escrita verificada (read-modify-write)
  // Objetivo: reduzir pulos grandes quando múltiplas abas/processos concorrem.
  const MAX_RETRIES = 8;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const raw = localStorage.getItem(HIGHEST_PEDIDO_KEY);
    let currentHighest = 0;
    if (raw !== null) {
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        currentHighest = parsed;
      } else {
        console.warn('[mesaService] valor inválido detectado em HIGHEST_PEDIDO_KEY, resetando para 0', { raw });
        currentHighest = 0;
        localStorage.setItem(HIGHEST_PEDIDO_KEY, '0');
      }
    }

    const candidate = currentHighest + 1;

    // DEBUG: log de tentativa para ajudar a rastrear pulos
    try {
      console.log('[mesaService] getNextPedidoNumber attempt', { attempt, currentHighest, candidate });
    } catch (e) {
      /* ignore */
    }

    // Escreve o candidato
    try {
      localStorage.setItem(HIGHEST_PEDIDO_KEY, String(candidate));
    } catch (e) {
      // Se não for possível escrever, sair com fallback
      console.warn('[mesaService] falha ao escrever HIGHEST_PEDIDO_KEY, usando fallback', e);
      break;
    }

    // Ler de volta para verificar se a escrita foi aplicada (ou se outra aba escreveu maior)
    const verifyRaw = localStorage.getItem(HIGHEST_PEDIDO_KEY);
    const verify = verifyRaw !== null ? parseInt(verifyRaw, 10) : NaN;
    if (!isNaN(verify) && verify === candidate) {
      try {
        console.log('[mesaService] getNextPedidoNumber accepted', { candidate });
      } catch (e) {
        /* ignore */
      }
      try {
        if (pedidoBroadcast) pedidoBroadcast.postMessage({ type: 'claimed', number: candidate });
      } catch (e) {
        // ignore
      }
      return candidate;
    }

    // Se outra aba escreveu um número maior, vamos tentar novamente considerando o novo valor
  }

  // Se não conseguiu garantir por tentativas, fazer um passo final determinístico
  const finalRaw = localStorage.getItem(HIGHEST_PEDIDO_KEY);
  const finalVal = finalRaw !== null ? parseInt(finalRaw, 10) : NaN;
  const fallbackCurrent = (!isNaN(finalVal) && finalVal >= 0) ? finalVal : 0;
  const fallback = fallbackCurrent + 1;
  try {
    localStorage.setItem(HIGHEST_PEDIDO_KEY, String(fallback));
    if (pedidoBroadcast) pedidoBroadcast.postMessage({ type: 'claimed', number: fallback });
  } catch (e) {
    // ignore
  }
  try { console.log('[mesaService] getNextPedidoNumber fallback', { fallback }); } catch (e) { /* ignore */ }
  return fallback;
};

// Sincroniza o HIGHEST_PEDIDO_KEY com o maior pedido presente nas mesas (evita saltos se houve dados pré-existentes)
const syncHighestPedidoWithMesas = () => {
  try {
    const mesas = getAllMesas();
    const maxPedido = mesas.reduce((acc, m) => {
      const p = typeof m.pedido === 'number' ? m.pedido : parseInt(String(m.pedido || ''), 10);
      if (!isNaN(p) && p > acc) return p;
      return acc;
    }, 0);
    const raw = localStorage.getItem(HIGHEST_PEDIDO_KEY);
    const current = raw !== null ? parseInt(raw, 10) : 0;
    if (isNaN(current) || maxPedido > current) {
      localStorage.setItem(HIGHEST_PEDIDO_KEY, String(maxPedido));
      console.log('[mesaService] syncHighestPedidoWithMesas ajustou HIGHEST_PEDIDO_KEY para', maxPedido);
    }
  } catch (e) {
    // não bloquear a aplicação
    console.warn('[mesaService] erro ao sincronizar highest pedido with mesas', e);
  }
};

const migrarMesasSemSlug = () => {
  const mesasStorage = localStorage.getItem(STORAGE_KEYS.MESAS);
  if (!mesasStorage) return;
  const mesas = JSON.parse(mesasStorage) as Mesa[];
  let alterou = false;
  const mesasMigradas = mesas.map((mesa: Mesa) => {
    if (!mesa.slug) {
      alterou = true;
      return {
        ...mesa,
        slug: gerarSlugMesa(`mesa-${mesa.nome}`)
      };
    }
    return mesa;
  });
  if (alterou) {
    localStorage.setItem(STORAGE_KEYS.MESAS, JSON.stringify(mesasMigradas));
  }
};

export const getAllMesas = (): Mesa[] => {
  const mesasStorage = localStorage.getItem(STORAGE_KEYS.MESAS);
  if (!mesasStorage) {
    return inicializarMesas();
  }
  const mesas = JSON.parse(mesasStorage) as Mesa[];
  if (mesas.length === 0) {
    return inicializarMesas();
  }
  migrarMesasSemSlug();
  return mesas;
};

// Sincroniza mesas vindas do backend com o localStorage mantendo campos locais importantes
export const syncMesasFromBackend = (remoteMesas: Mesa[] | undefined | null): void => {
  if (!Array.isArray(remoteMesas)) return;
  try {
    const localRaw = localStorage.getItem(STORAGE_KEYS.MESAS);
    const localMesas: Mesa[] = localRaw ? JSON.parse(localRaw) : [];

    const normalize = (s?: string) => (s || '').toString().trim().toLowerCase();

    const merged: Mesa[] = remoteMesas.map((r) => {
      // tentar encontrar correspondência por slug ou nome (case-insensitive)
      const found = localMesas.find(l => normalize(l.slug) === normalize(r.slug) || normalize(l.nome) === normalize(r.nome));
      return {
        // preferir campos do backend mas preservar itens/pedido/usuario_id locais quando existirem
        id: r.id,
        nome: r.nome ?? (found ? found.nome : r.nome),
        slug: r.slug ?? (found ? found.slug : r.slug),
    // Salvar o status exatamente como veio do backend (sem transformar), ou usar o local se existir
    status: r.status ?? (found ? found.status : 'Livre'),
        pedido: (found && found.pedido) ? found.pedido : (r.pedido ?? 0),
        itens: (found && Array.isArray(found.itens) && found.itens.length > 0) ? found.itens : (Array.isArray(r.itens) ? r.itens : []),
        usuario_id: (found && found.usuario_id) ? found.usuario_id : r.usuario_id,
        statusPedido: r.statusPedido ?? (found ? found.statusPedido : undefined),
      } as Mesa;
    });

    // Se quiser manter mesas locais não presentes no backend, pode concatenar aqui.
    // Atualmente vamos preservar apenas as mesas que vêm do backend (fonte de verdade),
    // para evitar divergência de nomes/ids que o usuário mencionou.

    localStorage.setItem(STORAGE_KEYS.MESAS, JSON.stringify(merged));
    console.log('[mesaService] syncMesasFromBackend: localStorage atualizado com', merged.length, 'mesas');
    // Notificar outras abas/componentes que as mesas foram sincronizadas
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          const bc = new BroadcastChannel('mesa_events');
          bc.postMessage({ type: 'mesa_event', reason: 'syncMesasFromBackend' });
          bc.close();
        } catch (e) {
          /* ignore */
        }
      }
    } catch (e) {
      // ambiente sem window — ignore
    }

    try {
      // também disparar um evento customizado para listeners locais
      if (typeof window !== 'undefined') {
        try { window.dispatchEvent(new Event('mesas_sincronizadas')); } catch (e) { /* ignore */ }
      }
    } catch (e) {
      /* ignore */
    }
  } catch (e) {
    console.warn('[mesaService] erro ao sincronizar mesas do backend para localStorage', e);
  }
};

export const getMesaById = (id: number): Mesa | undefined => {
  const mesas = getAllMesas();
  return mesas.find(mesa => mesa.id === id);
};

// Função para buscar mesa por slug
export const getMesaBySlug = (slug: string): Mesa | undefined => {
  const mesas = getAllMesas();
  return mesas.find(mesa => mesa.slug === slug);
};

export const salvarMesa = (mesa: Omit<Mesa, 'id'>): Mesa => {
  const mesasAtuais = getAllMesas();
  const novoId = Math.max(...mesasAtuais.map(m => m.id), 0) + 1;
  
  // Gera slug se não foi fornecido
  const slug = mesa.slug || gerarSlugMesa(mesa.nome);
  
  const novaMesa: Mesa = {
    ...mesa,
    id: novoId,
    slug: slug, // Garante que sempre tenha um slug
    itens: mesa.itens || [],
    usuario_id: undefined // Mesa nova sempre livre
  };
  
  mesasAtuais.push(novaMesa);
  localStorage.setItem(STORAGE_KEYS.MESAS, JSON.stringify(mesasAtuais));
  return novaMesa;
};

export const atualizarMesa = (id: number, mesaData: Partial<Mesa>): void => {
  const mesasAtuais = getAllMesas();
  const index = mesasAtuais.findIndex(m => m.id === id);
  if (index !== -1) {
    const mesaAnterior = mesasAtuais[index];
    mesasAtuais[index] = { ...mesaAnterior, ...mesaData };
    localStorage.setItem(STORAGE_KEYS.MESAS, JSON.stringify(mesasAtuais));
    
    // Sincronizar com pedidos locais se status mudou
    if (mesaData.statusPedido && mesaData.statusPedido !== mesaAnterior.statusPedido) {
      sincronizarMesaParaPedido(id, mesaData.statusPedido);
    }
  }
};

export const adicionarItemMesa = (mesa_id: number, item: ItemMesa, usuario_id?: number, numeroPedido?: number | string): void => {
  // Primeiro reserva o estoque
  if (!reservarEstoque(item.produto_id, item.quantidade, 'mesa', mesa_id)) {
    throw new Error('Estoque insuficiente');
  }

  console.log('[mesaService] adicionarItemMesa chamado', { mesa_id, item, usuario_id });

  const mesasAtuais = getAllMesas();
  const index = mesasAtuais.findIndex(m => m.id === mesa_id);
  
  if (index !== -1) {
    if (!mesasAtuais[index].itens) {
      mesasAtuais[index].itens = [];
    }
    
    if (mesasAtuais[index].status === 'Livre' || mesasAtuais[index].pedido === 0) {
      // Se o chamador forneceu um número (p.ex. vindo do servidor), usá-lo.
  const pedidoRaw = numeroPedido ?? getNextPedidoNumber();
  let pedidoNum = typeof pedidoRaw === 'string' ? parseInt(pedidoRaw, 10) : (pedidoRaw as number);
  if (isNaN(pedidoNum)) pedidoNum = getNextPedidoNumber();
      mesasAtuais[index].pedido = pedidoNum;
      mesasAtuais[index].usuario_id = usuario_id; // Define o usuário responsável
    }
    
    mesasAtuais[index].itens?.push(item);
    mesasAtuais[index].status = 'Ocupada';
    localStorage.setItem(STORAGE_KEYS.MESAS, JSON.stringify(mesasAtuais));
    
    console.log(`✅ Item adicionado à mesa ${mesa_id} com reserva de estoque`);
  }
};

export const removerItemMesa = (mesa_id: number, itemId: number): void => {
  const mesasAtuais = getAllMesas();
  const index = mesasAtuais.findIndex(m => m.id === mesa_id);
  
  if (index !== -1 && mesasAtuais[index].itens) {
    const itemRemovido = mesasAtuais[index].itens?.find(item => item.id === itemId);
    if (itemRemovido) {
      // Libera a reserva de estoque
      liberarReservaEstoque(itemRemovido.produto_id, itemRemovido.quantidade, 'mesa', mesa_id);
    }
    
    mesasAtuais[index].itens = mesasAtuais[index].itens?.filter(item => item.id !== itemId);
    
    if (mesasAtuais[index].itens.length === 0) {
      mesasAtuais[index].status = 'Livre';
      mesasAtuais[index].pedido = 0;
      mesasAtuais[index].usuario_id = undefined; // Remove vínculo do usuário
      mesasAtuais[index].statusPedido = undefined;
    }
    
    localStorage.setItem(STORAGE_KEYS.MESAS, JSON.stringify(mesasAtuais));
  }
};

export const cancelarPedido = (mesa_id: number): void => {
  const mesasAtuais = getAllMesas();
  const index = mesasAtuais.findIndex(m => m.id === mesa_id);
  
  if (index !== -1) {
    // Cancela reservas de estoque
    cancelarReservasMesa(mesa_id);
    
    // Cancela pedido local correspondente
    cancelarPedidoLocal(mesa_id);
    
    // Limpa mesa
    mesasAtuais[index].itens = [];
    mesasAtuais[index].status = 'Livre';
    mesasAtuais[index].pedido = 0;
    mesasAtuais[index].usuario_id = undefined;
    mesasAtuais[index].statusPedido = undefined;
    
    localStorage.setItem(STORAGE_KEYS.MESAS, JSON.stringify(mesasAtuais));
    
    console.log(`✅ Pedido da mesa ${mesa_id} cancelado com sincronização`);
  }
};

export const trocarUsuarioMesa = (mesa_id: number, novousuario_id: number): void => {
  const mesasAtuais = getAllMesas();
  const index = mesasAtuais.findIndex(m => m.id === mesa_id);
  
  if (index !== -1) {
    mesasAtuais[index].usuario_id = novousuario_id;
    localStorage.setItem(STORAGE_KEYS.MESAS, JSON.stringify(mesasAtuais));
  }
};

export const deleteMesa = (id: number): void => {
  const mesasAtuais = getAllMesas();
  const mesasAtualizadas = mesasAtuais.filter(m => m.id !== id);
  if (mesasAtualizadas.length === 0) {
    inicializarMesas();
  } else {
    localStorage.setItem(STORAGE_KEYS.MESAS, JSON.stringify(mesasAtualizadas));
  }
};

export const limparMesas = (): void => {
  localStorage.removeItem(STORAGE_KEYS.MESAS);
};

// Backfill: se existirem mesas com itens mas sem número de pedido, gerar números de pedido
export const backfillPedidosFromItens = (): boolean => {
  const mesas = getAllMesas();
  let changed = false;
  for (let i = 0; i < mesas.length; i++) {
    const m = mesas[i];
    const temItens = Array.isArray(m.itens) && m.itens.length > 0;
    if (temItens && (!m.pedido || m.pedido === 0)) {
      mesas[i] = { ...m, pedido: getNextPedidoNumber(), status: 'Ocupada' };
      changed = true;
    }
  }
  if (changed) {
    localStorage.setItem(STORAGE_KEYS.MESAS, JSON.stringify(mesas));
  }
  return changed;
};

// executado no contexto da aplicação
declare global {
  interface Window {
    __APP__?: {
      services?: {
        mesaService?: {
          backfillPedidosFromItens?: () => boolean | void;
        };
      };
    };
  }
}

window.__APP__?.services?.mesaService?.backfillPedidosFromItens?.();