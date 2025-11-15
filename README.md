# Serverless API Framework

Framework completo para construir APIs serverless escaláveis com AWS Lambda e API Gateway.

## Features

- ⚡ **AWS Lambda** - Funções serverless de alta performance
- 🚪 **API Gateway** - API REST totalmente gerenciada
- 🗄️ **DynamoDB** - Banco de dados NoSQL escalável
- 🔐 **Cognito** - Autenticação e autorização de usuários
- 📧 **SES** - Serviço de envio de emails
- 💰 **Cost Optimized** - Otimizado para custos AWS
- 🎯 **TypeScript** - Type-safe em todo o projeto
- 🧪 **Comprehensive Testing** - Testes unitários, integração e E2E
- 🐳 **Docker** - Ambiente de desenvolvimento local completo

## Stack Tecnológica

- **Backend**: Node.js 20, TypeScript
- **Framework**: Serverless Framework
- **IaC**: AWS SAM, CloudFormation
- **Frontend**: React 18, Vite
- **Testing**: Jest
- **DevOps**: Docker, Docker Compose

## Estrutura do Projeto

```
serverless-api-framework/
├── backend/                 # Microsserviço backend
│   ├── src/
│   │   ├── handlers/       # Lambda handlers
│   │   ├── services/       # Serviços AWS (DynamoDB, Cognito, SES)
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utilitários
│   ├── serverless.yml      # Configuração Serverless Framework
│   ├── package.json
│   └── tsconfig.json
├── frontend/               # Microsserviço frontend
│   ├── src/
│   │   ├── api/           # Cliente API
│   │   ├── components/    # Componentes React
│   │   ├── pages/         # Páginas
│   │   └── types/         # TypeScript types
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.ts
├── tests/                  # Testes
│   ├── unit/              # Testes unitários
│   ├── integration/       # Testes de integração
│   └── e2e/               # Testes E2E
├── docker-compose.yml      # Desenvolvimento local
└── README.md
```

## Quick Start

### Pré-requisitos

- Node.js 20+
- Docker & Docker Compose
- AWS CLI (para deploy)
- Conta AWS (para deploy em produção)

### Instalação

1. Clone o repositório:
```bash
git clone https://github.com/your-org/serverless-api-framework.git
cd serverless-api-framework
```

2. Instale as dependências:
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
# Edite .env com suas configurações
```

### Desenvolvimento Local

Inicie todo o ambiente com Docker Compose:

```bash
npm run local
```

Isso iniciará:
- **LocalStack** (simulação AWS local) em http://localhost:4566
- **DynamoDB Admin** em http://localhost:8001
- **Backend API** em http://localhost:3001
- **Frontend** em http://localhost:3000

### Executar Backend e Frontend Separadamente

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

## Testes

### Todos os testes
```bash
npm test
```

### Testes unitários
```bash
npm run test:unit
```

### Testes de integração
```bash
npm run test:integration
```

### Testes E2E
```bash
npm run test:e2e
```

### Cobertura de testes
```bash
npm run test:coverage
```

## Deploy

### Deploy para AWS

1. Configure suas credenciais AWS:
```bash
aws configure
```

2. Deploy do backend:
```bash
cd backend
npm run deploy
```

3. Deploy para produção:
```bash
npm run deploy:prod
```

### Remover recursos da AWS
```bash
cd backend
npm run remove
```

## API Endpoints

### Health Check
```
GET /health
```

### Users
```
POST   /users           # Criar usuário
GET    /users           # Listar usuários (autenticado)
GET    /users/{id}      # Obter usuário (autenticado)
PUT    /users/{id}      # Atualizar usuário (autenticado)
DELETE /users/{id}      # Deletar usuário (autenticado)
```

### Email
```
POST   /email/send      # Enviar email (autenticado)
```

## Documentação

- [Guia de Deploy](docs/DEPLOYMENT.md)
- [Documentação da API](docs/API.md)
- [Otimização de Custos](docs/COST-OPTIMIZATION.md)

## Autenticação

O framework usa AWS Cognito para autenticação. Para endpoints protegidos, inclua o token JWT no header:

```
Authorization: Bearer <token>
```

## Segurança

- ✅ Validação de input em todos os endpoints
- ✅ Autenticação JWT com Cognito
- ✅ CORS configurado corretamente
- ✅ Secrets em variáveis de ambiente
- ✅ IAM roles com least privilege
- ✅ Encryption at rest (DynamoDB)
- ✅ HTTPS obrigatório

## Custos Estimados

Para 100k requisições/mês:
- Lambda: ~$0.20
- API Gateway: ~$0.35
- DynamoDB: ~$1.25
- Cognito: Grátis (até 50k MAU)
- SES: ~$0.10

**Total estimado: ~$2/mês** (Free tier aplicado)

Veja mais detalhes em [Otimização de Custos](docs/COST-OPTIMIZATION.md).

## Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/amazing-feature`)
3. Commit suas mudanças (`git commit -m 'Add amazing feature'`)
4. Push para a branch (`git push origin feature/amazing-feature`)
5. Abra um Pull Request

## License

MIT

## Roadmap

- [ ] GraphQL API
- [ ] WebSocket support
- [ ] Multi-region deployment
- [ ] CI/CD pipelines
- [ ] Monitoring dashboard
- [ ] Rate limiting
- [ ] API versioning
- [ ] Swagger/OpenAPI docs