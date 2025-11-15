# Deployment Guide

Guia completo para deploy do Serverless API Framework na AWS.

## Pré-requisitos

1. **Conta AWS**
   - Conta AWS ativa
   - Acesso programático configurado
   - Permissões IAM adequadas

2. **Ferramentas Instaladas**
   - AWS CLI configurado
   - Node.js 20+
   - Serverless Framework CLI

## Configuração Inicial

### 1. Configurar AWS CLI

```bash
aws configure
```

Forneça:
- AWS Access Key ID
- AWS Secret Access Key
- Default region (ex: us-east-1)
- Output format (json)

Verifique a configuração:
```bash
aws sts get-caller-identity
```

### 2. Configurar SES

Antes do deploy, configure o SES:

```bash
# Verificar email de envio
aws ses verify-email-identity --email-address noreply@yourdomain.com

# Verificar domínio (opcional)
aws ses verify-domain-identity --domain yourdomain.com
```

⚠️ **Importante**: Por padrão, SES está em sandbox mode. Para produção:
```bash
# Solicitar saída do sandbox
aws ses put-account-sending-enabled --enabled
```

### 3. Configurar Variáveis de Ambiente

Edite `backend/serverless.yml` e atualize:

```yaml
provider:
  environment:
    SES_FROM_EMAIL: 'noreply@yourdomain.com'
```

## Deploy para Development

```bash
cd backend
npm run deploy
```

Ou explicitamente:
```bash
serverless deploy --stage dev
```

Outputs esperados:
```
Service Information
service: serverless-api-framework
stage: dev
region: us-east-1
stack: serverless-api-framework-dev
api keys:
  None
endpoints:
  GET - https://xxxxx.execute-api.us-east-1.amazonaws.com/dev/health
  POST - https://xxxxx.execute-api.us-east-1.amazonaws.com/dev/users
  ...
functions:
  healthCheck: serverless-api-framework-dev-healthCheck
  createUser: serverless-api-framework-dev-createUser
  ...
```

## Deploy para Production

```bash
serverless deploy --stage prod
```

### Checklist de Produção

Antes do deploy para produção:

- [ ] Revisar limites de concorrência Lambda
- [ ] Configurar alarmes CloudWatch
- [ ] Habilitar X-Ray para tracing
- [ ] Configurar backup do DynamoDB
- [ ] Revisar políticas IAM
- [ ] Configurar domínio customizado
- [ ] Habilitar logging de acesso API Gateway
- [ ] Configurar WAF (opcional)
- [ ] Revisar retention de logs
- [ ] Configurar dead letter queue

### Configurações Recomendadas para Produção

Atualize `serverless.yml`:

```yaml
provider:
  stage: prod
  memorySize: 512
  timeout: 30
  reservedConcurrency: 10

  tracing:
    lambda: true
    apiGateway: true

  logs:
    restApi:
      accessLogging: true
      executionLogging: true
      level: INFO

resources:
  Resources:
    DynamoDBTable:
      Properties:
        BillingMode: PROVISIONED
        ProvisionedThroughput:
          ReadCapacityUnits: 5
          WriteCapacityUnits: 5
        PointInTimeRecoverySpecification:
          PointInTimeRecoveryEnabled: true
```

## Deploy Frontend

### Build Produção

```bash
cd frontend
npm run build
```

### Deploy no S3 + CloudFront

1. Criar bucket S3:
```bash
aws s3 mb s3://your-app-frontend --region us-east-1
```

2. Configurar bucket para hosting:
```bash
aws s3 website s3://your-app-frontend --index-document index.html
```

3. Upload dos arquivos:
```bash
aws s3 sync dist/ s3://your-app-frontend --delete
```

4. Criar distribuição CloudFront (opcional):
```bash
aws cloudfront create-distribution \
  --origin-domain-name your-app-frontend.s3.amazonaws.com \
  --default-root-object index.html
```

## Domínio Customizado

### 1. Certificado SSL

Crie certificado no ACM:
```bash
aws acm request-certificate \
  --domain-name api.yourdomain.com \
  --validation-method DNS \
  --region us-east-1
```

### 2. Configurar API Gateway

Adicione ao `serverless.yml`:

```yaml
plugins:
  - serverless-domain-manager

custom:
  customDomain:
    domainName: api.yourdomain.com
    certificateName: api.yourdomain.com
    basePath: ''
    stage: ${self:provider.stage}
    createRoute53Record: true
```

Deploy:
```bash
serverless create_domain
serverless deploy
```

## Monitoramento Pós-Deploy

### CloudWatch Logs

Visualizar logs:
```bash
serverless logs -f functionName -t
```

### CloudWatch Metrics

Principais métricas para monitorar:
- Lambda Invocations
- Lambda Errors
- Lambda Duration
- API Gateway 4xx/5xx
- DynamoDB Throttles

### Criar Alarmes

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name high-error-rate \
  --alarm-description "Alert when error rate is high" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold
```

## Rollback

Em caso de problemas:

```bash
# Listar deployments
serverless deploy list

# Rollback para versão anterior
serverless rollback -t timestamp
```

## Remover Stack

⚠️ **CUIDADO**: Remove todos os recursos!

```bash
serverless remove --stage dev
```

Para produção, sempre confirme:
```bash
serverless remove --stage prod --verbose
```

## CI/CD

### GitHub Actions

Crie `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          cd backend
          npm ci

      - name: Deploy
        run: |
          cd backend
          npm run deploy:prod
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## Troubleshooting

### Erro: Insufficient permissions

Solução: Verifique IAM policies:
```bash
aws iam get-user-policy --user-name your-user --policy-name your-policy
```

### Erro: Stack rollback failed

Solução: Deletar stack manualmente:
```bash
aws cloudformation delete-stack --stack-name serverless-api-framework-dev
```

### Erro: Rate exceeded

Solução: Aguardar ou solicitar aumento de limites:
```bash
aws service-quotas list-service-quotas --service-code lambda
```

## Custos

### Estimativa Mensal

**Ambiente de Development:**
- Lambda: $0 (free tier)
- API Gateway: $0 (free tier)
- DynamoDB: $0 (free tier)
- Total: ~$0/mês

**Produção (100k req/mês):**
- Lambda: ~$0.20
- API Gateway: ~$0.35
- DynamoDB: ~$1.25
- CloudWatch: ~$0.50
- Total: ~$2.30/mês

### Otimizar Custos

1. Use DynamoDB on-demand pricing
2. Configure Lambda memory apropriadamente
3. Habilite API Gateway caching
4. Configure log retention adequado
5. Use Reserved Capacity para cargas previsíveis

## Segurança

### Checklist

- [ ] Secrets em Secrets Manager
- [ ] IAM roles com least privilege
- [ ] Habilitar CloudTrail
- [ ] Configurar VPC (se necessário)
- [ ] Habilitar encryption at rest
- [ ] Configurar WAF rules
- [ ] Rate limiting
- [ ] Input validation

## Próximos Passos

Após deploy bem-sucedido:

1. Configurar monitoramento
2. Criar runbook de incidentes
3. Documentar arquitetura
4. Treinar equipe
5. Planejar DR (Disaster Recovery)
