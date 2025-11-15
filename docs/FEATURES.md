# Advanced Features

Documentação das features avançadas implementadas no framework.

## Índice

- [Validação com Zod](#validação-com-zod)
- [Logging Estruturado](#logging-estruturado)
- [Error Handling Global](#error-handling-global)
- [Secrets Manager](#secrets-manager)
- [Middleware System](#middleware-system)
- [Rate Limiting](#rate-limiting)
- [Health Checks Detalhados](#health-checks-detalhados)
- [X-Ray Tracing](#x-ray-tracing)
- [CloudWatch Alarms](#cloudwatch-alarms)
- [CI/CD Pipeline](#cicd-pipeline)
- [OpenAPI Documentation](#openapi-documentation)

---

## Validação com Zod

### Visão Geral

Validação robusta de inputs com Zod, garantindo type-safety e mensagens de erro detalhadas.

### Uso

```typescript
import { validate } from './validation/validator';
import { createUserSchema } from './validation/schemas';

// Validar input
const validatedData = validate(createUserSchema, requestBody);
```

### Schemas Disponíveis

- `createUserSchema` - Validação para criação de usuários
- `updateUserSchema` - Validação para atualização de usuários
- `sendEmailSchema` - Validação para envio de emails
- `paginationSchema` - Validação de parâmetros de paginação

### Criar Novos Schemas

```typescript
import { z } from 'zod';

export const mySchema = z.object({
  field: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().positive(),
});
```

---

## Logging Estruturado

### Visão Geral

Sistema de logging estruturado com Winston, incluindo contexto de requisição e correlation IDs.

### Uso Básico

```typescript
import { log } from './utils/logger';

// Diferentes níveis
log.debug('Debug message', { data: 'value' });
log.info('Info message', { userId: '123' });
log.warn('Warning message');
log.error('Error occurred', error, { context: 'data' });
```

### Logs Especializados

```typescript
// Performance logging
log.logPerformance('operationName', durationMs, { additional: 'data' });

// Business events
log.logEvent('user.created', { userId, email });

// Request logging (automático via middleware)
log.logRequest(event);
log.logResponse(statusCode, duration);
```

### Contexto de Requisição

```typescript
import { loggerContext } from './utils/logger';

// Definir contexto (feito automaticamente pelo middleware)
loggerContext.setContext({
  correlationId: 'abc-123',
  userId: 'user-456',
});

// Logs subsequentes incluirão este contexto automaticamente
log.info('Processing request'); // Inclui correlationId e userId
```

### Configuração

```env
LOG_LEVEL=info  # debug, info, warn, error
NODE_ENV=production
```

---

## Error Handling Global

### Visão Geral

Sistema de error handling com classes de erro customizadas e tratamento unificado.

### Classes de Erro

```typescript
import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  TooManyRequestsError,
  InternalServerError,
  ServiceUnavailableError,
} from './utils/errors';
```

### Uso

```typescript
// Lançar erro
throw new BadRequestError('Invalid input', { field: 'email' });
throw new NotFoundError('User not found');
throw new ConflictError('Email already exists');

// Erro com detalhes
throw new ValidationError('Validation failed', {
  errors: [{ field: 'email', message: 'Invalid format' }],
});
```

### Wrapper Assíncrono

```typescript
import { asyncHandler } from './utils/errors';

export const handler = asyncHandler(async (event, context) => {
  // Erros são capturados e tratados automaticamente
  throw new NotFoundError('Resource not found');
});
```

### Tratamento Automático

O middleware de error handling captura todos os erros e retorna respostas apropriadas:

```json
{
  "success": false,
  "error": {
    "message": "Resource not found",
    "details": {}
  }
}
```

---

## Secrets Manager

### Visão Geral

Integração com AWS Secrets Manager para gerenciamento seguro de credenciais.

### Uso

```typescript
import { secretsService } from './services/secrets.service';

// Obter secret completo
const dbCredentials = await secretsService.getSecret('prod/database/credentials');

// Obter chave específica
const apiKey = await secretsService.getSecretKey('prod/api-keys', 'stripe');

// Helpers pré-configurados
const dbCreds = await secretsService.getDatabaseCredentials();
const stripeKey = await secretsService.getApiKey('stripe');
const encKey = await secretsService.getEncryptionKey();
```

### Cache

Secrets são cacheados por 5 minutos para melhor performance:

```typescript
// Forçar bypass do cache
const secret = await secretsService.getSecret('secret-name', false);

// Limpar cache
secretsService.clearCache('secret-name'); // Específico
secretsService.clearCache(); // Todos
```

### Configuração

```yaml
# serverless.yml
provider:
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - secretsmanager:GetSecretValue
          Resource: !Sub 'arn:aws:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:${self:provider.stage}/*'
```

---

## Middleware System

### Visão Geral

Sistema de middleware composable para Lambda handlers.

### Middlewares Disponíveis

1. **correlationIdMiddleware** - Adiciona correlation IDs
2. **requestLoggingMiddleware** - Logging de requisições
3. **errorHandlingMiddleware** - Tratamento de erros
4. **performanceMiddleware** - Métricas de performance
5. **corsMiddleware** - Headers CORS

### Uso

```typescript
import { withMiddleware } from './middleware';

const myHandler = async (event, context) => {
  // Lógica do handler
  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};

// Aplicar middleware padrão
export const handler = withMiddleware(myHandler);
```

### Middleware Customizado

```typescript
import { composeMiddleware, Middleware } from './middleware';

const customMiddleware: Middleware = (handler, ctx) => {
  return async (event, context) => {
    // Antes do handler
    console.log('Before');

    const result = await handler(event, context);

    // Depois do handler
    console.log('After');

    return result;
  };
};

// Compor middlewares
export const handler = composeMiddleware(
  customMiddleware,
  errorHandlingMiddleware
)(myHandler);
```

### Correlation IDs

Automaticamente adiciona e propaga correlation IDs:

```
Request Header: X-Correlation-Id: abc-123
ou
Auto-gerado: uuid-v4

Response Header: X-Correlation-Id: abc-123
Logs: Todos incluem correlationId
```

---

## Rate Limiting

### Visão Geral

Sistema de rate limiting baseado em DynamoDB com suporte a IP e usuário autenticado.

### Configuração

```typescript
import { RateLimiter } from './middleware/rateLimit';

// Criar rate limiter customizado
const limiter = new RateLimiter({
  points: 100, // 100 requisições
  duration: 60, // por 60 segundos
  blockDuration: 300, // Bloquear por 5 minutos após exceder
});

// Verificar limite
await limiter.checkLimit(event, '/users');
```

### Rate Limiters Pré-configurados

```typescript
import {
  defaultRateLimiter, // 100 req/min
  strictRateLimiter, // 10 req/min, bloqueia 5 min
  authRateLimiter, // 5 req/5min para autenticação
} from './middleware/rateLimit';

// Usar no handler
await defaultRateLimiter.checkLimit(event);
```

### Identificação

- **Usuário autenticado**: `user:${userId}`
- **Não autenticado**: `ip:${ipAddress}`

### Tabela DynamoDB

```yaml
RateLimitTable:
  Type: AWS::DynamoDB::Table
  Properties:
    BillingMode: PAY_PER_REQUEST
    TimeToLiveSpecification:
      AttributeName: expiresAt
      Enabled: true
```

---

## Health Checks Detalhados

### Endpoints

```
GET /health                 # Basic health check
GET /health?detailed=true   # Detailed health check
GET /liveness              # Liveness probe (K8s-style)
GET /readiness             # Readiness probe (K8s-style)
```

### Health Check Detalhado

Retorna:

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "checks": {
      "api": { "status": "up" },
      "dynamodb": {
        "status": "up",
        "latency": 45,
        "details": {
          "tableName": "...",
          "tableStatus": "ACTIVE"
        }
      },
      "ses": { "status": "up", "latency": 12 },
      "memory": {
        "status": "up",
        "message": "Memory usage: 128MB / 256MB (50.0%)"
      }
    },
    "metadata": {
      "timestamp": "2024-01-15T10:30:00.000Z",
      "uptime": 3600000,
      "version": "1.0.0",
      "environment": "production",
      "service": "serverless-api-framework"
    }
  }
}
```

### Status

- `healthy` - Tudo funcionando
- `degraded` - Problemas parciais
- `unhealthy` - Sistema down

---

## X-Ray Tracing

### Configuração

Habilitado automaticamente no `serverless.yml`:

```yaml
provider:
  tracing:
    lambda: true
    apiGateway: true
```

### Visualização

Acesse AWS X-Ray Console para ver:
- Traces distribuídos
- Service map
- Latências por componente
- Erros e throttling

### Custo

- Primeiros 100k traces/mês: GRÁTIS
- Depois: $5.00 por 1M traces

---

## CloudWatch Alarms

### Alarmes Configurados

1. **HighErrorRateAlarm** - Taxa de erro > 10 em 5 minutos
2. **HighDurationAlarm** - Duração média > 10 segundos
3. **ThrottlingAlarm** - Throttling detectado

### SNS Topic

Alarmes enviam notificações para:
```
Topic: serverless-api-framework-{stage}-alerts
```

### Inscrever-se em Alarmes

```bash
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:xxx:serverless-api-framework-prod-alerts \
  --protocol email \
  --notification-endpoint your-email@example.com
```

### Dashboard CloudWatch

Dashboard automático criado com métricas:
- Lambda: Invocações, Erros, Throttles, Duration
- API Gateway: Count, 4XX, 5XX

Acesso via Outputs do CloudFormation.

---

## CI/CD Pipeline

### Workflows GitHub Actions

**1. CI Pipeline** (`.github/workflows/ci.yml`)
- Lint (ESLint + Prettier)
- Unit tests
- Integration tests
- Security scan (npm audit + Snyk)
- Build

**2. Deploy Pipeline** (`.github/workflows/deploy.yml`)
- Deploy para AWS
- Integration tests
- Rollback automático em falhas
- Notificações Slack

### Secrets Necessários

```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
SES_FROM_EMAIL
SLACK_WEBHOOK_URL (opcional)
SNYK_TOKEN (opcional)
```

### Manual Deployment

```bash
# Via GitHub Actions
# Ir para Actions > Deploy > Run workflow > Selecionar stage

# Ou localmente
cd backend
serverless deploy --stage prod
```

---

## OpenAPI Documentation

### Visualizar Documentação

```bash
# Swagger Editor
npm install -g swagger-ui-express
swagger-ui docs/openapi.yml
```

### Endpoints Documentados

- GET /health
- POST /users
- GET /users
- GET /users/{id}
- PUT /users/{id}
- DELETE /users/{id}
- POST /email/send

### Schemas

Todos os requests/responses estão documentados com:
- Tipos de dados
- Validações
- Exemplos
- Descrições

---

## Próximas Features

Planejadas para futuras versões:

- [ ] GraphQL API
- [ ] WebSocket support
- [ ] Multi-region deployment
- [ ] Caching layer (Redis/ElastiCache)
- [ ] Scheduled jobs (EventBridge)
- [ ] File upload (S3 presigned URLs)
- [ ] API versioning
- [ ] Feature flags
- [ ] WAF rules

---

## Métricas e Custos

### Overhead de Performance

- Middleware: ~5-10ms
- Validation (Zod): ~1-3ms
- Logging: ~1-2ms
- Rate limiting: ~10-20ms (DynamoDB call)

**Total overhead estimado: ~20-35ms**

### Custos Adicionais

- X-Ray: Primeiros 100k traces/mês GRÁTIS
- CloudWatch Logs: ~$0.50/GB
- CloudWatch Alarms: $0.10/alarme/mês
- DynamoDB (rate limit table): ~$0.25/mês
- SNS: Primeiras 1k notificações GRÁTIS

**Total adicional estimado: ~$1-2/mês**

---

## Troubleshooting

### Logs não aparecem

```bash
# Verificar CloudWatch
aws logs tail /aws/lambda/function-name --follow

# Verificar log level
export LOG_LEVEL=debug
```

### Rate limiting muito restritivo

```typescript
// Ajustar limites
const customLimiter = new RateLimiter({
  points: 1000, // Aumentar limite
  duration: 60,
});
```

### X-Ray não funciona

```bash
# Verificar permissões IAM
# Verificar plugin instalado
npm install --save-dev serverless-plugin-tracing
```

### Alarmes falsos

```yaml
# Ajustar thresholds no serverless.yml
Threshold: 50  # Aumentar threshold
EvaluationPeriods: 3  # Mais períodos antes de alarmar
```

---

## Best Practices

1. **Logging**
   - Use níveis apropriados (debug em dev, info em prod)
   - Inclua contexto relevante
   - Não logue dados sensíveis

2. **Validação**
   - Valide todos os inputs
   - Retorne mensagens de erro claras
   - Use schemas reutilizáveis

3. **Error Handling**
   - Use classes de erro apropriadas
   - Logue erros com contexto
   - Não exponha detalhes internos em produção

4. **Performance**
   - Monitor X-Ray traces
   - Otimize consultas DynamoDB
   - Use cache quando apropriado

5. **Segurança**
   - Use Secrets Manager
   - Aplique rate limiting
   - Valide TODOS os inputs
   - Mantenha dependências atualizadas
