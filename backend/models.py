"""Modelos SQLAlchemy consolidados para o projeto.
Consolida core, fisica, online e user em um único arquivo para facilitar manutenção.
"""
from datetime import datetime, timezone
from decimal import Decimal
import enum # Enumeração para tipos de usuário

from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Date, Boolean, ForeignKey, Numeric, UniqueConstraint, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy import event
import re
import unicodedata

from .database import Base, engine, Session

# ----------------- User -----------------
class UserType(enum.Enum):
    online = 'online'
    fisica = 'fisica'
    admin = 'admin'


def gerar_slug(text: str) -> str:
    """Gera um slug simples a partir de um texto (normaliza acentos, espaços e caracteres inválidos)."""
    if not text:
        return ''
    # normalizar acentos
    t = unicodedata.normalize('NFKD', text)
    t = t.encode('ascii', 'ignore').decode('ascii')
    t = t.strip()

    # Se o nome for somente números (ex: '1' ou '01'), produz 'Mesa-01'
    digits = re.sub(r'\D', '', t)
    if digits and digits == t.replace(' ', ''):
        # manter dois dígitos
        return f"Mesa-{str(digits).zfill(2)}"

    # Caso geral: gera palavras com inicial maiúscula e separadas por dash
    # Remove caracteres inválidos, preserva números
    t = re.sub(r'[^A-Za-z0-9\s\-]', '', t)
    parts = re.split(r'[\s_\-]+', t)
    parts = [p.capitalize() for p in parts if p]
    slug = '-'.join(parts)
    return slug

class User(Base):
    __tablename__ = 'usuarios'

    # Campos principais
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(150), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    nome = Column(String(150), nullable=False)

    # Senha e campos de autenticação
    password = Column(String(128), nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)

    # Campos de tipo de usuário
    tipo = Column(SAEnum(UserType), default=UserType.online)

    # Campos de data
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    last_login = Column(DateTime, nullable=True)
    date_joined = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    def set_password(self, password: str):
        """Gera um hash da senha usando bcrypt"""
        import bcrypt # Biblioteca para hashing de senhas
        # Converte a senha para bytes se for string
        if isinstance(password, str):
            password = password.encode('utf-8')
        # Gera o salt e o hash
        salt = bcrypt.gensalt()
        self.password = bcrypt.hashpw(password, salt).decode('utf-8')

    def check_password(self, password: str) -> bool:
        """Verifica se a senha está correta"""
        import bcrypt
        # Converte a senha para bytes se for string
        if isinstance(password, str):
            password = password.encode('utf-8')
        # Converte o hash armazenado de string para bytes
        stored = self.password.encode('utf-8')
        # Verifica se a senha corresponde ao hash
        return bcrypt.checkpw(password, stored)


# ----------------- Core: Empresas, Notas Fiscais, Categorias, Produtos -----------------
class EmpresaStatus(enum.Enum):
    ativa = 'ativa'
    inativa = 'inativa'
    suspensa = 'suspensa'


class Empresa(Base):
    __tablename__ = 'empresas'

    id = Column(Integer, primary_key=True, autoincrement=True)
    nome = Column(String(200), nullable=False)
    endereco = Column(Text, nullable=False)
    telefone = Column(String(20), nullable=False)
    email = Column(String(255), nullable=False)
    cnpj = Column(String(18), unique=True, nullable=False)
    slug = Column(String(255), unique=True, nullable=False)
    status = Column(String(20), nullable=False, default=EmpresaStatus.ativa.value)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    notas_fiscais = relationship('NotaFiscal', back_populates='empresa', cascade='all, delete-orphan')
    produtos = relationship('Produto', back_populates='empresa', cascade='all, delete-orphan')


class NotaFiscal(Base):
    __tablename__ = 'notas_fiscais'
    __table_args__ = (UniqueConstraint('empresa_id', 'serie', 'numero', name='uix_empresa_serie_numero'),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    empresa_id = Column(Integer, ForeignKey('empresas.id', ondelete='CASCADE'), nullable=False)
    serie = Column(String(10), default='1')
    numero = Column(String(20), nullable=False)
    descricao = Column(Text, nullable=False)
    data = Column(Date, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    empresa = relationship('Empresa', back_populates='notas_fiscais')


class Categoria(Base):
    __tablename__ = 'categorias'

    id = Column(Integer, primary_key=True, autoincrement=True)
    nome = Column(String(100), unique=True, nullable=False)
    descricao = Column(Text, nullable=True)
    ativa = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    produtos = relationship('Produto', back_populates='categoria', cascade='all, delete-orphan')


class Produto(Base):
    __tablename__ = 'produtos'

    id = Column(Integer, primary_key=True, autoincrement=True)
    nome = Column(String(200), nullable=False)
    categoria_id = Column(Integer, ForeignKey('categorias.id', ondelete='CASCADE'), nullable=False)
    empresa_id = Column(Integer, ForeignKey('empresas.id', ondelete='CASCADE'), nullable=False)
    descricao = Column(Text, nullable=False)
    custo = Column(Numeric(10, 2), nullable=False)
    venda = Column(Numeric(10, 2), nullable=False)
    codigo = Column(String(50), unique=True, nullable=False)
    estoque = Column(Integer, default=0)
    disponivel = Column(Boolean, default=True)
    imagem = Column(String(500), nullable=True)
    slug = Column(String(255), unique=True, nullable=False)

    style = Column(String(100), nullable=True)
    abv = Column(String(20), nullable=True)
    ibu = Column(Integer, nullable=True)
    rating = Column(Numeric(3, 2), default=0.0)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    categoria = relationship('Categoria', back_populates='produtos')
    empresa = relationship('Empresa', back_populates='produtos')

    @property
    def price(self):
        return float(self.venda)

    @property
    def in_stock(self):
        return bool(self.disponivel and (self.estoque or 0) > 0)



# ----------------- Loja física / online: Mesas e Pedidos unificados -----------------
class Mesa(Base):
    __tablename__ = 'mesas'

    id = Column(Integer, primary_key=True)
    nome = Column(String(50), nullable=False)
    slug = Column(String(100), nullable=False, unique=True)
    status = Column(String(20), default='Livre')
    usuario_responsavel_id = Column(Integer, ForeignKey('usuarios.id'), nullable=True)
    capacidade = Column(Integer, default=4)
    observacoes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    usuario_responsavel = relationship('User', backref='mesas_responsavel')


class Pedido(Base):
    """Pedido unificado: pode ser do tipo 'online' ou 'fisica'."""
    __tablename__ = 'pedidos'

    id = Column(Integer, primary_key=True, autoincrement=True)
    tipo = Column(String(20), default='online')
    user_id = Column(Integer, ForeignKey('usuarios.id', ondelete='SET NULL'), nullable=True)
    numero = Column(String(50), unique=True, nullable=False)
    status = Column(String(20), default='Pendente')
    metodo_pagamento = Column(String(50), nullable=True)
    subtotal = Column(Numeric(10, 2), nullable=False, default=0)
    desconto = Column(Numeric(10, 2), default=0)
    total = Column(Numeric(10, 2), nullable=False, default=0)
    mesa_id = Column(Integer, ForeignKey('mesas.id'), nullable=True)
    atendente_id = Column(Integer, ForeignKey('usuarios.id'), nullable=True)
    nome_cliente = Column(String(200), nullable=True)
    observacoes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship('User', backref='pedidos')
    itens = relationship('PedidoItem', back_populates='pedido', cascade='all, delete-orphan')

    # Quando a tabela tem múltiplas chaves estrangeiras para a mesma tabela pai
    # (ex: user_id e atendente_id referenciando usuarios.id) precisamos
    # desambiguar usando `foreign_keys` para cada relationship.
    # `user` representa o dono/cliente do pedido; `atendente` é o usuário
    # que atendeu o pedido (opcional).
    user = relationship('User', backref='pedidos', foreign_keys=[user_id])
    atendente = relationship('User', backref='atendimentos', foreign_keys=[atendente_id])


class PedidoItem(Base):
    __tablename__ = 'pedido_itens'

    id = Column(Integer, primary_key=True, autoincrement=True)
    pedido_id = Column(Integer, ForeignKey('pedidos.id', ondelete='CASCADE'), nullable=False)
    produto_id = Column(Integer, ForeignKey('produtos.id', ondelete='SET NULL'), nullable=True)
    nome = Column(String(200), nullable=False)
    quantidade = Column(Integer, nullable=False)
    preco_unitario = Column(Numeric(10, 2), nullable=False)
    subtotal = Column(Numeric(10, 2), nullable=False)

    pedido = relationship('Pedido', back_populates='itens')
    produto = relationship('Produto')


# ----------------- Online features -----------------
class Favorito(Base):
    __tablename__ = 'favoritos'
    __table_args__ = (UniqueConstraint('user_id', 'produto_id', name='uix_user_produto_favorito'),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('usuarios.id', ondelete='CASCADE'), nullable=False)
    produto_id = Column(Integer, ForeignKey('produtos.id', ondelete='CASCADE'), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship('User', backref='favoritos')
    produto = relationship('Produto')


class Avaliacao(Base):
    __tablename__ = 'avaliacoes'
    __table_args__ = (UniqueConstraint('user_id', 'produto_id', name='uix_user_produto_avaliacao'),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('usuarios.id', ondelete='CASCADE'), nullable=False)
    produto_id = Column(Integer, ForeignKey('produtos.id', ondelete='CASCADE'), nullable=False)
    rating = Column(Integer, nullable=False)
    comentario = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship('User', backref='avaliacoes')
    produto = relationship('Produto', backref='avaliacoes')


# ----------------- Estoque / Pagamento -----------------
class MovimentacaoEstoque(Base):
    __tablename__ = 'movimentacoes_estoque'

    id = Column(Integer, primary_key=True)
    produto_id = Column(Integer, ForeignKey('produtos.id'), nullable=False)
    tipo = Column(String(20), nullable=False)
    origem = Column(String(20), nullable=False)
    quantidade = Column(Integer, nullable=False)
    quantidade_anterior = Column(Integer, nullable=False)
    quantidade_nova = Column(Integer, nullable=False)
    usuario_id = Column(Integer, ForeignKey('usuarios.id'), nullable=False)
    observacoes = Column(Text, nullable=True)
    pedido_id = Column(Integer, ForeignKey('pedidos.id'), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    produto = relationship('Produto')
    usuario = relationship('User')


class EstoqueReserva(Base):
    __tablename__ = 'estoques_reserva'

    id = Column(Integer, primary_key=True)
    produto_id = Column(Integer, ForeignKey('produtos.id'), nullable=False)
    quantidade = Column(Integer, nullable=False)
    mesa_id = Column(Integer, ForeignKey('mesas.id'), nullable=False)
    usuario_id = Column(Integer, ForeignKey('usuarios.id'), nullable=False)
    status = Column(String(20), default='ativa')
    expira_em = Column(DateTime, nullable=False)
    pedido_id = Column(Integer, ForeignKey('pedidos.id'), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    produto = relationship('Produto')
    mesa = relationship('Mesa')
    usuario = relationship('User')


class Cupom(Base):
    __tablename__ = 'loja_online_cupom'

    id = Column(Integer, primary_key=True, autoincrement=True)
    codigo = Column(String(50), unique=True, nullable=False)
    nome = Column(String(100), nullable=False)
    tipo = Column(String(20), nullable=False)
    valor = Column(Numeric(10, 2), nullable=False)
    valor_minimo = Column(Numeric(10, 2), default=0)
    ativo = Column(Boolean, default=True)
    data_inicio = Column(DateTime, nullable=False)
    data_fim = Column(DateTime, nullable=False)
    uso_maximo = Column(Integer, default=1)
    uso_atual = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    @property
    def is_valid(self):
        now = datetime.now(timezone.utc)
        return (self.ativo and self.data_inicio <= now <= self.data_fim and self.uso_atual < self.uso_maximo)


# ----------------- Carrinho (loja online) -----------------
class Carrinho(Base):
    __tablename__ = 'carrinhos'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('usuarios.id', ondelete='SET NULL'), nullable=True)
    session_id = Column(String(255), nullable=True)  # opcional para carrinhos anônimos
    total = Column(Numeric(10, 2), nullable=False, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship('User', backref='carrinhos')
    itens = relationship('CarrinhoItem', back_populates='carrinho', cascade='all, delete-orphan')


class CarrinhoItem(Base):
    __tablename__ = 'carrinho_items'

    id = Column(Integer, primary_key=True, autoincrement=True)
    carrinho_id = Column(Integer, ForeignKey('carrinhos.id', ondelete='CASCADE'), nullable=False)
    produto_id = Column(Integer, ForeignKey('produtos.id', ondelete='SET NULL'), nullable=True)
    nome = Column(String(200), nullable=False)
    quantidade = Column(Integer, nullable=False, default=1)
    preco_unitario = Column(Numeric(10, 2), nullable=False, default=0)
    subtotal = Column(Numeric(10, 2), nullable=False, default=0)

    carrinho = relationship('Carrinho', back_populates='itens')
    produto = relationship('Produto')


# Calcular subtotal automaticamente para itens do carrinho
def _calc_subtotal_carrinho(mapper, connection, target):
    try:
        target.subtotal = (target.quantidade or 0) * (target.preco_unitario or 0)
    except Exception:
        target.subtotal = 0


event.listen(CarrinhoItem, 'before_insert', _calc_subtotal_carrinho)
event.listen(CarrinhoItem, 'before_update', _calc_subtotal_carrinho)


# ----------------- Pagamento loja física -----------------
class Pagamento(Base):
    __tablename__ = 'pagamentos'

    id = Column(Integer, primary_key=True)
    pedido_id = Column(Integer, ForeignKey('pedidos.id'), unique=True, nullable=False)
    metodo = Column(String(50), nullable=False)
    valor_total = Column(Numeric(10, 2), nullable=False)
    valor_recebido = Column(Numeric(10, 2), nullable=True)
    troco = Column(Numeric(10, 2), default=0)
    desconto = Column(Numeric(10, 2), default=0)
    status = Column(String(20), default='Pendente')
    observacoes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    pedido = relationship('Pedido')


# Listeners de calculo de subtotal para itens
def _calc_subtotal(mapper, connection, target):
    try:
        target.subtotal = (target.quantidade or 0) * (target.preco_unitario or 0)
    except Exception:
        target.subtotal = 0


event.listen(PedidoItem, 'before_insert', _calc_subtotal)
event.listen(PedidoItem, 'before_update', _calc_subtotal)

from backend.logging_config import logger

if __name__ == "__main__":
    # Usar Session importada de database
    # Garantir que todas as tabelas (incluindo usuarios) sejam criadas antes do uso
    Base.metadata.create_all(bind=engine)

    with Session() as session:
        try:
            # Criando um usuário de teste que será enviado para o construtor da classe User em __init__
            novo_usuario = User(
                username="teste",
                email="teste@email.com",
                nome="Usuário Teste",
                password="senha123",
                tipo=UserType.online
            )
            session.add(novo_usuario)
            session.commit()
            logger.info('Usuário criado: %s', novo_usuario)
            
            # Demonstrando diferentes formas de impressão
            logger.info('\nDiferentes formas de impressão do objeto:')
            logger.info('1. Print direto (usa __str__): %s', novo_usuario)
            logger.info('2. Usando str() explícito: %s', str(novo_usuario))
            logger.info('3. Usando repr() explícito: %s', repr(novo_usuario))
            
            # Demonstrando o hash da senha e verificação
            logger.info('\nTestando a senha:')
            logger.info('Senha armazenada (hash): %s', novo_usuario.password)
            senha_teste = 'senha123'
            logger.info("Verificando senha '%s': %s", senha_teste, novo_usuario.check_password(senha_teste))
            senha_errada = 'senha456'
            logger.info("Verificando senha errada '%s': %s", senha_errada, novo_usuario.check_password(senha_errada))

            user = User(username='teste', email='teste@email.com', nome='Test User', password='minhasenha123')
            logger.info('Hash da senha: %s', user.password)
            logger.info('Senha correta?: %s', user.check_password('minhasenha123'))  # True
            logger.info('Senha errada?: %s', user.check_password('senha_errada'))    # False

        except Exception as e:
            session.rollback()
            logger.exception('Erro ao criar usuário: %s', e)