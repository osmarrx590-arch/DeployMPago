from typing import List, Optional
from pydantic import BaseModel, EmailStr
from decimal import Decimal
import datetime


# ----- User -----
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    nome: str
    password: str
    tipo: Optional[str] = 'online'


class UserOut(BaseModel):
    id: int
    username: str
    email: EmailStr
    nome: str
    tipo: str

    class Config:
        orm_mode = True


# ----- Empresa/Categoria/Produto -----
class CategoriaCreate(BaseModel):
    nome: str
    descricao: Optional[str] = ''


class CategoriaOut(CategoriaCreate):
    id: int

    class Config:
        orm_mode = True


class EmpresaCreate(BaseModel):
    nome: str
    endereco: Optional[str] = ''
    telefone: Optional[str] = ''
    email: EmailStr
    cnpj: str
    slug: Optional[str] = ''


class EmpresaOut(EmpresaCreate):
    id: int

    class Config:
        orm_mode = True


class ProdutoCreate(BaseModel):
    nome: str
    categoria_id: int
    empresa_id: int
    descricao: Optional[str] = ''
    custo: Decimal
    venda: Decimal
    codigo: str
    estoque: Optional[int] = 0
    disponivel: Optional[bool] = True
    imagem: Optional[str] = None
    slug: Optional[str] = None


class ProdutoOut(ProdutoCreate):
    id: int

    class Config:
        orm_mode = True


# ----- Mesa / Pedido -----
class MesaCreate(BaseModel):
    nome: str
    capacidade: Optional[int] = 4
    usuario_responsavel_id: Optional[int] = None
    observacoes: Optional[str] = ''


class MesaOut(MesaCreate):
    id: int
    # Campos adicionais retornados pelo backend para a UI
    slug: Optional[str] = ''
    status: Optional[str] = 'Livre'
    pedido: Optional[int] = 0
    # itens retornados no formato simples (lista de dicts) para evitar forward-ref de Pydantic
    itens: List[dict] = []
    statusPedido: Optional[str] = None

    class Config:
        orm_mode = True


class PedidoItemCreate(BaseModel):
    produto_id: Optional[int]
    nome: str
    quantidade: int
    preco_unitario: Decimal


class PedidoCreate(BaseModel):
    tipo: Optional[str] = 'online'
    user_id: Optional[int] = None
    numero: Optional[str] = None
    metodo_pagamento: Optional[str] = None
    itens: List[PedidoItemCreate] = []
    nome_cliente: Optional[str] = None
    mesa_id: Optional[int] = None
    observacoes: Optional[str] = ''


class PedidoItemOut(PedidoItemCreate):
    id: int

    class Config:
        orm_mode = True


class PedidoOut(PedidoCreate):
    id: int
    subtotal: Decimal
    desconto: Decimal
    total: Decimal
    itens: List[PedidoItemOut] = []

    class Config:
        orm_mode = True


# ----- Favorito/Avaliacao/Cupom -----
class FavoritoCreate(BaseModel):
    user_id: int
    produto_id: int


class AvaliacaoCreate(BaseModel):
    user_id: int
    produto_id: int
    rating: int
    comentario: Optional[str] = ''


class CupomCreate(BaseModel):
    codigo: str
    nome: str
    tipo: str
    valor: Decimal
    # Aceita datetimes em ISO 8601 (ex: "2025-11-08T00:00:00Z") ou objetos datetime
    data_inicio: datetime.datetime
    data_fim: datetime.datetime
