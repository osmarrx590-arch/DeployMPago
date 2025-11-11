
export interface NotaFiscal {
  id: number;
  serie: string;
  numero: string;
  descricao: string;
  data: string;
  empresa_id: number;
}

export interface Empresa {
  id: number;
  nome: string;
  endereco: string;
  telefone: string;
  email: string;
  cnpj: string;
  notasFiscais: NotaFiscal[];
}

export interface ApiContextType {
  getEmpresas: () => Promise<Empresa[]>;
  getEmpresaById: (id: number) => Promise<Empresa | null>;
  cadastrarEmpresa: (data: Omit<Empresa, 'id' | 'notasFiscais'> & { notaFiscal: Omit<NotaFiscal, 'id' | 'empresa_id'> }) => Promise<Empresa>;
  deleteEmpresa: (id: number) => Promise<void>;
  getNotasFiscaisByEmpresa: (empresa_id: number) => Promise<NotaFiscal[]>;
  createNotaFiscal: (data: Omit<NotaFiscal, 'id'>) => Promise<NotaFiscal>;
}
