from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional, Dict, Any
from . import models, schemas
from datetime import datetime
import re

# User
def get_user(db: Session, user_id: int) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.email == email).first()

def get_user_by_username(db: Session, username: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.username == username).first()

def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[models.User]:
    return db.query(models.User).offset(skip).limit(limit).all()

def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    db_user = models.User(
        username=user.username,
        email=user.email,
        nome=user.nome,
        tipo=user.tipo
    )
    db_user.set_password(user.password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# Categoria
def get_categoria(db: Session, categoria_id: int) -> Optional[models.Categoria]:
    return db.query(models.Categoria).filter(models.Categoria.id == categoria_id).first()

def get_categorias(db: Session, skip: int = 0, limit: int = 100) -> List[models.Categoria]:
    return db.query(models.Categoria).offset(skip).limit(limit).all()

def create_categoria(db: Session, categoria: schemas.CategoriaCreate) -> models.Categoria:
    db_categoria = models.Categoria(**categoria.dict())
    db.add(db_categoria)
    db.commit()
    db.refresh(db_categoria)
    return db_categoria

# Produto
def get_produto(db: Session, produto_id: int) -> Optional[models.Produto]:
    return db.query(models.Produto).filter(models.Produto.id == produto_id).first()

def get_produto_by_codigo(db: Session, codigo: str) -> Optional[models.Produto]:
    return db.query(models.Produto).filter(models.Produto.codigo == codigo).first()

def get_produtos(db: Session, skip: int = 0, limit: int = 100) -> List[models.Produto]:
    return db.query(models.Produto).offset(skip).limit(limit).all()

def create_produto(db: Session, produto: schemas.ProdutoCreate) -> models.Produto:
    db_produto = models.Produto(**produto.dict())
    db.add(db_produto)
    db.commit()
    db.refresh(db_produto)
    return db_produto

# Empresa
def create_empresa(db: Session, empresa: schemas.EmpresaCreate) -> models.Empresa:
    db_empresa = models.Empresa(**empresa.dict())
    db.add(db_empresa)
    db.commit()
    db.refresh(db_empresa)
    return db_empresa

def get_empresa(db: Session, empresa_id: int) -> Optional[models.Empresa]:
    return db.query(models.Empresa).filter(models.Empresa.id == empresa_id).first()

def get_empresas(db: Session, skip: int = 0, limit: int = 100) -> List[models.Empresa]:
    return db.query(models.Empresa).offset(skip).limit(limit).all()

# Mesa
def create_mesa(db: Session, mesa: schemas.MesaCreate) -> models.Mesa:
    db_mesa = models.Mesa(**mesa.dict())
    db.add(db_mesa)
    db.commit()
    db.refresh(db_mesa)
    return db_mesa

def get_mesa(db: Session, mesa_id: int) -> Optional[models.Mesa]:
    return db.query(models.Mesa).filter(models.Mesa.id == mesa_id).first()

def get_mesa_by_slug(db: Session, slug: str) -> Optional[models.Mesa]:
    return db.query(models.Mesa).filter(models.Mesa.slug == slug).first()

def get_mesas(db: Session, skip: int = 0, limit: int = 100) -> List[models.Mesa]:
    return db.query(models.Mesa).offset(skip).limit(limit).all()

def update_mesa_status(db: Session, mesa_id: int, status: str) -> Optional[models.Mesa]:
    db_mesa = db.query(models.Mesa).filter(models.Mesa.id == mesa_id).first()
    if db_mesa:
        db_mesa.status = status
        db.commit()
        db.refresh(db_mesa)
    return db_mesa

# Pedido
def create_pedido(db: Session, pedido: schemas.PedidoCreate, usuario_id: int) -> models.Pedido:
    # Gerar número do pedido (sequencial)
    def _get_next_sequential_numero() -> str:
        """Calcula o próximo número sequencial a partir dos pedidos já existentes.

        Estratégia: busca todos os valores de `numero` em pedidos, extrai a primeira
        sequência de dígitos encontrada e considera o maior. Retorna max+1, com
        zero-pad mínimo de 2 dígitos.
        """
        max_num = 0
        try:
            rows = db.query(models.Pedido.numero).all()
            for row in rows:
                # row pode ser tuple com um elemento (numero,)
                raw = row[0] if isinstance(row, (list, tuple)) and len(row) > 0 else row
                if not raw:
                    continue
                s = str(raw)
                m = re.search(r"(\d+)", s)
                if m:
                    try:
                        v = int(m.group(1))
                        if v > max_num:
                            max_num = v
                    except Exception:
                        continue
        except Exception:
            # Em caso de erro, fallback para 0 e prossegue
            max_num = 0
        next_num = max_num + 1
        return str(next_num).zfill(2)

    numero = _get_next_sequential_numero()
    
    # Criar pedido
    db_pedido = models.Pedido(
        numero=numero,
        tipo=pedido.tipo,
        status=getattr(pedido, 'status', 'Pendente'),
        observacoes=pedido.observacoes,
        mesa_id=pedido.mesa_id,
        user_id=usuario_id,
        total=0
    )
    db.add(db_pedido)
    db.flush()  # Obter ID do pedido

    # Adicionar itens
    total = 0
    for item in pedido.itens:
        produto = db.query(models.Produto).filter(models.Produto.id == item["produto_id"]).first()
        if produto:
            pedido_item = models.PedidoItem(
                pedido_id=db_pedido.id,
                produto_id=produto.id,
                nome=produto.nome,
                quantidade=item["quantidade"],
                preco_unitario=produto.preco_venda
            )
            db.add(pedido_item)
            total += pedido_item.subtotal

    db_pedido.total = total
    db.commit()
    db.refresh(db_pedido)
    return db_pedido

def get_pedido(db: Session, pedido_id: int) -> Optional[models.Pedido]:
    return db.query(models.Pedido).filter(models.Pedido.id == pedido_id).first()

def get_pedidos(
    db: Session, 
    skip: int = 0, 
    limit: int = 100, 
    tipo: Optional[str] = None
) -> List[models.Pedido]:
    query = db.query(models.Pedido)
    if tipo:
        query = query.filter(models.Pedido.tipo == tipo)
    return query.offset(skip).limit(limit).all()

def get_pedido_pendente_por_mesa(db: Session, mesa_id: int) -> Optional[models.Pedido]:
    return db.query(models.Pedido).filter(
        models.Pedido.mesa_id == mesa_id,
        models.Pedido.status == "Pendente"
    ).first()


def add_item_to_pedido(
    db: Session,
    mesa_id: int,
    produto_id: int,
    quantidade: int,
    usuario_id: Optional[int] = None,
    preco_unitario: Optional[float] = None,
    numero_sugerido: Optional[str] = None
) -> models.Pedido:
    """Adiciona um item ao pedido Pendente da mesa (ou cria um novo pedido Pendente)."""
    # Obter pedido Pendente ou criar um
    pedido = get_pedido_pendente_por_mesa(db, mesa_id)
    if pedido is None:
        # Criar pedido simples Pendente
        # Número sequencial (reusar lógica semelhante a create_pedido)
        def _get_next_sequential_numero_local() -> str:
            max_num = 0
            try:
                rows = db.query(models.Pedido.numero).all()
                for row in rows:
                    raw = row[0] if isinstance(row, (list, tuple)) and len(row) > 0 else row
                    if not raw:
                        continue
                    s = str(raw)
                    m = re.search(r"(\d+)", s)
                    if m:
                        try:
                            v = int(m.group(1))
                            if v > max_num:
                                max_num = v
                        except Exception:
                            continue
            except Exception:
                max_num = 0
            return str(max_num + 1).zfill(2)

        numero = numero_sugerido or _get_next_sequential_numero_local()
        pedido = models.Pedido(
            numero=numero,
            tipo='fisica',
            status='Pendente',
            observacoes=None,
            mesa_id=mesa_id,
            user_id=usuario_id if usuario_id else 1,
            total=0
        )
        db.add(pedido)
        db.flush()

        # Atualizar o status da mesa para 'Ocupada' e atribuir usuario_responsavel_id se fornecido
        db_mesa = db.query(models.Mesa).filter(models.Mesa.id == mesa_id).first()
        if db_mesa:
            try:
                if db_mesa.status != 'Ocupada':
                    db_mesa.status = 'Ocupada'
                if usuario_id is not None:
                    db_mesa.usuario_responsavel_id = usuario_id
                db.add(db_mesa)
            except Exception:
                # Não bloquear a criação do pedido se houver algum problema ao atualizar a mesa
                pass

    # Obter produto
    produto = db.query(models.Produto).filter(models.Produto.id == produto_id).first()
    if not produto:
        raise Exception(f"Produto {produto_id} não encontrado")

    preco = preco_unitario if preco_unitario is not None else float(produto.preco_venda)

    pedido_item = models.PedidoItem(
        pedido_id=pedido.id,
        produto_id=produto.id,
        nome=produto.nome,
        quantidade=quantidade,
        preco_unitario=preco
    )
    db.add(pedido_item)
    db.flush()

    # Recalcular total
    total = 0
    for it in db.query(models.PedidoItem).filter(models.PedidoItem.pedido_id == pedido.id).all():
        total += float(it.subtotal or 0)
    pedido.total = total
    db.add(pedido)
    db.commit()
    db.refresh(pedido)
    return pedido


def remove_item_from_pedido(db: Session, item_id: int) -> Optional[models.Pedido]:
    """Remove um item de pedido e atualiza o total do pedido associado."""
    item = db.query(models.PedidoItem).filter(models.PedidoItem.id == item_id).first()
    if not item:
        return None
    pedido = db.query(models.Pedido).filter(models.Pedido.id == item.pedido_id).first()
    db.delete(item)
    db.commit()

    if pedido:
        total = 0
        for it in db.query(models.PedidoItem).filter(models.PedidoItem.pedido_id == pedido.id).all():
            total += float(it.subtotal or 0)
        pedido.total = total
        db.add(pedido)
        db.commit()
        db.refresh(pedido)
    return pedido


def cancel_pedido_por_mesa(db: Session, mesa_id: int, usuario_id: Optional[int] = None) -> bool:
    """Cancela o pedido Pendente associado a uma mesa.

    Operações realizadas de forma transacional:
    - Localiza o pedido Pendente da mesa
    - Para cada item: restaura o estoque do produto e registra uma MovimentacaoEstoque do tipo 'entrada'
    - Remove o pedido (itens em cascade)
    - Atualiza o status da mesa para 'Livre' e limpa usuario_responsavel_id
    Retorna True se um pedido foi cancelado, False se não havia pedido.
    """
    pedido = db.query(models.Pedido).filter(models.Pedido.mesa_id == mesa_id, models.Pedido.status == 'Pendente').first()
    if not pedido:
        return False

    # Para cada item, restaurar o estoque e criar movimentação
    for it in list(pedido.itens):
        try:
            # bloquear a linha do produto para evitar races
            db_produto = db.query(models.Produto).filter(models.Produto.id == it.produto_id).with_for_update().first()
            if db_produto:
                quantidade_anterior = int(db_produto.estoque or 0)
                quantidade_nova = quantidade_anterior + int(it.quantidade or 0)
                db_produto.estoque = quantidade_nova
                db.add(db_produto)

                mov = models.MovimentacaoEstoque(
                    produto_id=it.produto_id,
                    tipo='entrada',
                    origem='cancelamento_pedido',
                    quantidade=int(it.quantidade or 0),
                    quantidade_anterior=quantidade_anterior,
                    quantidade_nova=quantidade_nova,
                    usuario_id=usuario_id or 1,
                    observacoes=f'Cancelamento do pedido {pedido.id}',
                    pedido_id=pedido.id
                )
                db.add(mov)
        except Exception:
            # continuar com outros itens mesmo se houver problema em um
            continue

    # Atualizar mesa associada
    try:
        db_mesa = db.query(models.Mesa).filter(models.Mesa.id == mesa_id).first()
        if db_mesa:
            db_mesa.status = 'Livre'
            db_mesa.usuario_responsavel_id = None
            db.add(db_mesa)
    except Exception:
        pass

    # Por fim, remover o pedido (itens são cascade)
    try:
        db.delete(pedido)
        db.commit()
    except Exception:
        db.rollback()
        raise

    return True

# Movimentação de Estoque
def create_movimentacao_estoque(
    db: Session,
    produto_id: int,
    quantidade: int,
    tipo: str,
    origem: str,
    observacoes: Optional[str] = None,
    usuario_id: Optional[int] = None
) -> models.MovimentacaoEstoque:
    # Buscar produto e determinar estoque anterior/novo
    db_produto = db.query(models.Produto).filter(models.Produto.id == produto_id).with_for_update().first()
    if db_produto is None:
        raise Exception(f"Produto {produto_id} não encontrado")

    quantidade_anterior = int(db_produto.estoque or 0)

    if tipo == 'entrada':
        quantidade_nova = quantidade_anterior + int(quantidade)
    elif tipo == 'saida':
        # Não permitir estoque negativo
        quantidade_nova = max(0, quantidade_anterior - int(quantidade))
    else:
        # Se tipo desconhecido, apenas aplica incremento positivo
        try:
            quantidade_nova = quantidade_anterior + int(quantidade)
        except Exception:
            quantidade_nova = quantidade_anterior

    # Atualizar estoque do produto
    db_produto.estoque = quantidade_nova
    db.add(db_produto)

    # Criar movimentação com valores anteriores/novos preenchidos
    db_mov = models.MovimentacaoEstoque(
        produto_id=produto_id,
        quantidade=quantidade,
        quantidade_anterior=quantidade_anterior,
        quantidade_nova=quantidade_nova,
        tipo=tipo,
        origem=origem,
        observacoes=observacoes,
        usuario_id=usuario_id
    )
    db.add(db_mov)
    db.commit()
    db.refresh(db_mov)
    return db_mov

# Avaliação
def create_avaliacao(
    db: Session,
    usuario_id: int,
    produto_id: int,
    rating: int,
    comentario: Optional[str] = None
) -> models.Avaliacao:
    db_aval = models.Avaliacao(
        user_id=usuario_id,
        produto_id=produto_id,
        rating=rating,
        comentario=comentario
    )
    db.add(db_aval)
    db.commit()
    db.refresh(db_aval)
    return db_aval

def get_avaliacoes_produto(db: Session, produto_id: int) -> List[models.Avaliacao]:
    return db.query(models.Avaliacao).filter(models.Avaliacao.produto_id == produto_id).all()

# Favorito
def create_favorito(db: Session, usuario_id: int, produto_id: int) -> models.Favorito:
    # Retorna favorito existente se já existir, para evitar IntegrityError
    existing = db.query(models.Favorito).filter(
        models.Favorito.user_id == usuario_id,
        models.Favorito.produto_id == produto_id
    ).first()
    if existing:
        return existing

    # Note: model column is `user_id` (not `usuario_id`) so map accordingly
    db_fav = models.Favorito(user_id=usuario_id, produto_id=produto_id)
    db.add(db_fav)
    db.commit()
    db.refresh(db_fav)
    return db_fav

def get_favoritos_usuario(db: Session, usuario_id: int) -> List[models.Favorito]:
    return db.query(models.Favorito).filter(models.Favorito.user_id == usuario_id).all()

def remove_favorito(db: Session, usuario_id: int, produto_id: int) -> bool:
    db_fav = db.query(models.Favorito).filter(
        models.Favorito.user_id == usuario_id,
        models.Favorito.produto_id == produto_id
    ).first()
    if db_fav:
        db.delete(db_fav)
        db.commit()
        return True
    return False

# Pagamento
def create_pagamento(
    db: Session,
    pedido_id: int,
    valor: float,
    forma_pagamento: str,
    status: str = "Pendente"
) -> models.Pagamento:
    db_pag = models.Pagamento(
        pedido_id=pedido_id,
        valor_total=valor,
        metodo=forma_pagamento,
        status=status
    )
    db.add(db_pag)
    db.commit()
    db.refresh(db_pag)
    return db_pag


# ----------------- Carrinho (loja online) -----------------
def get_cart_by_user(db: Session, user_id: int):
    return db.query(models.Carrinho).filter(models.Carrinho.user_id == user_id).first()


def get_cart_by_id(db: Session, cart_id: int):
    return db.query(models.Carrinho).filter(models.Carrinho.id == cart_id).first()


def create_cart(db: Session, user_id: int = None, session_id: str = None) -> models.Carrinho:
    cart = models.Carrinho(user_id=user_id, session_id=session_id, total=0)
    db.add(cart)
    db.commit()
    db.refresh(cart)
    return cart


def _recalc_cart_total(db: Session, cart: models.Carrinho):
    total = 0
    for it in cart.itens:
        try:
            total += float(it.subtotal or 0)
        except Exception:
            continue
    cart.total = total
    db.add(cart)
    db.commit()
    db.refresh(cart)
    return cart


def add_item_to_cart(db: Session, user_id: int = None, produto_id: int = None, quantidade: int = 1, preco_unitario: float = None, session_id: str = None) -> models.Carrinho:
    # localizar/usar carrinho do usuário ou criar
    cart = None
    if user_id:
        cart = get_cart_by_user(db, user_id)
    if not cart and session_id:
        cart = db.query(models.Carrinho).filter(models.Carrinho.session_id == session_id).first()
    if not cart:
        cart = create_cart(db, user_id=user_id, session_id=session_id)

    # localizar produto (opcionalmente aceitar nome/preco fornecido)
    produto = None
    if produto_id:
        produto = db.query(models.Produto).filter(models.Produto.id == produto_id).first()

    # se já existir item para mesmo produto no carrinho, incrementar quantidade
    existing = None
    if produto_id:
        existing = db.query(models.CarrinhoItem).filter(models.CarrinhoItem.carrinho_id == cart.id, models.CarrinhoItem.produto_id == produto_id).first()

    if existing:
        existing.quantidade = int(existing.quantidade or 0) + int(quantidade or 0)
        # se foi fornecido preco_unitario, atualizar
        if preco_unitario is not None:
            existing.preco_unitario = preco_unitario
        db.add(existing)
        db.commit()
    else:
        nome = produto.nome if produto else f'Produto {produto_id or ""}'
        preco = preco_unitario if preco_unitario is not None else (float(produto.venda) if produto and getattr(produto, 'venda', None) is not None else 0)
        item = models.CarrinhoItem(
            carrinho_id=cart.id,
            produto_id=produto.id if produto else produto_id,
            nome=nome,
            quantidade=int(quantidade or 0),
            preco_unitario=preco
        )
        db.add(item)
        db.commit()

    # recalc total
    db.refresh(cart)
    cart = _recalc_cart_total(db, cart)
    return cart


def update_cart_item_quantity(db: Session, item_id: int, quantidade: int) -> models.Carrinho:
    item = db.query(models.CarrinhoItem).filter(models.CarrinhoItem.id == item_id).first()
    if not item:
        raise Exception('Item não encontrado')
    item.quantidade = int(quantidade)
    db.add(item)
    db.commit()
    cart = db.query(models.Carrinho).filter(models.Carrinho.id == item.carrinho_id).first()
    cart = _recalc_cart_total(db, cart)
    return cart


def remove_item_from_cart(db: Session, item_id: int) -> models.Carrinho:
    item = db.query(models.CarrinhoItem).filter(models.CarrinhoItem.id == item_id).first()
    if not item:
        return None
    cart = db.query(models.Carrinho).filter(models.Carrinho.id == item.carrinho_id).first()
    db.delete(item)
    db.commit()
    if cart:
        cart = _recalc_cart_total(db, cart)
    return cart


def clear_cart(db: Session, cart_id: int) -> bool:
    cart = get_cart_by_id(db, cart_id)
    if not cart:
        return False
    # remover todos os itens
    for it in list(cart.itens):
        try:
            db.delete(it)
        except Exception:
            continue
    cart.total = 0
    db.add(cart)
    db.commit()
    return True