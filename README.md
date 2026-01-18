# Fintech – Commission System (Monorepo)

Sistema para el procesamiento de transacciones y liquidación de comisiones con arquitectura **reactiva** (Spring WebFlux + R2DBC + H2) y dashboard en **Angular** con actualizaciones en tiempo real mediante **Server-Sent Events (SSE)**.

---

## Estructura del repositorio

- `Backend/commission-backend` → Spring Boot (WebFlux) + H2 (R2DBC)
- `Frontend/commission-frontend` → Angular (standalone)

---

## Requisitos de la prueba (cobertura)

- Registrar transacciones y calcular comisión por regla de negocio.
- Persistencia relacional (H2) + listado de transacciones.
- Frontend con formulario + dashboard.
- Actualización en tiempo real (SSE).
- Pruebas unitarias (JUnit/Mockito / Reactor Test / Angular).

### Regla de negocio (comisión)
- Si `amount > 10000` → comisión = `5%`
- Si `amount <= 10000` → comisión = `2%`

---

## Prerrequisitos

### Backend
- Java 17  
- Maven Wrapper (incluido)

### Frontend
- Node 18+ (recomendado)
- npm 9+

Puertos por defecto:
- Backend: `http://localhost:8080`
- Frontend: `http://localhost:4200`

---

## Cómo ejecutar (modo desarrollo)

### 1) Backend (Spring Boot)
```bash
cd Backend/commission-backend
./mvnw clean test
./mvnw spring-boot:run
```

Backend disponible en:
- `http://localhost:8080`

> Nota: el backend usa **Spring Boot 3.5.9** (estable) para evitar dependencias de repositorios *snapshot* y asegurar que el evaluador lo ejecute sin fricción.

---

### 2) Frontend (Angular)
```bash
cd Frontend/commission-frontend
npm install
npm start
```

Frontend disponible en:
- `http://localhost:4200`

> Nota: el frontend usa proxy `/api` → `http://localhost:8080` para simplificar CORS en desarrollo.

---

## API (Backend)

Base URL: `http://localhost:8080`

### Crear transacción
- `POST /transactions`

**Request**
```json
{
  "amount": 12000
}
```

**Ejemplo**
```bash
curl -i -X POST http://localhost:8080/transactions \
  -H "Content-Type: application/json" \
  -d '{"amount": 12000}'
```

**Respuesta esperada**
- `201 Created`
- incluye `id`, `amount`, `commission`, `createdAt`

---

### Listar transacciones
- `GET /transactions`

```bash
curl http://localhost:8080/transactions
```

---

### Stream en tiempo real (SSE)
- `GET /transactions/stream` (content-type `text/event-stream`)

Eventos:
- `event: transaction` → se emite cuando se crea una transacción
- `: keepalive` → comentario keepalive cada ~10s (NO es un evento de datos)

Ejemplo:
```bash
curl -N http://localhost:8080/transactions/stream
```

---

## Frontend (Angular)

El frontend consume:
- `GET /api/transactions`
- `POST /api/transactions`
- `GET /api/transactions/stream` (EventSource)

### Proxy (dev)
Archivo `proxy.conf.json`:
- reescribe `/api/*` → `http://localhost:8080/*`

Esto evita problemas de CORS y mejora la estabilidad del stream SSE durante desarrollo.

---

## Pruebas

### Backend
```bash
cd Backend/commission-backend
./mvnw test
```

Cobertura típica:
- Regla de comisión (2% / 5%)
- Casos de uso reactivos con StepVerifier
- Controller tests con WebTestClient
- Validación de stream SSE

### Frontend
```bash
cd Frontend/commission-frontend
npm test
```
Cobertura típica (Frontend):
- `TransactionsService`:
  - `GET /api/transactions` y `POST /api/transactions` (HttpTestingController)
  - SSE: conexión/desconexión (onopen/onerror), recepción del evento `transaction`,
    tolerancia a JSON inválido y cierre de `EventSource` al desuscribirse
- `DashboardPage`:
  - Carga inicial y ordenamiento por `createdAt` desc
  - Métricas: total de transacciones, suma de montos y suma de comisiones
  - Validaciones del formulario (required / min) y submit (éxito + error)
  - Integración SSE en UI: estado conectado/desconectado, prepend de nuevas transacciones y no duplicar por `id`
- `App`:
  - Render de `router-outlet`

---

## AI Assistance Disclosure (uso responsable)

Usé herramientas de IA como apoyo para **optimizar tiempo** y mejorar calidad, principalmente en:

- Generación inicial de casos de prueba y edge-cases (JUnit / WebTestClient / Angular tests).
- Sugerencias técnicas para depurar SSE (eventos nombrados vs `onmessage`, keepalive, proxy Angular, consideraciones CORS).
- Refactor y pulido del código (nombres, estructura, legibilidad y consistencia).

**Importante:** no fue “copiar y pegar a ciegas”.
- Validé la lógica de negocio contra el comportamiento real del backend.
- Ajusté asserts, casos límite y cobertura para que los tests reflejaran exactamente la regla solicitada.
- Comparé contra ejecución real y corregí inconsistencias (p.ej. keepalive visible pero sin eventos por escuchar el evento equivocado).

---

## Notas
- Base de datos: **H2 (R2DBC)** para ejecución local rápida y determinista.
- Enfoque: claridad, trazabilidad y facilidad de ejecución por parte del evaluador.
