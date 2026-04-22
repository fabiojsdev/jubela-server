# Storage Manager System - API v2.0

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?logo=postgresql&logoColor=white)](https://www.postgresql.org/)<br>
Sistema de controle de estoque e vendas desenvolvido para gerenciamento de micro e pequenas empresas do setor alimentício. Esta é uma API REST moderna construída com NestJS, TypeORM e PostgreSQL, oferecendo controle granular de acesso baseado em funções (RBAC - Role-Based Access Control).

## 📌 Status

✔️ Versão 1.0 Finalizada / Aguardando Integração

## 🚀 Stack Tecnológica

- Runtime: Node.js
- Framework: NestJS 10
- ORM: TypeORM 0.3
- Banco de Dados: PostgreSQL
- Autenticação: JWT (Access + Refresh Tokens)
- Segurança: Helmet, CSRF Protection, Rate Limiting
- Validação: class-validator, class-transformer<br>

## 📋 Funcionalidades

### Insumos (Supplies)

- Cadastrar novos insumos com rastreamento de peso e quantidade
- Pesquisar insumos por nome, categoria, fornecedor, data de validade, preço
- Atualizar dados dos insumos (informações gerais e preços separadamente)
- Definir quantidade mínima de estoque (alertas automáticos)
- Histórico completo de movimentações
- Soft delete com campo is_active

### Produtos

- Criar produtos com ou sem receita (lista de insumos)
- Gerenciar receitas de produtos (ingredientes e quantidades)
- Atualizar produtos e suas receitas
- Controle de estoque automático ao usar insumos
- Soft delete com campo is_active
- Rastreamento de criação por funcionário

### Saídas (Outflows)

- Registrar saídas de insumos ou produtos
- Atualização automática de estoque
- Rastreamento por tipo (SUPPLY/PRODUCT)
- Pesquisa por data, hora, categoria, motivo, funcionário
- Validação de estoque disponível antes de registrar saída

### Vendas (Sales)

- Registrar vendas com múltiplos itens
- Atualizar dados da venda e preços
- Pesquisar por data, hora, cliente, endereço, funcionário
- Validação de estoque de produtos antes de finalizar venda

### Funcionários (Employees)

- Criar funcionários com funções (roles) específicas
- Atualizar dados próprios ou de outros (conforme permissão)
- Pesquisar por nome, email, função, situação
- Sistema de hierarquia (chefe/subordinados)
- Logs de autenticação

### Sistema de Autenticação

- Login com JWT (Access Token: 20min, Refresh Token: 24h)
- Rotação automática de refresh tokens com detecção de reuso
- Blacklist de tokens para logout
- Cookies HTTP-only com proteção CSRF
- Rate limiting específico para rotas de autenticação

## 🔐 Sistema de Permissões (RBAC)

O sistema usa Role-Based Access Control com duas entidades principais:

- Roles (Funções)
- Permissions (Permissões)
  Conjuntos de permissões são criados e atribuídos a um cargo que será atribuído a um ou mais funcionários. Exemplos:

`admin` - Acesso total ao sistema<br>
`gerente` - Gerenciar produtos, insumos e vendas<br>
`vendedor` - Apenas registrar vendas e visualizar produtos<br>

### Permissions (Permissões)

Permissões são uma combinação de ação + recurso:<br>
<strong>Ações disponíveis:</strong><br>

`READ` - Visualizar<br>
`CREATE` - Criar<br>
`UPDATE` - Atualizar<br>
`DELETE` - Deletar<br>
`EDIT_PRICES` - Editar preços (controle específico)<br>

### Recursos disponíveis:

`EMPLOYEES` - Funcionários<br>
`PRODUCTS` - Produtos<br>
`SUPPLIES` - Insumos<br>
`OUTFLOWS` - Saídas<br>
`SALES` - Vendas<br>

<strong>Exemplo:</strong> Um funcionário com role "vendedor" pode ter as permissões:

`READ` + `PRODUCTS`<br>
`CREATE` + `SALES`<br>
`READ` + `SALES`<br>
<strong>Criando roles e permissões</strong><br>

```
// POST /roles
{
  "name": "vendedor",
  "permissions": [
    { "action": "READ", "resource": "PRODUCTS" },
    { "action": "CREATE", "resource": "SALES" },
    { "action": "READ", "resource": "SALES" }
  ]
}
```

## 🛡️ Recursos de Segurança

### CSRF Protection

- Double Submit Cookie pattern
- Token gerado automaticamente
- Validação em todas as requisições POST/PUT/PATCH/DELETE
- Desabilitado em desenvolvimento para facilitar testes

### Rate Limiting

- Limites configurados por tipo de operação:<br>

- auth: 5 requisições/minuto (login)
- write: 10 requisições/10 segundos (criação/atualização)
- read: 50 requisições/10 segundos (consultas)
- global: 100 requisições/minuto

### CORS

- Configurado para permitir credenciais
- Lista de origens permitidas configurável via `.env`
- Headers personalizados permitidos (X-CSRF-Token)

### Cookies Seguros

`httpOnly: true` para tokens de autenticação<br>
`sameSite: 'none'` em produção (cross-domain)<br>
`secure: true` apenas em HTTPS (produção)<br>

## 📦 Instalação e Configuração

### Pré-requisitos

- Node.js 18+
- PostgreSQL 14+
- npm ou yarn

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:<br>

```
# Node
NODE_ENV=development

# Database
DATABASE_TYPE=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_NAME=controle_estoque
DATABASE_PASSWORD=sua_senha
DATABASE_AUTOLOADENTITIES=true
DATABASE_SYNCHRONIZE=false  # SEMPRE false em produção

# JWT
JWT_SECRET=sua_chave_secreta_muito_segura_minimo_32_caracteres
JWT_TOKEN_AUDIENCE=localhost:3000
JWT_TOKEN_ISSUER=localhost:3000
JWT_TTL=1200                    # 20 minutos (em segundos)
JWT_REFRESH_TOKEN_TTL=86400     # 24 horas (em segundos)

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Rate Limiting (opcional - valores padrão já configurados)
THROTTLE_AUTH_LIMIT=5
THROTTLE_WRITE_LIMIT=10
THROTTLE_READ_LIMIT=50

# Port
PORT=3000
```

### Instalação - Modo Desenvolvimento

```
# 1. Clone o repositório
git clone https://github.com/LucasNasc3000/stm-nest.git
cd stm-nest

# 2. Instale as dependências
npm install

# 3. Configure o PostgreSQL
# Crie um banco de dados: CREATE DATABASE controle_estoque;

# 4. Execute as migrações
npm run migration:run

# 5. Inicie o servidor em modo desenvolvimento
npm run start:dev

# Servidor estará rodando em http://localhost:3000
```

### Scripts Disponíveis

```
# Desenvolvimento
npm run start:dev          # Inicia em modo watch
npm run start:debug        # Inicia em modo debug

# Produção
npm run build              # Compila o projeto
npm run start:prod         # Inicia versão compilada

# Migrações
npm run migration:generate # Gera nova migração
npm run migration:run      # Executa migrações pendentes
npm run migration:revert   # Reverte última migração

# Qualidade de Código
npm run lint              # ESLint
npm run format            # Prettier
```

## 🗄️ Estrutura do Banco de Dados

### Principais Entidades

- Employee: Funcionários do sistema
- Role: Funções/cargos
- Permission: Permissões granulares
- SupplyRealTime: Estoque atual de insumos
- SupplyHistory: Histórico de movimentações de insumos
- Product: Produtos cadastrados
- ProductIngredient: Receitas dos produtos
- Outflow: Saídas de estoque
- Sale: Vendas realizadas
- SaleItems: Itens de cada venda
- RefreshTokenEmployee: Tokens de autenticação
- JWTBlacklist: Tokens invalidados
- LogEmployee: Logs de acesso

### Relacionamentos

<img src="https://github.com/LucasNasc3000/stm-nest/blob/master/images/stm-nest-db%20-%20publicUpdated.png" width=820 heigth=820/>

### 🔄 Migrações

As migrações já estão no repositório. Para criar uma nova:<br>

```
# 1. Modifique suas entities
# 2. Gere a migração
npm run migration:generate

# 3. Revise o arquivo gerado em migrations/
# 4. Execute a migração
npm run migration:run
```

### 📚 Endpoints Principais

```
### Autenticação

POST   /auth              - Login
POST   /auth/logout       - Logout
POST   /refresh           - Renovar tokens


### Funcionários

POST   /employees                    - Criar funcionário
GET    /employees/search/email/:email
GET    /employees/search/name
GET    /employees/search/role
PATCH  /employees/update/self/:id
PATCH  /employees/update/admin/:id


### Funções e Permissões

POST   /roles             - Criar role
PATCH  /roles/:id         - Atualizar role


### Insumos

POST   /supplies          - Criar insumo
GET    /supplies/search/:campo
PATCH  /supplies/:id      - Atualizar insumo


### Produtos

POST   /products/create/withRecipe
POST   /products/create/withoutRecipe
GET    /products/search/:campo
PATCH  /products/update/general/:id
PATCH  /products/update/price/:id


### Saídas

POST   /outflows/create/supply
POST   /outflows/create/product
GET    /outflows/search/:campo


### Vendas
POST   /sales
GET    /sales/search/:campo
PATCH  /sales/:id
```

Todas as rotas (exceto `/auth` e `/refresh`) exigem autenticação via JWT e permissões adequadas. Para testar uma rota sem autenticação use o decorator @Public() e caso queira pular a verificação de csrf use o @SkipCsrf(), ambos em `src/auth/decorators/`

## 📝 Notas da Versão 2.0

### Mudanças Principais da v1.0 → v2.0

- Framework: Express → NestJS
- ORM: Sequelize → TypeORM
- Banco: MySQL → PostgreSQL
- Permissões: Strings hardcoded → RBAC com entidades
- Autenticação: JWT simples → JWT + Refresh Tokens + CSRF
- Validação: Removido campo CPF (desnecessário para o contexto)
- Soft Delete: deletedAt → is_active (apenas Product e SupplyRealTime)
- Segurança: Adicionado rate limiting, helmet, CORS configurável
- Arquitetura: Monolítico → Modular (NestJS modules)

## 👨‍💻 Autores

**Lucas Fortunato**<br>
📧 lucasfortunato328@gmail.com<br>

**Fábio Marinho**

## 📄 Licença

Este projeto está licenciado sob a **AGPL-3.0-only**.

💡 Para Estudantes: Sinta-se à vontade para clonar, estudar e rodar este projeto localmente. Você não tem obrigações de publicar suas alterações se o uso for apenas para aprendizado pessoal. Se decidir hospedar uma versão modificada publicamente, lembre-se das diretrizes da AGPLv3 sobre o compartilhamento do fonte.

<strong><--------------------------------------------- English Version -------------------------------------------------------></strong>

# Storage Manager System - API v2.0

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?logo=postgresql&logoColor=white)](https://www.postgresql.org/)<br>
Inventory and sales control system developed for managing micro and small businesses in the food sector. This is a modern REST API built with NestJS, TypeORM, and PostgreSQL, offering granular role-based access control (RBAC).

## 📌 Status

✔️ Version 1.0 Finalized / Awaiting Integration

## 🚀 Stack

- Runtime: Node.js
- Framework: NestJS 10
- ORM: TypeORM 0.3
- Database: PostgreSQL
- Auth: JWT (Access + Refresh Tokens)
- Security: Helmet, CSRF Protection, Rate Limiting
- Data Validation: class-validator, class-transformer<br>

## 📋 Funcionalities

### Supplies

- Register new supplies with weight and quantity tracking
- Search supplies by name, category, supplier, expiration date, price
- Update supply data (general information and prices separately)
- Define minimum stock quantity (automatic alerts)
- Complete history of transactions
- Soft delete with is_active field

### Products

- Create products with or without a recipe (ingredient list)
- Manage product recipes (ingredients and quantities)
- Update products and their recipes
- Automatic inventory control when using ingredients
- Soft delete with is_active field
- Creation tracking by employee

### Outflows

- Register the release of supplies or products
- Automatic inventory update
- Tracking by type (SUPPLY/PRODUCT)
- Search by date, time, category, reason, employee
- Validation of available stock before registering the release

### Sales

- Register sales with multiple items
- Update sales data and prices
- Search by date, time, customer, address, employee
- Validate product inventory before finalizing the sale

### Employees

- Create employees with specific roles
- Update your own or others' data (according to permissions)
- Search by name, email, role, status
- Hierarchy system (boss/subordinates)
- Authentication logs

### Auth System

- Login with JWT (Access Token: 20 min, Refresh Token: 24 h)
- Automatic rotation of refresh tokens with reuse detection
- Token blacklist for logout
- HTTP-only cookies with CSRF protection
- Rate limiting specific to authentication routes

## 🔐 Permission System (RBAC)

The system uses Role-Based Access Control with two main entities:

- Roles
- Permissions
  Sets of permissions are created and assigned to a role that will be assigned to one or more employees. Examples:

`admin` - Total access<br>
`gerente` - Manage products, supplies and sales<br>
`vendedor` - Only register sales e view products<br>

### Permissions

Permissions are combinations between action + resource:<br>
<strong>Actions available:</strong><br>

`READ`<br>
`CREATE`<br>
`UPDATE`<br>
`DELETE`<br>
`EDIT_PRICES`<br>

### Resources allowed:

`EMPLOYEES`<br>
`PRODUCTS`<br>
`SUPPLIES`<br>
`OUTFLOWS`<br>
`SALES`<br>

<strong>Example:</strong> An employee with "salesperson" role may have the following permissions:

`READ` + `PRODUCTS`<br>
`CREATE` + `SALES`<br>
`READ` + `SALES`<br>
<strong>Creating roles and permissions</strong><br>

```
// POST /roles
{
  "name": "salesperson",
  "permissions": [
    { "action": "READ", "resource": "PRODUCTS" },
    { "action": "CREATE", "resource": "SALES" },
    { "action": "READ", "resource": "SALES" }
  ]
}
```

## 🛡️ Security Features

### CSRF Protection

- Double Submit Cookie pattern
- Automatically generated token
- Validation on all POST/PUT/PATCH/DELETE requests
- Disabled in development to facilitate testing

### Rate Limiting

- Limits configured by operation type:<br>

- auth: 5 requests/minute (login)
- write: 10 requests/10 seconds (creation/update)
- read: 50 requests/10 seconds (queries)
- global: 100 requests/minute

### CORS

- Configured to allow credentials
- Configurable list of allowed origins via `.env`
- Custom headers allowed (X-CSRF-Token)

### Secure Cookies

`httpOnly: true` for auth tokens<br>
`sameSite: 'none'` in production (cross-domain)<br>
`secure: true` only on HTTPS (production)<br>

## 📦 Instalation and configuration

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Env Variables

Create an `.env` file in the root of the project:<br>

```
# Node
NODE_ENV=development

# Database
DATABASE_TYPE=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_NAME=-storage_manager
DATABASE_PASSWORD=your_password
DATABASE_AUTOLOADENTITIES=true
DATABASE_SYNCHRONIZE=false  # ALWAYS false in production

# JWT
JWT_SECRET=your_secret_min_32_characters
JWT_TOKEN_AUDIENCE=localhost:3000
JWT_TOKEN_ISSUER=localhost:3000
JWT_TTL=1200                    # 20 minutes (in seconds)
JWT_REFRESH_TOKEN_TTL=86400     # 24 hours (in seconds)

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Rate Limiting (optional - default values already configured)
THROTTLE_AUTH_LIMIT=5
THROTTLE_WRITE_LIMIT=10
THROTTLE_READ_LIMIT=50

# Port
PORT=3000
```

### Instalation - Development Mode

```
# 1. Clone the repository
git clone https://github.com/LucasNasc3000/stm-nest.git
cd stm-nest

# 2. Install the dependencies
npm install

# 3. Configure PostgreSQL
# Run the statement: CREATE DATABASE storage_manager;

# 4. Execute the migrations
npm run migration:run

# 5. Start the server in development mode
npm run start:dev

# Server running on http://localhost:3000
```

### Available Scripts

```
# Development
npm run start:dev          # Watch mode
npm run start:debug        # Debug mode

# Production
npm run build              # Compile the project
npm run start:prod         # Start compiled version

# Migrations
npm run migration:generate # Generate a new migration
npm run migration:run      # Execute pending migrations
npm run migration:revert   # Revert last migration

# Code quality
npm run lint              # ESLint
npm run format            # Prettier
```

## 🗄️ Database Structure

### Main Entities

- Employee: System employees
- Role: Functions/positions
- Permission: Granular permissions
- SupplyRealTime: Current stock of supplies
- SupplyHistory: History of supply movements
- Product: Registered products
- ProductIngredient: Product recipes
- Outflow: Stock outflows
- Sale: Sales made
- SaleItems: Items from each sale
- RefreshTokenEmployee: Authentication tokens
- JWTBlacklist: Invalidated tokens
- LogEmployee: Access logs

### Relationships

<img src="https://github.com/LucasNasc3000/stm-nest/blob/master/images/stm-nest-db%20-%20publicUpdated.png" width=820 heigth=820/>

### 🔄 Migrations

All migrations are already in repository. To create a new one:<br>

```
# 1. Modifique your entities
# 2. Generate the migration
npm run migration:generate

# 3. Review the file generated in migrations/
# 4. Run the migration
npm run migration:run
```

### 📚 Main Endpoints

```
### Auth

POST   /auth              - Login
POST   /auth/logout       - Logout
POST   /refresh           - Reissue tokens


### Employees

POST   /employees                    - Create employee
GET    /employees/search/email/:email
GET    /employees/search/name
GET    /employees/search/role
PATCH  /employees/update/self/:id
PATCH  /employees/update/admin/:id


### Roles and Permissions

POST   /roles             - Create role
PATCH  /roles/:id         - Update role


### Supplies

POST   /supplies          - Create supply
GET    /supplies/search/:field
PATCH  /supplies/:id      - Update supply


### Products

POST   /products/create/withRecipe
POST   /products/create/withoutRecipe
GET    /products/search/:field
PATCH  /products/update/general/:id
PATCH  /products/update/price/:id


### Outflows

POST   /outflows/create/supply
POST   /outflows/create/product
GET    /outflows/search/:field


### Sales
POST   /sales
GET    /sales/search/:field
PATCH  /sales/:id
```

All routes (except `/auth` and `/refresh`) require authentication via JWT and appropriate permissions. To test a route without authentication, use the @Public() decorator, and if you want to skip the CSRF check, use @SkipCsrf(), both located in `src/auth/decorators/`

## 📝 Version Notes 2.0

### Main Changes from v1.0 → v2.0

- Framework: Express → NestJS
- ORM: Sequelize → TypeORM
- Database: MySQL → PostgreSQL
- Permissions: Hardcoded Strings → RBAC with entities
- Authentication: Simple JWT → JWT + Refresh Tokens + CSRF
- Validation: Removed CPF field (unnecessary for the context)
- Soft Delete: deletedAt → is_active (only Product and SupplyRealTime)
- Security: Added rate limiting, helmet, configurable CORS
- Architecture: Monolithic → Modular (NestJS modules)

## 👨‍💻 Author

**Lucas Nascimento Fortunato**<br>
📧 lucasfortunato328@gmail.com<br>
💼 [LinkedIn](https://www.linkedin.com/in/lucas-nascimento-fortunato-b63162297)

## 📄 License

This project is licensed under **AGPL-3.0-only**.

💡 For Students: Feel free to clone, study, and run this project locally. You are under no obligation to publish your changes if the use is solely for personal learning. If you decide to host a modified version publicly, remember the AGPLv3 guidelines regarding source sharing.
