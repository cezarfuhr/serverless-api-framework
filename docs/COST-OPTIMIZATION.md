# Cost Optimization Guide

Guia completo de otimização de custos para o Serverless API Framework.

## Visão Geral

O framework foi projetado com custo-eficiência em mente, mas há várias estratégias adicionais para otimizar ainda mais os custos.

## Calculadora de Custos

### Estimativas Mensais

#### Cenário 1: Startup (10k requisições/mês)
```
Lambda:
  - Requisições: 10,000 × $0.20/1M = $0.002
  - Compute: 10,000 × 200ms × 256MB = $0.003

API Gateway:
  - Requisições: 10,000 × $3.50/1M = $0.035

DynamoDB:
  - Storage: 1GB × $0.25 = $0.25
  - Read/Write: On-demand = $0.50

Cognito: Free (< 50k MAU)
SES: 10,000 × $0.10/1k = $1.00

Total: ~$1.79/mês
```

#### Cenário 2: Crescimento (100k requisições/mês)
```
Lambda: $0.20
API Gateway: $0.35
DynamoDB: $1.25
Cognito: Free
SES: $10.00

Total: ~$11.80/mês
```

#### Cenário 3: Scale (1M requisições/mês)
```
Lambda: $2.00
API Gateway: $3.50
DynamoDB: $12.50
Cognito: $27.50 (55k MAU)
SES: $100.00
CloudWatch: $5.00

Total: ~$150.50/mês
```

## Otimizações por Serviço

### 1. Lambda

#### Memory Configuration

```yaml
# ❌ Não otimizado
provider:
  memorySize: 1024

# ✅ Otimizado
provider:
  memorySize: 256  # Ajuste baseado em profiling
```

**Ferramenta de profiling:**
```bash
# Instalar Lambda Power Tuning
npm install -g aws-lambda-power-tuning

# Executar análise
lambda-power-tuning --function myFunction
```

#### Timeout

```yaml
# ❌ Timeout muito alto
functions:
  myFunction:
    timeout: 30

# ✅ Timeout otimizado
functions:
  myFunction:
    timeout: 10  # Apenas o necessário
```

#### Reserved Concurrency

```yaml
# Para produção, limite concorrência
functions:
  myFunction:
    reservedConcurrency: 5  # Previne custos inesperados
```

#### Cold Start Optimization

```javascript
// ❌ Imports dentro da função
export const handler = async (event) => {
  const AWS = require('aws-sdk');
  // ...
};

// ✅ Imports no topo
const AWS = require('aws-sdk');
const client = new AWS.DynamoDB.DocumentClient();

export const handler = async (event) => {
  // Usa cliente já inicializado
};
```

### 2. DynamoDB

#### On-Demand vs Provisioned

**On-Demand (recomendado para cargas variáveis):**
```yaml
DynamoDBTable:
  Type: AWS::DynamoDB::Table
  Properties:
    BillingMode: PAY_PER_REQUEST  # Paga pelo que usar
```

**Provisioned (recomendado para cargas previsíveis):**
```yaml
DynamoDBTable:
  Properties:
    BillingMode: PROVISIONED
    ProvisionedThroughput:
      ReadCapacityUnits: 5
      WriteCapacityUnits: 5
```

#### Auto Scaling

```yaml
DynamoDBTable:
  Properties:
    BillingMode: PROVISIONED

AutoScalingTarget:
  Type: AWS::ApplicationAutoScaling::ScalableTarget
  Properties:
    MaxCapacity: 100
    MinCapacity: 5
    ResourceId: !Sub table/${DynamoDBTable}
    ScalableDimension: dynamodb:table:ReadCapacityUnits
```

#### TTL (Time To Live)

```yaml
DynamoDBTable:
  Properties:
    TimeToLiveSpecification:
      AttributeName: expiresAt
      Enabled: true
```

```typescript
// Adicionar TTL aos items
await dynamoDBService.put({
  pk: 'SESSION#123',
  sk: 'SESSION#123',
  expiresAt: Math.floor(Date.now() / 1000) + 86400, // 24h
  // ...
});
```

#### Single Table Design

```typescript
// ❌ Múltiplas tabelas
await usersTable.get(...);
await ordersTable.get(...);
await productsTable.get(...);

// ✅ Single table design
await mainTable.query({
  KeyConditionExpression: 'pk = :pk',
  ExpressionAttributeValues: { ':pk': 'USER#123' }
});
```

### 3. API Gateway

#### Caching

```yaml
functions:
  getUser:
    events:
      - http:
          path: /users/{id}
          method: get
          caching:
            enabled: true
            ttlInSeconds: 300  # 5 minutos
```

**Custo:** $0.02/GB/h mas reduz chamadas Lambda

#### Compression

```yaml
provider:
  apiGateway:
    minimumCompressionSize: 1024  # Comprimir respostas > 1KB
```

### 4. CloudWatch

#### Log Retention

```yaml
functions:
  myFunction:
    logRetentionInDays: 7  # Não mantenha logs indefinidamente
```

**Custos de retenção:**
- 1 dia: Mais barato
- 7 dias: Recomendado para desenvolvimento
- 30 dias: Recomendado para produção
- 90+ dias: Apenas se necessário

#### Filtering Logs

```typescript
// ❌ Log tudo
console.log('Debug:', data);
console.log('Info:', info);

// ✅ Log apenas importante
if (process.env.NODE_ENV !== 'production') {
  console.log('Debug:', data);
}
console.error('Error:', error);  // Apenas erros em produção
```

#### Metric Filters

Crie métricas customizadas apenas para o necessário:

```bash
aws logs put-metric-filter \
  --log-group-name /aws/lambda/myFunction \
  --filter-name ErrorCount \
  --filter-pattern "ERROR" \
  --metric-transformations \
    metricName=ErrorCount,metricNamespace=MyApp,metricValue=1
```

### 5. S3 (para assets do frontend)

#### Storage Classes

```bash
# Lifecycle policy
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-bucket \
  --lifecycle-configuration file://lifecycle.json
```

```json
{
  "Rules": [{
    "Id": "Move old logs",
    "Status": "Enabled",
    "Transitions": [{
      "Days": 30,
      "StorageClass": "STANDARD_IA"
    }, {
      "Days": 90,
      "StorageClass": "GLACIER"
    }]
  }]
}
```

#### CloudFront

Use CloudFront para reduzir custos de transferência:

```yaml
# S3 transfer: $0.09/GB
# CloudFront transfer: $0.085/GB
# Economia: ~5-10%
```

### 6. SES

#### Sandbox vs Production

Saia do sandbox apenas quando necessário:
```bash
# Em sandbox: apenas emails verificados (GRÁTIS)
# Fora sandbox: qualquer email ($0.10/1k)
```

#### Email Templating

```typescript
// ❌ Email individual para cada usuário
users.forEach(user => {
  await ses.send({ to: user.email, ... });
});

// ✅ Email bulk
await ses.sendBulk({
  to: users.map(u => u.email),
  template: 'newsletter'
});
```

## Monitoria de Custos

### AWS Cost Explorer

```bash
# CLI para custos
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost
```

### Budget Alerts

```bash
aws budgets create-budget \
  --account-id 123456789012 \
  --budget file://budget.json \
  --notifications-with-subscribers file://notifications.json
```

```json
{
  "BudgetName": "Monthly Budget",
  "BudgetLimit": {
    "Amount": "10",
    "Unit": "USD"
  },
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST"
}
```

### Tags

```yaml
provider:
  tags:
    Project: serverless-api-framework
    Environment: ${self:provider.stage}
    CostCenter: engineering
```

## Estratégias Avançadas

### 1. Warm-up

Para evitar cold starts em produção:

```yaml
plugins:
  - serverless-plugin-warmup

custom:
  warmup:
    default:
      enabled: true
      events:
        - schedule: rate(5 minutes)
      concurrency: 1
```

**Custo:** ~$1/mês mas elimina cold starts

### 2. Step Functions

Para workflows complexos:

```yaml
# ❌ Múltiplas Lambdas encadeadas
# Lambda A → Lambda B → Lambda C
# Custo: 3 × invocações

# ✅ Step Functions
# Step Function coordena A, B, C
# Custo: 1 × Step Function + 3 × Lambda
```

### 3. SQS/SNS

Para processamento assíncrono:

```yaml
# ❌ Lambda síncrona aguardando processo longo
# Custo: Timeout alto × memória

# ✅ Lambda rápida + SQS + Lambda worker
# Custo: 2 × Lambda rápido + SQS (barato)
```

### 4. RDS Proxy (se usar RDS)

```yaml
# ❌ Conexão direta
# Cada Lambda cria conexão = alto custo

# ✅ RDS Proxy
# Pooling de conexões = menor custo
```

## Checklist de Otimização

- [ ] Lambda memory otimizada (power tuning)
- [ ] Timeouts ajustados ao mínimo necessário
- [ ] DynamoDB billing mode apropriado
- [ ] TTL configurado para dados temporários
- [ ] API Gateway caching habilitado
- [ ] Compression habilitada
- [ ] CloudWatch retention configurado
- [ ] Logs de debug apenas em dev
- [ ] Reserved concurrency em produção
- [ ] Cold start optimization
- [ ] Budget alerts configurados
- [ ] Tags de custo aplicadas
- [ ] S3 lifecycle policies
- [ ] CloudFront para assets
- [ ] SES em sandbox até necessário

## Ferramentas

1. **AWS Cost Explorer**: Análise de custos
2. **AWS Budgets**: Alertas de orçamento
3. **Lambda Power Tuning**: Otimizar memory/CPU
4. **AWS Trusted Advisor**: Recomendações
5. **CloudWatch Insights**: Análise de logs
6. **X-Ray**: Profiling distribuído

## ROI

### Serverless vs EC2

**Serverless (100k req/mês):**
- Custo: ~$12/mês
- Manutenção: Zero
- Escalabilidade: Automática

**EC2 t3.micro:**
- Custo: ~$8.50/mês
- Manutenção: Alta
- Escalabilidade: Manual

**Conclusão:** Serverless vale a pena para:
- Cargas variáveis
- Equipes pequenas
- Rapid iteration
- Escalabilidade automática

## Próximos Passos

1. Implementar power tuning
2. Configurar budget alerts
3. Revisar logs retention
4. Analisar custos mensalmente
5. Otimizar queries DynamoDB
