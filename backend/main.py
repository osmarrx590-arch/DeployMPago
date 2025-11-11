from fastapi import FastAPI, Depends, HTTPException, Request
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import EmailStr
from sqlalchemy.orm import Session
import datetime
import os
import jwt

from . import models, crud, schemas
from .database import engine, get_db

app = FastAPI(title='Choperia Backend API (refatorado)')
from backend.logging_config import logger

# Configurar CORS de forma dinâmica a partir da variável de ambiente
# ALLOWED_ORIGINS — se não definida, usa valores padrão para desenvolvimento.
allowed = os.environ.get('ALLOWED_ORIGINS')
if allowed:
    try:
        allow_origins = [u.strip() for u in allowed.split(',') if u.strip()]
    except Exception:
        # fallback para valores seguros se parsing falhar
        allow_origins = ["http://localhost:8080", "http://192.168.1.112:8080"]
else:
    allow_origins = ["http://localhost:8080", "http://192.168.1.112:8080"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Garantir criação das tabelas dos modelos registrados quando a app iniciar.
"""
Evento de startup do FastAPI para criar tabelas no banco de dados.
# Ao executar o comando: (venv) PS D:/OsmarSoftware/happy-hops-home> python -m uvicorn backend.app:app --reload --port 8000
"""
# Importar os módulos de modelo aqui (ou quaisquer outros que definam classes
# que precisem criar suas tabelas) antes de chamar create_all.
@app.on_event("startup")
def startup_event():
    # Importar modelos para garantir que as classes estão registradas na
    # metadata compartilhada antes de chamar create_all.
    try:
        from backend import models  # noqa: F401 (import for side-effects)
    except Exception as e:
        logger.warning(f"Aviso: falha ao importar backend.models no startup: {e}")

    # Agora criar todas as tabelas registradas na metadata compartilhada
    try:
        # Usar o engine já importado no módulo para garantir criação de tabelas.
        models.Base.metadata.create_all(bind=engine)
        logger.info("Tabelas do banco verificadas/criadas (startup)")
    except Exception as e:
        logger.exception(f"Erro ao criar/verificar tabelas no startup: {e}")

    # Popular o banco automaticamente (idempotente)
    try:
        from backend.populate_db_sqlalchemy import main as populate_main
        populate_main()
        logger.info("Banco populado automaticamente (startup)")
    except Exception as e:
        logger.exception(f"Erro ao popular o banco no startup: {e}")


@app.get('/ping')
def ping():
    return {'status': 'ok'}


@app.get('/health')
def health():
    """Compatibilidade com checadores externos que requisitam /health."""
    return {'status': 'ok'}


# ----- Users -----
@app.post('/users/', response_model=schemas.UserOut)
def api_create_user(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = crud.get_user_by_username(db, payload.username)
    if existing:
        raise HTTPException(status_code=400, detail='username already exists')
    u = crud.create_user(db, payload)
    return schemas.UserOut(id=u.id, username=u.username, email=u.email, nome=u.nome, tipo=u.tipo.value if hasattr(u.tipo, 'value') else str(u.tipo))


@app.get('/users/{username}', response_model=schemas.UserOut)
def api_get_user(username: str, db: Session = Depends(get_db)):
    u = crud.get_user_by_username(db, username)
    if not u:
        raise HTTPException(status_code=404, detail='Usuário não encontrado')
    return schemas.UserOut(id=u.id, username=u.username, email=u.email, nome=u.nome, tipo=u.tipo.value if hasattr(u.tipo, 'value') else str(u.tipo))


@app.delete('/users/{username}')
def api_delete_user(username: str, db: Session = Depends(get_db)):
    u = crud.get_user_by_username(db, username)
    if not u:
        raise HTTPException(status_code=404, detail='Usuário não encontrado')
    db.delete(u)
    db.commit()
    return {'deleted': True}


# ----- Auth (simplified) -----
@app.post('/auth/login')
def api_login(payload: dict, db: Session = Depends(get_db)):
    email = payload.get('email')
    password = payload.get('password')
    if not email or not password:
        raise HTTPException(status_code=400, detail='email e password são obrigatórios')
    user = crud.get_user_by_email(db, email)
    if not user or not user.check_password(password):
        raise HTTPException(status_code=401, detail='Credenciais inválidas')
    secret = os.environ.get('JWT_SECRET', 'devsecret')
    exp_minutes = int(os.environ.get('JWT_EXP_MINUTES', '1440'))
    payload_jwt = {'sub': str(user.id), 'email': user.email, 'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=exp_minutes)}
    token = jwt.encode(payload_jwt, secret, algorithm='HS256')
    resp = JSONResponse(content={'id': user.id, 'username': user.username, 'email': user.email, 'nome': user.nome, 'tipo': user.tipo.value if hasattr(user.tipo, 'value') else str(user.tipo)})
    resp.set_cookie(key='access_token', value=token, httponly=True, samesite='lax', max_age=exp_minutes * 60)
    return resp


@app.post('/auth/register')
def api_register(payload: dict, db: Session = Depends(get_db)):
    nome = payload.get('nome')
    email = payload.get('email')
    password = payload.get('password')
    tipo = payload.get('tipo', 'online')
    if not nome or not email or not password:
        raise HTTPException(status_code=400, detail='nome, email e password são obrigatórios')
    existing = crud.get_user_by_email(db, email)
    if existing:
        raise HTTPException(status_code=400, detail='Email já cadastrado')
    username = email.split('@')[0]
    user_in = schemas.UserCreate(username=username, email=email, nome=nome, password=password, tipo=tipo)
    u = crud.create_user(db, user_in)
    # gerar token
    secret = os.environ.get('JWT_SECRET', 'devsecret')
    exp_minutes = int(os.environ.get('JWT_EXP_MINUTES', '1440'))
    payload_jwt = {'sub': str(u.id), 'email': u.email, 'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=exp_minutes)}
    token = jwt.encode(payload_jwt, secret, algorithm='HS256')
    resp = JSONResponse(content={'id': u.id, 'username': u.username, 'email': u.email, 'nome': u.nome, 'tipo': u.tipo.value if hasattr(u.tipo, 'value') else str(u.tipo)})
    resp.set_cookie(key='access_token', value=token, httponly=True, samesite='lax', max_age=exp_minutes * 60)
    return resp


# Endpoint para retornar informações do usuário autenticado
@app.get('/auth/me')
def api_me(request: Request, db: Session = Depends(get_db)):
    """Retorna os dados do usuário autenticado.

    Busca o token JWT no cookie 'access_token' ou no header Authorization Bearer.
    Se válido, decodifica e busca o usuário no banco retornando os campos básicos.
    """
    # tentar cookie primeiro
    token = request.cookies.get('access_token')
    # se não houver cookie, tentar header Authorization: Bearer <token>
    if not token:
        auth = request.headers.get('Authorization') or ''
        if auth.lower().startswith('bearer '):
            token = auth.split(' ', 1)[1]

    if not token:
        # Sem token -> não autenticado
        raise HTTPException(status_code=401, detail='Token ausente')

    secret = os.environ.get('JWT_SECRET', 'devsecret')
    try:
        payload_jwt = jwt.decode(token, secret, algorithms=['HS256'])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail='Token expirado')
    except Exception:
        raise HTTPException(status_code=401, detail='Token inválido')

    user_id = payload_jwt.get('sub')
    if not user_id:
        raise HTTPException(status_code=401, detail='Payload inválido')

    # buscar usuário no banco
    try:
        u = db.query(models.User).get(int(user_id))
    except Exception:
        u = None

    if not u:
        raise HTTPException(status_code=404, detail='Usuário não encontrado')

    return {
        'id': u.id,
        'username': u.username,
        'email': u.email,
        'nome': u.nome,
        'tipo': u.tipo.value if hasattr(u.tipo, 'value') else str(u.tipo),
    }


@app.get('/auth')
def api_auth_root(request: Request, db: Session = Depends(get_db)):
    """Rota compatível com GET /auth usada por alguns frontends.

    Se houver token válido retorna os dados do usuário (mesmo comportamento de /auth/me).
    Caso contrário retorna um objeto com informação básica e endpoints disponíveis.
    """
    token = request.cookies.get('access_token')
    if not token:
        auth = request.headers.get('Authorization') or ''
        if auth.lower().startswith('bearer '):
            token = auth.split(' ', 1)[1]

    if token:
        secret = os.environ.get('JWT_SECRET', 'devsecret')
        try:
            payload_jwt = jwt.decode(token, secret, algorithms=['HS256'])
            user_id = payload_jwt.get('sub')
            u = None
            try:
                u = db.query(models.User).get(int(user_id))
            except Exception:
                u = None
            if u:
                return {
                    'id': u.id,
                    'username': u.username,
                    'email': u.email,
                    'nome': u.nome,
                    'tipo': u.tipo.value if hasattr(u.tipo, 'value') else str(u.tipo),
                }
        except Exception:
            # token inválido/expirado -> continuará para retornar a lista de endpoints
            pass

    # sem token válido: retornar meta informação para o frontend
    return {
        'authenticated': False,
        'endpoints': {
            'login': '/auth/login',
            'register': '/auth/register',
            'me': '/auth/me',
        },
    }


@app.post('/auth/logout')
def api_logout():
    """Endpoint para logout: limpa o cookie 'access_token' do cliente.

    Retorna JSON {'ok': True} e instrui o browser a remover o cookie.
    """
    try:
        resp = JSONResponse({'ok': True, 'message': 'Logout realizado'})
        # Remover cookie de forma explícita
        resp.delete_cookie('access_token', path='/')
        return resp
    except Exception as e:
        logger.exception(f'Erro ao efetuar logout: {e}')
        raise HTTPException(status_code=400, detail=str(e))


# ----- Produtos / Categorias / Empresas -----
@app.post('/categorias/', response_model=schemas.CategoriaOut)
def api_create_categoria(payload: schemas.CategoriaCreate, db: Session = Depends(get_db)):
    c = crud.create_categoria(db, payload)
    return c


@app.get('/categorias/', response_model=List[schemas.CategoriaOut])
def api_list_categorias(db: Session = Depends(get_db)):
    return crud.list_categorias(db)


@app.post('/empresas/', response_model=schemas.EmpresaOut)
def api_create_empresa(payload: schemas.EmpresaCreate, db: Session = Depends(get_db)):
    e = crud.create_empresa(db, payload)
    return e


@app.get('/empresas/', response_model=List[schemas.EmpresaOut])
def api_list_empresas(db: Session = Depends(get_db)):
    return crud.list_empresas(db)


@app.post('/produtos/', response_model=schemas.ProdutoOut)
def api_create_produto(payload: schemas.ProdutoCreate, db: Session = Depends(get_db)):
    p = crud.create_produto(db, payload)
    return p


@app.get('/produtos/', response_model=List[schemas.ProdutoOut])
def api_list_produtos(limit: int = 100, db: Session = Depends(get_db)):
    # usar a função existente em crud
    return crud.get_produtos(db, limit=limit)


# ----- Mesas / Pedidos -----
@app.post('/mesas/', response_model=schemas.MesaOut)
def api_create_mesa(payload: schemas.MesaCreate, db: Session = Depends(get_db)):
    m = crud.create_mesa(db, payload)
    return m


@app.get('/mesas/', response_model=List[schemas.MesaOut])
def api_list_mesas(db: Session = Depends(get_db)):
    return crud.get_mesas(db)


# Recuperar mesa por ID (inclui pedido pendente e itens)
@app.get('/mesas/{mesa_id}', response_model=schemas.MesaOut)
def api_get_mesa(mesa_id: int, db: Session = Depends(get_db)):
    m = crud.get_mesa(db, mesa_id)
    if not m:
        raise HTTPException(status_code=404, detail='Mesa não encontrada')

    pedido = crud.get_pedido_pendente_por_mesa(db, mesa_id)
    itens = []
    pedido_id = 0
    statusPedido = None
    if pedido:
        pedido_id = pedido.id
        statusPedido = pedido.status
        for it in pedido.itens:
            itens.append({
                'id': it.id,
                'produto_id': it.produto_id,
                'nome': it.nome,
                'quantidade': it.quantidade,
                'preco_unitario': float(it.preco_unitario) if it.preco_unitario is not None else None,
                'subtotal': float(it.subtotal) if it.subtotal is not None else None,
            })

    return {
        'id': m.id,
        'nome': m.nome,
        'slug': m.slug,
        'status': m.status,
        'pedido': pedido_id,
        'itens': itens,
        'statusPedido': statusPedido,
        'capacidade': m.capacidade,
        'usuario_responsavel_id': m.usuario_responsavel_id,
        'observacoes': m.observacoes,
    }


# Recuperar mesa por slug
@app.get('/mesas/slug/{slug}', response_model=schemas.MesaOut)
def api_get_mesa_by_slug(slug: str, db: Session = Depends(get_db)):
    m = crud.get_mesa_by_slug(db, slug)
    if not m:
        raise HTTPException(status_code=404, detail='Mesa não encontrada')

    pedido = crud.get_pedido_pendente_por_mesa(db, m.id)
    itens = []
    pedido_id = 0
    statusPedido = None
    if pedido:
        pedido_id = pedido.id
        statusPedido = pedido.status
        for it in pedido.itens:
            itens.append({
                'id': it.id,
                'produto_id': it.produto_id,
                'nome': it.nome,
                'quantidade': it.quantidade,
                'preco_unitario': float(it.preco_unitario) if it.preco_unitario is not None else None,
                'subtotal': float(it.subtotal) if it.subtotal is not None else None,
            })

    return {
        'id': m.id,
        'nome': m.nome,
        'slug': m.slug,
        'status': m.status,
        'pedido': pedido_id,
        'itens': itens,
        'statusPedido': statusPedido,
        'capacidade': m.capacidade,
        'usuario_responsavel_id': m.usuario_responsavel_id,
        'observacoes': m.observacoes,
    }


# Adicionar item à mesa via API (endpoint usado pelo frontend)
@app.post('/mesas/{mesa_id}/itens')
def api_add_item_to_mesa(mesa_id: int, payload: dict, db: Session = Depends(get_db)):
    try:
        # Log payload for easier debugging
        logger.info(f"[api_add_item_to_mesa] payload received for mesa {mesa_id}: {payload}")

        # Validate required fields
        if not payload or payload.get('produto_id') is None or payload.get('quantidade') is None:
            raise HTTPException(status_code=400, detail='produto_id e quantidade são obrigatórios no body')

        try:
            produto_id = int(payload.get('produto_id'))
            quantidade = int(payload.get('quantidade'))
        except Exception:
            raise HTTPException(status_code=400, detail='produto_id e quantidade devem ser numéricos')

        usuario_id = int(payload.get('usuario_id')) if payload.get('usuario_id') else None
        # aceitar campo 'venda' enviado pelo frontend; manter compatibilidade com 'precoUnitario'
        if payload.get('venda') is not None:
            preco_unitario = payload.get('venda')
        else:
            preco_unitario = payload.get('precoUnitario') if payload.get('precoUnitario') is not None else None
        numero_sugerido = payload.get('numero') if payload.get('numero') is not None else None

        pedido = crud.add_item_to_pedido(db, mesa_id, produto_id, quantidade, usuario_id, preco_unitario, numero_sugerido)

        # construir resposta simplificada contendo pedido id e mesa atualizada
        itens = []
        for it in pedido.itens:
            itens.append({
                'id': it.id,
                'produto_id': it.produto_id,
                'nome': it.nome,
                'quantidade': it.quantidade,
                'preco_unitario': float(it.preco_unitario) if it.preco_unitario is not None else None,
                'subtotal': float(it.subtotal) if it.subtotal is not None else None,
            })

        mesa = crud.get_mesa(db, mesa_id)

        return {
            'pedido': pedido.id,
            'mesa': {
                'id': mesa.id,
                'nome': mesa.nome,
                'slug': mesa.slug,
                'status': mesa.status,
                'pedido': pedido.id,
                'itens': itens,
            }
        }
    except HTTPException:
        # re-raise HTTPExceptions (validation) unchanged
        raise
    except Exception as e:
        # Log full exception for easier debugging on server
        logger.exception(f"[api_add_item_to_mesa] erro ao adicionar item na mesa {mesa_id}: {e}")
        # Return a 400 with the error message for the frontend
        raise HTTPException(status_code=400, detail=str(e))


# Remover item da mesa
@app.delete('/mesas/{mesa_id}/itens/{item_id}')
def api_remove_item_from_mesa(mesa_id: int, item_id: int, db: Session = Depends(get_db)):
    pedido = crud.remove_item_from_pedido(db, item_id)
    if not pedido:
        raise HTTPException(status_code=404, detail='Item não encontrado')
    return {'ok': True}


# Cancelar pedido da mesa (restaura estoque e remove pedido pendente)
@app.post('/pedidos/{mesa_id}/cancelar')
def api_cancelar_pedido_por_mesa(mesa_id: int, db: Session = Depends(get_db)):
    try:
        canceled = crud.cancel_pedido_por_mesa(db, mesa_id)
        if not canceled:
            # Não havia pedido pendente para essa mesa
            raise HTTPException(status_code=404, detail='Pedido pendente não encontrado para a mesa')
        return {'ok': True}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Erro ao cancelar pedido da mesa {mesa_id}: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# Movimentações de estoque (entrada/saída) — usado para decrementar/restaurar estoque
@app.post('/estoque/movimentacoes')
def api_create_movimentacao(payload: dict, db: Session = Depends(get_db)):
    try:
        produto_id = int(payload.get('produto_id'))
        quantidade = int(payload.get('quantidade'))
        tipo = payload.get('tipo') or 'saida'
        origem = payload.get('origem') or 'venda_fisica'
        observacoes = payload.get('observacoes')
        usuario_id = int(payload.get('usuario_id')) if payload.get('usuario_id') else 1

        mov = crud.create_movimentacao_estoque(db, produto_id, quantidade, tipo, origem, observacoes, usuario_id)
        return {
            'id': mov.id,
            'produto_id': mov.produto_id,
            'tipo': mov.tipo,
            'origem': mov.origem,
            'quantidade': mov.quantidade,
            'quantidade_anterior': mov.quantidade_anterior,
            'quantidade_nova': mov.quantidade_nova,
            'usuario_id': mov.usuario_id,
            'observacoes': mov.observacoes,
            'pedido_id': mov.pedido_id
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get('/pedidos/', response_model=List[schemas.PedidoOut])
def api_list_pedidos(limit: int = 100, tipo: Optional[str] = None, db: Session = Depends(get_db)):
    """Lista pedidos; endpoint GET esperado pelo frontend."""
    try:
        return crud.get_pedidos(db, limit=limit, tipo=tipo)
    except Exception as e:
        logger.exception(f"Erro ao listar pedidos: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.post('/pedidos/', response_model=schemas.PedidoOut)
def api_create_pedido(payload: dict, db: Session = Depends(get_db)):
    """Cria pedido aceitando o formato enviado pelo frontend.

    O frontend envia itens com campos como `id` e `venda`.
    Aqui normalizamos para o schema esperado (produto_id, preco_unitario).
    """
    try:
        itens_in = []
        for it in payload.get('itens', []) or []:
            produto_id = it.get('produto_id') if it.get('produto_id') is not None else it.get('id')
            preco_unitario = it.get('preco_unitario') if it.get('preco_unitario') is not None else it.get('venda') if it.get('venda') is not None else it.get('preco')
            itens_in.append({
                'produto_id': produto_id,
                'nome': it.get('nome') or '',
                'quantidade': int(it.get('quantidade') or 0),
                'preco_unitario': preco_unitario
            })

        pedido_in = schemas.PedidoCreate(
            tipo=payload.get('tipo') or payload.get('metodoPagamento') or 'online',
            user_id=payload.get('user_id') or payload.get('userId') or None,
            numero=payload.get('numero') or payload.get('numeroPedido') or None,
            metodo_pagamento=payload.get('metodoPagamento') or payload.get('metodo_pagamento'),
            itens=[schemas.PedidoItemCreate(**it) for it in itens_in],
            nome_cliente=payload.get('nome') or payload.get('nome_cliente'),
            mesa_id=payload.get('mesa_id') if payload.get('mesa_id') else None,
            observacoes=payload.get('observacoes') or ''
        )

        usuario_id = payload.get('user_id') or payload.get('userId') or 1
        p = crud.create_pedido(db, pedido_in, usuario_id)
        return p
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Erro criando pedido: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.post('/pedidos/{pedido_id}/itens', response_model=schemas.PedidoItemOut)
def api_add_item(pedido_id: int, payload: schemas.PedidoItemCreate, db: Session = Depends(get_db)):
    try:
        item = crud.add_item_to_pedido(db, pedido_id, payload)
        return item
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post('/mesas/{mesa_id}/pagamento')
def api_processar_pagamento(mesa_id: int, payload: dict, db: Session = Depends(get_db)):
    """Processa o pagamento de um pedido Pendente associado à mesa.

    - Localiza o pedido pendente da mesa
    - Aplica decremento de estoque (registrando movimentações) para cada item
    - Cria um registro de Pagamento
    - Marca o pedido como 'Entregue' e atualiza total
    - Retorna a mesa atualizada (sem pedido pendente)
    """
    try:
        metodo = payload.get('metodo') or payload.get('metodoPagamento') or payload.get('metodo_pagamento')
        total = payload.get('total')
        usuario_id = payload.get('usuario_id') if payload.get('usuario_id') is not None else 1

        pedido = crud.get_pedido_pendente_por_mesa(db, mesa_id)
        if not pedido:
            raise HTTPException(status_code=404, detail='Pedido pendente não encontrado para a mesa')

        # Aplicar decremento de estoque e registrar movimentações
        for it in pedido.itens:
            try:
                # Usar a função de movimentação para garantir consistência
                # Passar usuario_id como keyword para não confundir com o parâmetro 'observacoes'
                crud.create_movimentacao_estoque(db, it.produto_id, int(it.quantidade or 0), 'saida', 'venda_fisica', usuario_id=usuario_id)
            except Exception as e:
                logger.exception(f"Falha ao criar movimentacao para produto {it.produto_id}: {e}")
                # continuar com outros itens

        # Criar registro de pagamento
        try:
            valor = float(total) if total is not None else float(pedido.total or 0)
        except Exception:
            valor = float(pedido.total or 0)

        db_pag = crud.create_pagamento(db, pedido.id, valor, metodo or 'indefinido', status='Confirmado')

        # Marcar pedido como entregue e atualizar total
        try:
            pedido.status = 'Entregue'
            pedido.total = valor
            db.add(pedido)
            db.commit()
            db.refresh(pedido)
        except Exception:
            db.rollback()
            logger.exception('Erro ao atualizar pedido após pagamento')

        # Atualizar mesa para status 'Livre' e limpar usuario_responsavel_id
        mesa = crud.get_mesa(db, mesa_id)
        if mesa:
            try:
                mesa.status = 'Livre'
                mesa.usuario_responsavel_id = None
                db.add(mesa)
                db.commit()
                db.refresh(mesa)
                logger.info(f"Mesa {mesa_id} liberada após pagamento")
            except Exception:
                db.rollback()
                logger.exception(f'Erro ao liberar mesa {mesa_id} após pagamento')
                # Recarregar mesa após erro
                mesa = crud.get_mesa(db, mesa_id)

        return {
            'ok': True,
            'pagamento_id': db_pag.id,
            'mesa': {
                'id': mesa.id,
                'nome': mesa.nome,
                'slug': mesa.slug,
                'status': mesa.status,
                'pedido': 0,
                'itens': []
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Erro ao processar pagamento para mesa {mesa_id}: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ----- Favoritos (loja online) -----
@app.post('/favoritos/')
def api_create_favorito(payload: dict, request: Request, db: Session = Depends(get_db)):
    """Cria um favorito para o usuário autenticado.

    Payload esperado: { produto_id: int }
    Se não houver token válido, tenta usar `user_id` do payload ou usa 1.
    """
    try:
        # tentar extrair user do token (mesma lógica do api_me)
        token = request.cookies.get('access_token')
        if not token:
            auth = request.headers.get('Authorization') or ''
            if auth.lower().startswith('bearer '):
                token = auth.split(' ', 1)[1]

        user_id = None
        if token:
            secret = os.environ.get('JWT_SECRET', 'devsecret')
            try:
                payload_jwt = jwt.decode(token, secret, algorithms=['HS256'])
                user_id = int(payload_jwt.get('sub')) if payload_jwt.get('sub') else None
            except Exception:
                user_id = None

        if not user_id:
            user_id = int(payload.get('user_id')) if payload.get('user_id') else 1

        produto_id = int(payload.get('produto_id'))
        fav = crud.create_favorito(db, user_id, produto_id)
        return {'id': fav.id, 'user_id': fav.user_id, 'produto_id': fav.produto_id}
    except Exception as e:
        logger.exception(f"Erro criando favorito: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.delete('/favoritos/{produto_id}')
def api_remove_favorito(produto_id: int, request: Request, db: Session = Depends(get_db)):
    try:
        token = request.cookies.get('access_token')
        if not token:
            auth = request.headers.get('Authorization') or ''
            if auth.lower().startswith('bearer '):
                token = auth.split(' ', 1)[1]

        user_id = None
        if token:
            secret = os.environ.get('JWT_SECRET', 'devsecret')
            try:
                payload_jwt = jwt.decode(token, secret, algorithms=['HS256'])
                user_id = int(payload_jwt.get('sub')) if payload_jwt.get('sub') else None
            except Exception:
                user_id = None

        if not user_id:
            # permitir remoção via query/body fallback? usamos 1
            user_id = 1

        removed = crud.remove_favorito(db, user_id, produto_id)
        if not removed:
            raise HTTPException(status_code=404, detail='Favorito não encontrado')
        return {'ok': True}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Erro removendo favorito: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ----- Avaliações (loja online) -----
@app.post('/avaliacoes/')
def api_create_or_update_avaliacao(payload: dict, request: Request, db: Session = Depends(get_db)):
    """Cria ou atualiza uma avaliação do usuário para um produto.

    Payload: { produto_id, rating, comentario }
    """
    try:
        token = request.cookies.get('access_token')
        if not token:
            auth = request.headers.get('Authorization') or ''
            if auth.lower().startswith('bearer '):
                token = auth.split(' ', 1)[1]

        user_id = None
        if token:
            secret = os.environ.get('JWT_SECRET', 'devsecret')
            try:
                payload_jwt = jwt.decode(token, secret, algorithms=['HS256'])
                user_id = int(payload_jwt.get('sub')) if payload_jwt.get('sub') else None
            except Exception:
                user_id = None

        if not user_id:
            user_id = int(payload.get('user_id')) if payload.get('user_id') else 1

        produto_id = int(payload.get('produto_id'))
        rating = int(payload.get('rating'))
        comentario = payload.get('comentario')

        # Checar se já existe -> atualizar
        existing = db.query(models.Avaliacao).filter(models.Avaliacao.user_id == user_id, models.Avaliacao.produto_id == produto_id).first()
        if existing:
            existing.rating = rating
            existing.comentario = comentario
            db.add(existing)
            db.commit()
            db.refresh(existing)
            return {'id': existing.id, 'user_id': existing.user_id, 'produto_id': existing.produto_id, 'rating': existing.rating}

        aval = crud.create_avaliacao(db, user_id, produto_id, rating, comentario)
        return {'id': aval.id, 'user_id': aval.user_id, 'produto_id': aval.produto_id, 'rating': aval.rating}
    except Exception as e:
        logger.exception(f"Erro criando/atualizando avaliacao: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.delete('/avaliacoes/{produto_id}')
def api_remove_avaliacao(produto_id: int, request: Request, db: Session = Depends(get_db)):
    try:
        token = request.cookies.get('access_token')
        if not token:
            auth = request.headers.get('Authorization') or ''
            if auth.lower().startswith('bearer '):
                token = auth.split(' ', 1)[1]

        user_id = None
        if token:
            secret = os.environ.get('JWT_SECRET', 'devsecret')
            try:
                payload_jwt = jwt.decode(token, secret, algorithms=['HS256'])
                user_id = int(payload_jwt.get('sub')) if payload_jwt.get('sub') else None
            except Exception:
                user_id = None

        if not user_id:
            user_id = 1

        db_aval = db.query(models.Avaliacao).filter(models.Avaliacao.user_id == user_id, models.Avaliacao.produto_id == produto_id).first()
        if not db_aval:
            raise HTTPException(status_code=404, detail='Avaliacao nao encontrada')
        db.delete(db_aval)
        db.commit()
        return {'ok': True}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Erro removendo avaliacao: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ----------------- Carrinho (loja online) -----------------
def _extract_user_id_from_request(request: Request, payload: dict = None) -> int:
    token = request.cookies.get('access_token')
    if not token:
        auth = request.headers.get('Authorization') or ''
        if auth.lower().startswith('bearer '):
            token = auth.split(' ', 1)[1]

    user_id = None
    if token:
        secret = os.environ.get('JWT_SECRET', 'devsecret')
        try:
            payload_jwt = jwt.decode(token, secret, algorithms=['HS256'])
            user_id = int(payload_jwt.get('sub')) if payload_jwt.get('sub') else None
        except Exception:
            user_id = None

    if not user_id and payload:
        user_id = int(payload.get('user_id')) if payload.get('user_id') else None

    if not user_id:
        # fallback para ambiente de desenvolvimento
        user_id = 1
    return user_id


@app.get('/carrinho/')
def api_get_carrinho(request: Request, db: Session = Depends(get_db)):
    """Retorna o carrinho do usuário autenticado (ou usuário fallback)."""
    try:
        user_id = _extract_user_id_from_request(request)
        cart = crud.get_cart_by_user(db, user_id)
        if not cart:
            return {'id': None, 'itens': [], 'total': 0}
        itens = []
        for it in cart.itens:
            itens.append({
                'id': it.id,
                'produto_id': it.produto_id,
                'nome': it.nome,
                'quantidade': it.quantidade,
                'preco_unitario': float(it.preco_unitario) if it.preco_unitario is not None else None,
                'subtotal': float(it.subtotal) if it.subtotal is not None else None,
            })
        return {'id': cart.id, 'itens': itens, 'total': float(cart.total or 0)}
    except Exception as e:
        logger.exception(f"Erro ao obter carrinho: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.post('/carrinho/items')
def api_add_item_carrinho(payload: dict, request: Request, db: Session = Depends(get_db)):
    """Adiciona item ao carrinho. Payload: { produto_id, quantidade, venda/precoUnitario, user_id (opcional) }"""
    try:
        user_id = _extract_user_id_from_request(request, payload)
        produto_id = int(payload.get('produto_id')) if payload.get('produto_id') is not None else None
        quantidade = int(payload.get('quantidade') or 1)
        preco = None
        if payload.get('venda') is not None:
            preco = float(payload.get('venda'))
        elif payload.get('precoUnitario') is not None:
            preco = float(payload.get('precoUnitario'))

        cart = crud.add_item_to_cart(db, user_id=user_id, produto_id=produto_id, quantidade=quantidade, preco_unitario=preco)
        # montar resposta simples
        itens = []
        for it in cart.itens:
            itens.append({
                'id': it.id,
                'produto_id': it.produto_id,
                'nome': it.nome,
                'quantidade': it.quantidade,
                'preco_unitario': float(it.preco_unitario) if it.preco_unitario is not None else None,
                'subtotal': float(it.subtotal) if it.subtotal is not None else None,
            })
        return {'id': cart.id, 'itens': itens, 'total': float(cart.total or 0)}
    except Exception as e:
        logger.exception(f"Erro adicionando item ao carrinho: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.patch('/carrinho/items/{item_id}')
def api_update_carrinho_item(item_id: int, payload: dict, request: Request, db: Session = Depends(get_db)):
    try:
        quantidade = int(payload.get('quantidade'))
        cart = crud.update_cart_item_quantity(db, item_id, quantidade)
        itens = []
        for it in cart.itens:
            itens.append({
                'id': it.id,
                'produto_id': it.produto_id,
                'nome': it.nome,
                'quantidade': it.quantidade,
                'preco_unitario': float(it.preco_unitario) if it.preco_unitario is not None else None,
                'subtotal': float(it.subtotal) if it.subtotal is not None else None,
            })
        return {'id': cart.id, 'itens': itens, 'total': float(cart.total or 0)}
    except Exception as e:
        logger.exception(f"Erro atualizando item do carrinho: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.delete('/carrinho/items/{item_id}')
def api_remove_carrinho_item(item_id: int, request: Request, db: Session = Depends(get_db)):
    try:
        cart = crud.remove_item_from_cart(db, item_id)
        if not cart:
            raise HTTPException(status_code=404, detail='Item não encontrado')
        itens = []
        for it in cart.itens:
            itens.append({
                'id': it.id,
                'produto_id': it.produto_id,
                'nome': it.nome,
                'quantidade': it.quantidade,
                'preco_unitario': float(it.preco_unitario) if it.preco_unitario is not None else None,
                'subtotal': float(it.subtotal) if it.subtotal is not None else None,
            })
        return {'id': cart.id, 'itens': itens, 'total': float(cart.total or 0)}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Erro removendo item do carrinho: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.post('/carrinho/clear')
def api_clear_carrinho(payload: dict, request: Request, db: Session = Depends(get_db)):
    try:
        # payload pode conter user_id ou cart_id
        cart_id = payload.get('cart_id') if payload else None
        if cart_id:
            ok = crud.clear_cart(db, int(cart_id))
            if not ok:
                raise HTTPException(status_code=404, detail='Carrinho não encontrado')
            return {'ok': True}

        user_id = _extract_user_id_from_request(request, payload)
        cart = crud.get_cart_by_user(db, user_id)
        if not cart:
            return {'ok': True}
        ok = crud.clear_cart(db, cart.id)
        return {'ok': ok}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Erro limpando carrinho: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ----- Mercado Pago -----
@app.post('/api/mercadopago/create')
def api_create_mercadopago_preference(payload: dict):
    """Cria uma preferência de pagamento no Mercado Pago.
    
    Payload esperado:
    {
        "items": [
            {
                "id": "produto_id",
                "title": "Nome do Produto",
                "quantity": 1,
                "currency_id": "BRL",
                "unit_price": 10.0
            }
        ],
        "back_urls": {
            "success": "http://...",
            "failure": "http://...",
            "pending": "http://..."
        },
        "auto_return": "all"
    }
    """
    try:
        import mercadopago
        
        # Obter access token do .env
        access_token = os.environ.get('MERCADO_PAGO_ACCESS_TOKEN') or os.environ.get('MP_ACCESS_TOKEN')
        if not access_token:
            logger.error('MERCADO_PAGO_ACCESS_TOKEN não configurado')
            raise HTTPException(status_code=500, detail='Mercado Pago não configurado no servidor')
        
        # Inicializar SDK
        sdk = mercadopago.SDK(access_token)
        
        # Montar preferência
        preference_data = {
            "items": payload.get('items', []),
            "back_urls": payload.get('back_urls', {}),
            "auto_return": payload.get('auto_return', 'approved'),
        }
        
        # Verificar se deve usar sandbox
        force_sandbox = os.environ.get('MP_FORCE_SANDBOX', 'false').lower() == 'true'
        
        logger.info(f'Criando preferência MP (sandbox={force_sandbox}): {preference_data}')
        
        # Criar preferência
        preference_response = sdk.preference().create(preference_data)
        preference = preference_response["response"]
        
        logger.info(f'Preferência MP criada: {preference.get("id")}')
        
        # Retornar links de pagamento
        return {
            "id": preference.get("id"),
            "init_point": preference.get("init_point"),
            "sandbox_init_point": preference.get("sandbox_init_point"),
        }
    except ImportError:
        logger.exception('SDK do Mercado Pago não instalado')
        raise HTTPException(status_code=500, detail='SDK do Mercado Pago não instalado. Execute: pip install mercadopago')
    except Exception as e:
        logger.exception(f'Erro ao criar preferência MP: {e}')
        raise HTTPException(status_code=400, detail=str(e))


@app.post('/webhooks/mercadopago')
async def webhook_mercadopago(request: Request):
    """Webhook para notificações do Mercado Pago."""
    try:
        body = await request.json()
        logger.info(f'Webhook MP recebido: {body}')
        
        # Aqui você pode processar as notificações do MP
        # Por exemplo: atualizar status de pagamento, liberar pedido, etc.
        
        return {'status': 'ok'}
    except Exception as e:
        logger.exception(f'Erro processando webhook MP: {e}')
        return {'status': 'error', 'message': str(e)}

