==> Downloading cache...
==> Cloning from https://github.com/osmarrx590-arch/DeployMPago
==> Checking out commit 62de73718d13cb068ba0880a4ea11e617bbc10d2 in branch main
==> Downloaded 112MB in 4s. Extraction took 2s.
==> Using Node.js version 22.16.0 (default)
==> Docs on specifying a Node.js version: https://render.com/docs/node-version
==> Using Bun version 1.2.20 (default)
==> Docs on specifying a Bun version: https://render.com/docs/bun-version
==> Running build command 'pip install -r backend/requirements.txt'...
==> Installing Python version 3.13.4...
==> Using Python version 3.13.4 (default)
==> Docs on specifying a Python version: https://render.com/docs/python-version
==> Using Poetry version 2.1.3 (default)
==> Docs on specifying a Poetry version: https://render.com/docs/poetry-version
==> Installing Poetry version 2.1.3
Retrieving Poetry metadata
# Welcome to Poetry!
This will download and install the latest version of Poetry,
a dependency and package manager for Python.
It will add the `poetry` command to Poetry's bin directory, located at:
/opt/render/project/poetry/bin
You can uninstall at any time by executing this script with the --uninstall option,
and these changes will be reverted.
Installing Poetry (2.1.3)
Installing Poetry (2.1.3): Creating environment
Installing Poetry (2.1.3): Installing Poetry
Installing Poetry (2.1.3): Creating script
Installing Poetry (2.1.3): Done
Poetry (2.1.3) is installed now. Great!
To get started you need Poetry's bin directory (/opt/render/project/poetry/bin) in your `PATH`
environment variable.
Add `export PATH="/opt/render/project/poetry/bin:$PATH"` to your shell configuration file.
Alternatively, you can call Poetry explicitly with `/opt/render/project/poetry/bin/poetry`.
You can test that everything is set up by executing:
`poetry --version`
Collecting annotated-doc==0.0.3 (from -r backend/requirements.txt (line 1))
  Using cached annotated_doc-0.0.3-py3-none-any.whl.metadata (6.6 kB)
Collecting annotated-types==0.7.0 (from -r backend/requirements.txt (line 2))
  Using cached annotated_types-0.7.0-py3-none-any.whl.metadata (15 kB)
Collecting anyio==4.11.0 (from -r backend/requirements.txt (line 3))
  Using cached anyio-4.11.0-py3-none-any.whl.metadata (4.1 kB)
Collecting bcrypt==5.0.0 (from -r backend/requirements.txt (line 4))
  Using cached bcrypt-5.0.0-cp39-abi3-manylinux_2_34_x86_64.whl.metadata (10 kB)
Collecting certifi==2025.10.5 (from -r backend/requirements.txt (line 5))
  Using cached certifi-2025.10.5-py3-none-any.whl.metadata (2.5 kB)
Collecting charset-normalizer==3.4.4 (from -r backend/requirements.txt (line 6))
  Using cached charset_normalizer-3.4.4-cp313-cp313-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl.metadata (37 kB)
Collecting click==8.3.0 (from -r backend/requirements.txt (line 7))
  Using cached click-8.3.0-py3-none-any.whl.metadata (2.6 kB)
Collecting colorama==0.4.6 (from -r backend/requirements.txt (line 8))
  Using cached colorama-0.4.6-py2.py3-none-any.whl.metadata (17 kB)
Collecting dnspython==2.8.0 (from -r backend/requirements.txt (line 9))
  Using cached dnspython-2.8.0-py3-none-any.whl.metadata (5.7 kB)
Collecting email-validator==2.3.0 (from -r backend/requirements.txt (line 10))
  Using cached email_validator-2.3.0-py3-none-any.whl.metadata (26 kB)
Collecting fastapi==0.120.4 (from -r backend/requirements.txt (line 11))
  Using cached fastapi-0.120.4-py3-none-any.whl.metadata (28 kB)
Collecting greenlet==3.2.4 (from -r backend/requirements.txt (line 12))
  Using cached greenlet-3.2.4-cp313-cp313-manylinux_2_24_x86_64.manylinux_2_28_x86_64.whl.metadata (4.1 kB)
Collecting h11==0.16.0 (from -r backend/requirements.txt (line 13))
  Using cached h11-0.16.0-py3-none-any.whl.metadata (8.3 kB)
Collecting httptools==0.7.1 (from -r backend/requirements.txt (line 14))
  Using cached httptools-0.7.1-cp313-cp313-manylinux1_x86_64.manylinux_2_28_x86_64.manylinux_2_5_x86_64.whl.metadata (3.5 kB)
Collecting idna==3.11 (from -r backend/requirements.txt (line 15))
  Using cached idna-3.11-py3-none-any.whl.metadata (8.4 kB)
Collecting pydantic==2.12.3 (from -r backend/requirements.txt (line 16))
  Using cached pydantic-2.12.3-py3-none-any.whl.metadata (87 kB)
Collecting pydantic_core==2.41.4 (from -r backend/requirements.txt (line 17))
  Using cached pydantic_core-2.41.4-cp313-cp313-manylinux_2_17_x86_64.manylinux2014_x86_64.whl.metadata (7.3 kB)
Collecting PyJWT==2.10.1 (from -r backend/requirements.txt (line 18))
  Using cached PyJWT-2.10.1-py3-none-any.whl.metadata (4.0 kB)
Collecting python-dotenv==1.2.1 (from -r backend/requirements.txt (line 19))
  Using cached python_dotenv-1.2.1-py3-none-any.whl.metadata (25 kB)
Collecting PyYAML==6.0.3 (from -r backend/requirements.txt (line 20))
  Using cached pyyaml-6.0.3-cp313-cp313-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl.metadata (2.4 kB)
Collecting requests==2.32.5 (from -r backend/requirements.txt (line 21))
  Using cached requests-2.32.5-py3-none-any.whl.metadata (4.9 kB)
Collecting sniffio==1.3.1 (from -r backend/requirements.txt (line 22))
  Using cached sniffio-1.3.1-py3-none-any.whl.metadata (3.9 kB)
Collecting SQLAlchemy==2.0.36 (from -r backend/requirements.txt (line 23))
  Using cached SQLAlchemy-2.0.36-cp313-cp313-manylinux_2_17_x86_64.manylinux2014_x86_64.whl.metadata (9.7 kB)
Collecting starlette==0.42.0 (from -r backend/requirements.txt (line 24))
  Using cached starlette-0.42.0-py3-none-any.whl.metadata (6.0 kB)
Collecting typing-inspection==0.4.2 (from -r backend/requirements.txt (line 25))
  Using cached typing_inspection-0.4.2-py3-none-any.whl.metadata (2.6 kB)
Collecting typing_extensions>=4.14.1 (from -r backend/requirements.txt (line 26))
  Using cached typing_extensions-4.15.0-py3-none-any.whl.metadata (3.3 kB)
Collecting urllib3==2.5.0 (from -r backend/requirements.txt (line 27))
  Using cached urllib3-2.5.0-py3-none-any.whl.metadata (6.5 kB)
Collecting uvicorn==0.34.0 (from -r backend/requirements.txt (line 28))
  Using cached uvicorn-0.34.0-py3-none-any.whl.metadata (6.5 kB)
Collecting watchfiles==1.0.4 (from -r backend/requirements.txt (line 29))
  Using cached watchfiles-1.0.4-cp313-cp313-manylinux_2_17_x86_64.manylinux2014_x86_64.whl.metadata (4.9 kB)
Collecting websockets==14.2 (from -r backend/requirements.txt (line 30))
  Using cached websockets-14.2-cp313-cp313-manylinux_2_5_x86_64.manylinux1_x86_64.manylinux_2_17_x86_64.manylinux2014_x86_64.whl.metadata (6.8 kB)
Collecting mercadopago==2.2.3 (from -r backend/requirements.txt (line 31))
  Using cached mercadopago-2.2.3-py3-none-any.whl.metadata (5.6 kB)
Collecting gunicorn==22.0.0 (from -r backend/requirements.txt (line 32))
  Using cached gunicorn-22.0.0-py3-none-any.whl.metadata (4.4 kB)
Collecting psycopg2-binary (from -r backend/requirements.txt (line 33))
  Downloading psycopg2_binary-2.9.11-cp313-cp313-manylinux2014_x86_64.manylinux_2_17_x86_64.whl.metadata (4.9 kB)
Collecting packaging (from gunicorn==22.0.0->-r backend/requirements.txt (line 32))
  Using cached packaging-25.0-py3-none-any.whl.metadata (3.3 kB)
Using cached annotated_doc-0.0.3-py3-none-any.whl (5.5 kB)
Using cached annotated_types-0.7.0-py3-none-any.whl (13 kB)
Using cached anyio-4.11.0-py3-none-any.whl (109 kB)
Using cached bcrypt-5.0.0-cp39-abi3-manylinux_2_34_x86_64.whl (278 kB)
Using cached certifi-2025.10.5-py3-none-any.whl (163 kB)
Using cached charset_normalizer-3.4.4-cp313-cp313-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl (153 kB)
Using cached click-8.3.0-py3-none-any.whl (107 kB)
Using cached colorama-0.4.6-py2.py3-none-any.whl (25 kB)
Using cached dnspython-2.8.0-py3-none-any.whl (331 kB)
Using cached email_validator-2.3.0-py3-none-any.whl (35 kB)
Using cached fastapi-0.120.4-py3-none-any.whl (108 kB)
Using cached pydantic-2.12.3-py3-none-any.whl (462 kB)
Using cached starlette-0.42.0-py3-none-any.whl (73 kB)
Using cached greenlet-3.2.4-cp313-cp313-manylinux_2_24_x86_64.manylinux_2_28_x86_64.whl (610 kB)
Using cached h11-0.16.0-py3-none-any.whl (37 kB)
Using cached httptools-0.7.1-cp313-cp313-manylinux1_x86_64.manylinux_2_28_x86_64.manylinux_2_5_x86_64.whl (478 kB)
Using cached idna-3.11-py3-none-any.whl (71 kB)
Using cached pydantic_core-2.41.4-cp313-cp313-manylinux_2_17_x86_64.manylinux2014_x86_64.whl (2.1 MB)
Using cached PyJWT-2.10.1-py3-none-any.whl (22 kB)
Using cached python_dotenv-1.2.1-py3-none-any.whl (21 kB)
Using cached pyyaml-6.0.3-cp313-cp313-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl (801 kB)
Using cached requests-2.32.5-py3-none-any.whl (64 kB)
Using cached urllib3-2.5.0-py3-none-any.whl (129 kB)
Using cached sniffio-1.3.1-py3-none-any.whl (10 kB)
Using cached SQLAlchemy-2.0.36-cp313-cp313-manylinux_2_17_x86_64.manylinux2014_x86_64.whl (3.2 MB)
Using cached typing_inspection-0.4.2-py3-none-any.whl (14 kB)
Using cached uvicorn-0.34.0-py3-none-any.whl (62 kB)
Using cached watchfiles-1.0.4-cp313-cp313-manylinux_2_17_x86_64.manylinux2014_x86_64.whl (452 kB)
Using cached websockets-14.2-cp313-cp313-manylinux_2_5_x86_64.manylinux1_x86_64.manylinux_2_17_x86_64.manylinux2014_x86_64.whl (170 kB)
Using cached mercadopago-2.2.3-py3-none-any.whl (24 kB)
Using cached gunicorn-22.0.0-py3-none-any.whl (84 kB)
Using cached typing_extensions-4.15.0-py3-none-any.whl (44 kB)
Downloading psycopg2_binary-2.9.11-cp313-cp313-manylinux2014_x86_64.manylinux_2_17_x86_64.whl (4.2 MB)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 4.2/4.2 MB 22.5 MB/s eta 0:00:00
Using cached packaging-25.0-py3-none-any.whl (66 kB)
Installing collected packages: websockets, urllib3, typing_extensions, sniffio, PyYAML, python-dotenv, PyJWT, psycopg2-binary, packaging, idna, httptools, h11, greenlet, dnspython, colorama, click, charset-normalizer, certifi, bcrypt, annotated-types, annotated-doc, uvicorn, typing-inspection, SQLAlchemy, requests, pydantic_core, gunicorn, email-validator, anyio, watchfiles, starlette, pydantic, mercadopago, fastapi
Successfully installed PyJWT-2.10.1 PyYAML-6.0.3 SQLAlchemy-2.0.36 annotated-doc-0.0.3 annotated-types-0.7.0 anyio-4.11.0 bcrypt-5.0.0 certifi-2025.10.5 charset-normalizer-3.4.4 click-8.3.0 colorama-0.4.6 dnspython-2.8.0 email-validator-2.3.0 fastapi-0.120.4 greenlet-3.2.4 gunicorn-22.0.0 h11-0.16.0 httptools-0.7.1 idna-3.11 mercadopago-2.2.3 packaging-25.0 psycopg2-binary-2.9.11 pydantic-2.12.3 pydantic_core-2.41.4 python-dotenv-1.2.1 requests-2.32.5 sniffio-1.3.1 starlette-0.42.0 typing-inspection-0.4.2 typing_extensions-4.15.0 urllib3-2.5.0 uvicorn-0.34.0 watchfiles-1.0.4 websockets-14.2
[notice] A new release of pip is available: 25.1.1 -> 25.3
[notice] To update, run: pip install --upgrade pip
==> Uploading build...
==> Uploaded in 15.3s. Compression took 4.2s
==> Build successful 🎉
==> Deploying...
==> Your service is live 🎉
==> 
==> ///////////////////////////////////////////////////////////
==> 
==> Available at your primary URL https://choperia-backend-9ty4.onrender.com
==> 
==> ///////////////////////////////////////////////////////////
[2025-11-12 02:44:57 +0000] [87] [INFO] Using worker: uvicorn.workers.UvicornWorker
[2025-11-12 02:44:57 +0000] [88] [INFO] Booting worker with pid: 88
/opt/render/project/src/.venv/lib/python3.13/site-packages/pydantic/_internal/_config.py:383: UserWarning: Valid config keys have changed in V2:
* 'orm_mode' has been renamed to 'from_attributes'
  warnings.warn(message, UserWarning)
[2025-11-12 02:45:12 +0000] [88] [INFO] Started server process [88]
[2025-11-12 02:45:12 +0000] [88] [INFO] Waiting for application startup.
2025-11-12 02:45:13,350 INFO happy-hops: Tabelas do banco verificadas/criadas (startup)
2025-11-12 02:45:13,724 INFO happy-hops: Criada categoria: BEBIDA
2025-11-12 02:45:13,725 INFO happy-hops: Criada categoria: COMIDA
2025-11-12 02:45:13,726 INFO happy-hops: Criada categoria: LANCHE
2025-11-12 02:45:13,727 INFO happy-hops: Criada categoria: SUCO
2025-11-12 02:45:13,728 INFO happy-hops: Criada categoria: TAPIOCA
2025-11-12 02:45:13,729 INFO happy-hops: Criada categoria: BALDE
2025-11-12 02:45:13,730 INFO happy-hops: Criada categoria: CERVEJA
2025-11-12 02:45:13,731 INFO happy-hops: Criada categoria: SOBREMESA
2025-11-12 02:45:13,732 INFO happy-hops: Criada categoria: PIZZA
2025-11-12 02:45:13,733 INFO happy-hops: Criada categoria: MARMITEX
2025-11-12 02:45:13,811 INFO happy-hops: Criada categoria: OUTROS
2025-11-12 02:45:13,856 INFO happy-hops: Empresa e nota fiscal criadas: Choperia Point do Morro
2025-11-12 02:45:13,917 INFO happy-hops: Empresa e nota fiscal criadas: Choperia do Zé
2025-11-12 02:45:13,938 INFO happy-hops: Empresa e nota fiscal criadas: Bar do João
2025-11-12 02:45:15,697 INFO happy-hops: Usuário admin criado: admin
2025-11-12 02:45:17,329 INFO happy-hops: Usuário criado: julia <julia@gmail.com> tipo=UserType.fisica
2025-11-12 02:45:19,028 INFO happy-hops: Usuário criado: mariana <mariana@gmail.com> tipo=UserType.fisica
2025-11-12 02:45:20,724 INFO happy-hops: Usuário criado: osmar <osmar@gmail.com> tipo=UserType.online
2025-11-12 02:45:22,418 INFO happy-hops: Usuário criado: amanda <amanda@gmail.com> tipo=UserType.online
2025-11-12 02:45:24,119 INFO happy-hops: Usuário criado: gabriela <gabriela@gmail.com> tipo=UserType.online
2025-11-12 02:45:25,814 INFO happy-hops: Usuário criado: juliana <juliana@gmail.com> tipo=UserType.online
2025-11-12 02:45:25,826 INFO happy-hops: Produto criado: Chopp Pilsen
2025-11-12 02:45:25,831 INFO happy-hops: Movimentacao de estoque criada
2025-11-12 02:45:25,841 INFO happy-hops: Produto criado: Chopp IPA
2025-11-12 02:45:25,844 INFO happy-hops: Movimentacao de estoque criada
2025-11-12 02:45:25,920 INFO happy-hops: Produto criado: Chopp Weiss
2025-11-12 02:45:25,923 INFO happy-hops: Movimentacao de estoque criada
2025-11-12 02:45:25,930 INFO happy-hops: Produto criado: Chopp Stout
2025-11-12 02:45:25,933 INFO happy-hops: Movimentacao de estoque criada
2025-11-12 02:45:25,944 INFO happy-hops: Produto criado: Chopp Red Ale
2025-11-12 02:45:25,948 INFO happy-hops: Movimentacao de estoque criada
2025-11-12 02:45:26,012 INFO happy-hops: Produto criado: Porção de Batatas Fritas
2025-11-12 02:45:26,017 INFO happy-hops: Movimentacao de estoque criada
2025-11-12 02:45:26,028 INFO happy-hops: Produto criado: Tábua de Frios
2025-11-12 02:45:26,032 INFO happy-hops: Movimentacao de estoque criada
2025-11-12 02:45:26,041 INFO happy-hops: Produto criado: Isca de Peixe
2025-11-12 02:45:26,044 INFO happy-hops: Movimentacao de estoque criada
2025-11-12 02:45:26,053 INFO happy-hops: Produto criado: Pastéis Mistos
2025-11-12 02:45:26,111 INFO happy-hops: Movimentacao de estoque criada
2025-11-12 02:45:26,120 INFO happy-hops: Produto criado: Tábua de Frios Premium
2025-11-12 02:45:26,124 INFO happy-hops: Movimentacao de estoque criada
2025-11-12 02:45:26,133 INFO happy-hops: Produto criado: Nachos com Guacamole
2025-11-12 02:45:26,136 INFO happy-hops: Movimentacao de estoque criada
2025-11-12 02:45:26,144 INFO happy-hops: Produto criado: Bolinho de Bacalhau
2025-11-12 02:45:26,146 INFO happy-hops: Movimentacao de estoque criada
==> No open HTTP ports detected on 0.0.0.0, continuing to scan...
2025-11-12 02:45:26,216 INFO happy-hops: Produto criado: Anéis de Cebola
2025-11-12 02:45:26,220 INFO happy-hops: Movimentacao de estoque criada
2025-11-12 02:45:26,232 INFO happy-hops: Produto criado: Refrigerante Cola
2025-11-12 02:45:26,237 INFO happy-hops: Movimentacao de estoque criada
2025-11-12 02:45:26,246 INFO happy-hops: Produto criado: Água Mineral
2025-11-12 02:45:26,249 INFO happy-hops: Movimentacao de estoque criada
2025-11-12 02:45:26,318 INFO happy-hops: Produto criado: Suco de Laranja
2025-11-12 02:45:26,322 INFO happy-hops: Movimentacao de estoque criada
2025-11-12 02:45:26,333 INFO happy-hops: Produto criado: Tapioca de Queijo
2025-11-12 02:45:26,336 INFO happy-hops: Movimentacao de estoque criada
2025-11-12 02:45:26,346 INFO happy-hops: Produto criado: Tapioca de Carne
2025-11-12 02:45:26,349 INFO happy-hops: Movimentacao de estoque criada
2025-11-12 02:45:26,417 INFO happy-hops: Produto criado: Pizza Margherita
2025-11-12 02:45:26,420 INFO happy-hops: Movimentacao de estoque criada
2025-11-12 02:45:26,428 INFO happy-hops: Produto criado: Pizza Calabresa
2025-11-12 02:45:26,431 INFO happy-hops: Movimentacao de estoque criada
2025-11-12 02:45:26,438 INFO happy-hops: Produto criado: Marmitex Executiva
2025-11-12 02:45:26,442 INFO happy-hops: Movimentacao de estoque criada
2025-11-12 02:45:26,452 INFO happy-hops: Produto criado: Balde de Cerveja
2025-11-12 02:45:26,511 INFO happy-hops: Movimentacao de estoque criada
2025-11-12 02:45:26,525 INFO happy-hops: Produto criado: Pudim de Leite
2025-11-12 02:45:26,528 INFO happy-hops: Movimentacao de estoque criada
2025-11-12 02:45:26,538 INFO happy-hops: Produto criado: Petit Gateau
2025-11-12 02:45:26,541 INFO happy-hops: Movimentacao de estoque criada
2025-11-12 02:45:26,554 INFO happy-hops: Produto criado: Suco de Abacaxi
2025-11-12 02:45:26,557 INFO happy-hops: Movimentacao de estoque criada
2025-11-12 02:45:26,623 INFO happy-hops: Produto criado: Suco de Maracujá
2025-11-12 02:45:26,627 INFO happy-hops: Movimentacao de estoque criada
2025-11-12 02:45:26,641 INFO happy-hops: Produto criado: X-Tudo
2025-11-12 02:45:26,645 INFO happy-hops: Movimentacao de estoque criada
2025-11-12 02:45:26,655 INFO happy-hops: Produto criado: Hot Dog Especial
2025-11-12 02:45:26,716 INFO happy-hops: Movimentacao de estoque criada
2025-11-12 02:45:26,727 INFO happy-hops: Produto criado: Misto Quente
2025-11-12 02:45:26,732 INFO happy-hops: Movimentacao de estoque criada
2025-11-12 02:45:26,741 INFO happy-hops: Produto criado: Cerveja Long Neck
2025-11-12 02:45:26,746 INFO happy-hops: Movimentacao de estoque criada
2025-11-12 02:45:26,758 INFO happy-hops: Produto criado: Porção de Calabresa
2025-11-12 02:45:26,761 INFO happy-hops: Movimentacao de estoque criada
2025-11-12 02:45:26,764 INFO happy-hops: Mesa criada: 01 (responsavel_id=1)
2025-11-12 02:45:26,768 INFO happy-hops: Mesa criada: 02 (responsavel_id=1)
2025-11-12 02:45:26,812 INFO happy-hops: Mesa criada: 03 (responsavel_id=1)
2025-11-12 02:45:26,814 INFO happy-hops: Mesa criada: 04 (responsavel_id=1)
2025-11-12 02:45:26,815 INFO happy-hops: Mesa criada: 05 (responsavel_id=1)
2025-11-12 02:45:26,816 INFO happy-hops: Mesa criada: 06 (responsavel_id=1)
2025-11-12 02:45:26,817 INFO happy-hops: Mesa criada: 07 (responsavel_id=1)
2025-11-12 02:45:26,819 INFO happy-hops: Mesa criada: 08 (responsavel_id=1)
2025-11-12 02:45:26,820 INFO happy-hops: Mesa criada: 09 (responsavel_id=1)
2025-11-12 02:45:26,821 INFO happy-hops: Mesa criada: 10 (responsavel_id=1)
2025-11-12 02:45:26,822 INFO happy-hops: Mesa criada: Balcão 1 (responsavel_id=1)
2025-11-12 02:45:26,823 INFO happy-hops: Mesa criada: Balcão 2 (responsavel_id=1)
2025-11-12 02:45:26,825 INFO happy-hops: Mesa criada: Entrega 1 (responsavel_id=1)
2025-11-12 02:45:26,837 INFO happy-hops: Banco populado automaticamente (startup)
[2025-11-12 02:45:26 +0000] [88] [INFO] Application startup complete.
2025-11-12 02:45:26,925 ERROR happy-hops: Erro ao listar favoritos: type object 'Favorito' has no attribute 'usuario_id'
Traceback (most recent call last):
  File "/opt/render/project/src/backend/main.py", line 664, in api_get_favoritos
    favoritos_list = crud.get_favoritos_usuario(db, user_id)
  File "/opt/render/project/src/backend/crud.py", line 453, in get_favoritos_usuario
    return db.query(models.Favorito).filter(models.Favorito.usuario_id == usuario_id).all()
                                            ^^^^^^^^^^^^^^^^^^^^^^^^^^
AttributeError: type object 'Favorito' has no attribute 'usuario_id'
==> New primary port detected: 10000. Restarting deploy to update network configuration...
==> Docs on specifying a port: https://render.com/docs/web-services#port-binding
==> Using Bun version 1.2.20 (default)
==> Docs on specifying a Bun version: https://render.com/docs/bun-version
==> Running 'gunicorn -k uvicorn.workers.UvicornWorker backend.main:app --bind 0.0.0.0:$PORT'
[2025-11-12 02:46:54 +0000] [88] [INFO] Starting gunicorn 22.0.0
[2025-11-12 02:46:54 +0000] [88] [INFO] Listening at: http://0.0.0.0:10000 (88)
[2025-11-12 02:46:54 +0000] [88] [INFO] Using worker: uvicorn.workers.UvicornWorker
[2025-11-12 02:46:54 +0000] [89] [INFO] Booting worker with pid: 89
==> No open HTTP ports detected on 0.0.0.0, continuing to scan...
/opt/render/project/src/.venv/lib/python3.13/site-packages/pydantic/_internal/_config.py:383: UserWarning: Valid config keys have changed in V2:
* 'orm_mode' has been renamed to 'from_attributes'
  warnings.warn(message, UserWarning)
[2025-11-12 02:47:10 +0000] [89] [INFO] Started server process [89]
[2025-11-12 02:47:10 +0000] [89] [INFO] Waiting for application startup.
2025-11-12 02:47:10,295 INFO happy-hops: Tabelas do banco verificadas/criadas (startup)
2025-11-12 02:47:10,763 INFO happy-hops: Banco já contém dados; pulando populate. Totais: {'categorias': 11, 'empresas': 3, 'produtos': 31, 'mesas': 13, 'usuarios': 7}
2025-11-12 02:47:10,765 INFO happy-hops: Banco populado automaticamente (startup)
[2025-11-12 02:47:10 +0000] [89] [INFO] Application startup complete.
[2025-11-12 02:47:59 +0000] [87] [INFO] Handling signal: term
[2025-11-12 02:47:59 +0000] [88] [INFO] Shutting down
[2025-11-12 02:47:59 +0000] [88] [INFO] Waiting for application shutdown.
[2025-11-12 02:47:59 +0000] [88] [INFO] Application shutdown complete.
[2025-11-12 02:47:59 +0000] [88] [INFO] Finished server process [88]
[2025-11-12 02:47:59 +0000] [87] [ERROR] Worker (pid:88) was sent SIGTERM!
[2025-11-12 02:47:59 +0000] [87] [INFO] Shutting down: Master