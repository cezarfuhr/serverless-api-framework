# API Documentation

Documentação completa dos endpoints da API.

## Base URL

**Development:** `http://localhost:3001`
**Production:** `https://api.yourdomain.com`

## Autenticação

A maioria dos endpoints requer autenticação via JWT token obtido do AWS Cognito.

### Headers

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

## Endpoints

### Health Check

Verifica o status da API.

**Endpoint:** `GET /health`
**Autenticação:** Não requerida

**Response 200:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "service": "serverless-api-framework"
  }
}
```

---

### Users

#### Create User

Cria um novo usuário.

**Endpoint:** `POST /users`
**Autenticação:** Não requerida

**Request Body:**
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "SecurePass123!"
}
```

**Validations:**
- `email`: Formato válido de email
- `name`: Obrigatório
- `password`: Mínimo 8 caracteres, deve conter maiúsculas, minúsculas, números e símbolos

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-v4",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Errors:**
- `400`: Validação falhou
- `409`: Email já existe
- `500`: Erro interno

---

#### Get User

Obtém detalhes de um usuário específico.

**Endpoint:** `GET /users/{id}`
**Autenticação:** Requerida

**Path Parameters:**
- `id`: ID do usuário (UUID)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-v4",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Errors:**
- `401`: Não autenticado
- `404`: Usuário não encontrado
- `500`: Erro interno

---

#### List Users

Lista todos os usuários.

**Endpoint:** `GET /users`
**Autenticação:** Requerida

**Response 200:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid-v4",
        "email": "user@example.com",
        "name": "John Doe",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "count": 1
  }
}
```

**Errors:**
- `401`: Não autenticado
- `500`: Erro interno

---

#### Update User

Atualiza dados de um usuário.

**Endpoint:** `PUT /users/{id}`
**Autenticação:** Requerida

**Path Parameters:**
- `id`: ID do usuário (UUID)

**Request Body:**
```json
{
  "name": "Jane Doe"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-v4",
    "email": "user@example.com",
    "name": "Jane Doe",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T11:30:00.000Z"
  }
}
```

**Errors:**
- `400`: Validação falhou
- `401`: Não autenticado
- `404`: Usuário não encontrado
- `500`: Erro interno

---

#### Delete User

Remove um usuário.

**Endpoint:** `DELETE /users/{id}`
**Autenticação:** Requerida

**Path Parameters:**
- `id`: ID do usuário (UUID)

**Response 204:**
```
No content
```

**Errors:**
- `401`: Não autenticado
- `404`: Usuário não encontrado
- `500`: Erro interno

---

### Email

#### Send Email

Envia um email.

**Endpoint:** `POST /email/send`
**Autenticação:** Requerida

**Request Body:**
```json
{
  "to": ["recipient@example.com"],
  "subject": "Email Subject",
  "body": "Plain text body",
  "html": "<h1>HTML body</h1>"
}
```

**Fields:**
- `to`: Array de emails (obrigatório)
- `subject`: Assunto do email (obrigatório)
- `body`: Corpo em texto puro (obrigatório)
- `html`: Corpo em HTML (opcional)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "message": "Email sent successfully",
    "recipients": 1
  }
}
```

**Errors:**
- `400`: Validação falhou ou email inválido
- `401`: Não autenticado
- `500`: Erro ao enviar email

---

## Error Responses

Todos os erros seguem o formato:

```json
{
  "success": false,
  "error": "Error message description"
}
```

### Status Codes

- `200`: Sucesso
- `201`: Criado com sucesso
- `204`: Sucesso sem conteúdo
- `400`: Bad Request (validação)
- `401`: Não autenticado
- `403`: Não autorizado
- `404`: Recurso não encontrado
- `409`: Conflito (ex: email duplicado)
- `500`: Erro interno do servidor

## Rate Limiting

**Development:** Sem limite
**Production:** 100 requisições por minuto por IP

Quando o limite é excedido:
```json
{
  "success": false,
  "error": "Rate limit exceeded. Try again later."
}
```

## CORS

A API permite requisições de qualquer origem em desenvolvimento.

Em produção, configure origens permitidas em `serverless.yml`:

```yaml
functions:
  functionName:
    events:
      - http:
          cors:
            origin: 'https://yourdomain.com'
            headers:
              - Content-Type
              - Authorization
```

## Webhooks

(Futuro) A API suportará webhooks para eventos:
- `user.created`
- `user.updated`
- `user.deleted`
- `email.sent`
- `email.failed`

## Versionamento

API versão: `v1`

Futuras versões serão acessíveis via path:
- `https://api.yourdomain.com/v1/users`
- `https://api.yourdomain.com/v2/users`

## SDKs

SDKs oficiais planejados:
- JavaScript/TypeScript
- Python
- Go
- Java

## Exemplos

### cURL

```bash
# Health check
curl https://api.yourdomain.com/health

# Create user
curl -X POST https://api.yourdomain.com/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "name": "John Doe",
    "password": "SecurePass123!"
  }'

# Get user (authenticated)
curl https://api.yourdomain.com/users/123 \
  -H "Authorization: Bearer <token>"
```

### JavaScript

```javascript
const response = await fetch('https://api.yourdomain.com/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    name: 'John Doe',
    password: 'SecurePass123!'
  })
});

const data = await response.json();
console.log(data);
```

### Python

```python
import requests

response = requests.post(
    'https://api.yourdomain.com/users',
    json={
        'email': 'user@example.com',
        'name': 'John Doe',
        'password': 'SecurePass123!'
    }
)

print(response.json())
```
