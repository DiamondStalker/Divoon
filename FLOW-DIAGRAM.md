# 🔄 Diagrama de Flujo - Valorant Rank Tracker

## 📊 Flujo Principal: GET /valorant/rank

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT REQUEST                              │
│                    GET /valorant/rank                               │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    routes/valorantRoutes.js                         │
│                                                                     │
│  1. Generate Request ID                                            │
│  2. Call cacheService.getRankData()                                │
│  3. Add headers (X-Cache-Status, X-Data-Source, etc.)             │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   services/cacheService.js                          │
│                                                                     │
│  ┌──────────────────────────────────────────────────────┐         │
│  │ 1. Get cached data from MongoDB                      │         │
│  │    → ValorantData.getLatest()                        │         │
│  └────────────┬─────────────────────────────────────────┘         │
│               │                                                     │
│               ▼                                                     │
│  ┌──────────────────────────────────────────────────────┐         │
│  │ 2. Check if cache is valid (< 1 hour old)           │         │
│  │    → calculateHoursSince(lastUpdated)                │         │
│  └────────────┬─────────────────────────────────────────┘         │
│               │                                                     │
│          ┌────┴────┐                                                │
│          │ VALID?  │                                                │
│          └────┬────┘                                                │
│               │                                                     │
│      ┌────────┴────────┐                                            │
│      │                 │                                            │
│     YES               NO                                            │
│      │                 │                                            │
│      ▼                 ▼                                            │
│  ┌─────────┐    ┌──────────────────────────────────────┐          │
│  │ RETURN  │    │ 3. Fetch from Valorant API           │          │
│  │ CACHED  │    │    → valorantService.fetchRankData() │          │
│  │  DATA   │    └────────────┬─────────────────────────┘          │
│  └─────────┘                 │                                      │
│                               ▼                                      │
│                    ┌──────────────────┐                             │
│                    │   API SUCCESS?   │                             │
│                    └────────┬─────────┘                             │
│                             │                                        │
│                    ┌────────┴────────┐                              │
│                    │                 │                              │
│                   YES               NO                              │
│                    │                 │                              │
│                    ▼                 ▼                              │
│         ┌──────────────────┐  ┌──────────────────────┐            │
│         │ 4. Update cache  │  │ 5. FALLBACK:         │            │
│         │    & file        │  │    Has old cache?    │            │
│         │ → updateCache()  │  │                      │            │
│         │ → save to DB     │  └──────────┬───────────┘            │
│         │ → save to file   │             │                         │
│         │                  │    ┌────────┴────────┐               │
│         │ RETURN FRESH     │    │                 │               │
│         │     DATA         │   YES               NO               │
│         └──────────────────┘    │                 │               │
│                                  ▼                 ▼               │
│                         ┌────────────────┐  ┌──────────┐         │
│                         │ RETURN STALE   │  │  ERROR   │         │
│                         │  CACHED DATA   │  │   500    │         │
│                         │ with warning   │  └──────────┘         │
│                         └────────────────┘                         │
└─────────────────────────────────────────────────────────────────────┘
```

## 🔍 Detalle: services/valorantService.js

```
┌─────────────────────────────────────────────────────────────────────┐
│                  valorantService.fetchRankData()                    │
│                                                                     │
│  ┌──────────────────────────────────────────────────────┐         │
│  │ 1. Make HTTP GET request to Valorant API            │         │
│  │    → axios.get(url) with 10s timeout                │         │
│  │    → Interceptors log request/response              │         │
│  └────────────┬─────────────────────────────────────────┘         │
│               │                                                     │
│               ▼                                                     │
│  ┌──────────────────────────────────────────────────────┐         │
│  │ 2. Check response                                    │         │
│  └────────────┬─────────────────────────────────────────┘         │
│               │                                                     │
│          ┌────┴────┐                                                │
│          │SUCCESS? │                                                │
│          └────┬────┘                                                │
│               │                                                     │
│      ┌────────┴────────┐                                            │
│      │                 │                                            │
│     YES               NO (ERROR)                                    │
│      │                 │                                            │
│      ▼                 ▼                                            │
│  ┌─────────────┐  ┌──────────────────────────────────┐            │
│  │ 3. Parse    │  │ ERROR HANDLING:                  │            │
│  │    data     │  │                                  │            │
│  │             │  │ • Has response?                  │            │
│  │ "PLATINUM   │  │   → Check status:                │            │
│  │  2 - 45 RR" │  │     - 403: RATE_LIMIT_EXCEEDED  │            │
│  │             │  │     - 429: RATE_LIMIT_EXCEEDED  │            │
│  │      ↓      │  │     - 5xx: VALORANT_API_ERROR   │            │
│  │             │  │                                  │            │
│  │ {           │  │ • Has request but no response?   │            │
│  │   DispData: │  │   → NETWORK_ERROR                │            │
│  │   "PLATINUM"│  │                                  │            │
│  │   range: 2  │  │ • Other?                         │            │
│  │   pl: 45    │  │   → REQUEST_SETUP_ERROR          │            │
│  │ }           │  │                                  │            │
│  │             │  │ Log error with:                  │            │
│  │ RETURN      │  │ • logger.logApiError()           │            │
│  │   DATA      │  │ • Full context (status, url,     │            │
│  └─────────────┘  │   headers, data, stack)          │            │
│                    │                                  │            │
│                    │ THROW CLASSIFIED ERROR           │            │
│                    └──────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────────┘
```

## 🗄️ Detalle: Database Operations

```
┌─────────────────────────────────────────────────────────────────────┐
│                    config/database.js                               │
│                                                                     │
│  ┌──────────────────────────────────────────────────────┐         │
│  │ 1. database.connect(MONGO_URI)                       │         │
│  └────────────┬─────────────────────────────────────────┘         │
│               │                                                     │
│               ▼                                                     │
│  ┌──────────────────────────────────────────────────────┐         │
│  │ 2. Attempt connection (max 5 retries)               │         │
│  │    → Wait 5s between retries                        │         │
│  └────────────┬─────────────────────────────────────────┘         │
│               │                                                     │
│          ┌────┴────┐                                                │
│          │SUCCESS? │                                                │
│          └────┬────┘                                                │
│               │                                                     │
│      ┌────────┴────────┐                                            │
│      │                 │                                            │
│     YES               NO                                            │
│      │                 │                                            │
│      ▼                 ▼                                            │
│  ┌─────────┐    ┌──────────────┐                                   │
│  │ Log     │    │ Retry or     │                                   │
│  │ success │    │ throw error  │                                   │
│  │ Setup   │    │ (max retries)│                                   │
│  │ event   │    └──────────────┘                                   │
│  │ listeners│                                                       │
│  └─────────┘                                                        │
│                                                                     │
│  Event Listeners:                                                  │
│  • 'connected'    → Log success                                    │
│  • 'error'        → Log error                                      │
│  • 'disconnected' → Log warning                                    │
│  • 'reconnected'  → Log success                                    │
│  • SIGINT/SIGTERM → Graceful shutdown                              │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                   models/ValorantData.js                            │
│                                                                     │
│  Static Methods:                                                   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────┐         │
│  │ ValorantData.getLatest()                             │         │
│  │   → findOne().sort({ dateUpdated: -1 })             │         │
│  │   → Returns most recent document                     │         │
│  └──────────────────────────────────────────────────────┘         │
│                                                                     │
│  ┌──────────────────────────────────────────────────────┐         │
│  │ ValorantData.upsertData(data)                        │         │
│  │   → findOneAndUpdate({}, data, {                     │         │
│  │       upsert: true,                                  │         │
│  │       new: true,                                     │         │
│  │       runValidators: true                            │         │
│  │     })                                               │         │
│  │   → Update if exists, create if not                 │         │
│  └──────────────────────────────────────────────────────┘         │
│                                                                     │
│  Virtual Field:                                                    │
│  • hoursSinceUpdate → Calculates hours since dateUpdated           │
└─────────────────────────────────────────────────────────────────────┘
```

## 📝 Detalle: Logging Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                       utils/logger.js                               │
│                                                                     │
│  ┌──────────────────────────────────────────────────────┐         │
│  │ Winston Logger Instance                              │         │
│  │                                                       │         │
│  │ Transports:                                          │         │
│  │  1. Console (with colors)                            │         │
│  │  2. File: logs/error.log (errors only)              │         │
│  │  3. File: logs/combined.log (all levels)            │         │
│  │                                                       │         │
│  │ Levels: error > warn > info > http > debug          │         │
│  └──────────────────────────────────────────────────────┘         │
│                                                                     │
│  ┌──────────────────────────────────────────────────────┐         │
│  │ Helper Functions:                                    │         │
│  │                                                       │         │
│  │ logger.logApiError(error, context)                   │         │
│  │   → Extracts HTTP details (status, headers, data)   │         │
│  │   → Logs with full context                          │         │
│  │   → Returns error details object                    │         │
│  │                                                       │         │
│  │ logger.logDbError(error, operation, context)        │         │
│  │   → Logs database operation errors                  │         │
│  │   → Includes operation type and context             │         │
│  │   → Returns error details object                    │         │
│  └──────────────────────────────────────────────────────┘         │
│                                                                     │
│  Example Error Log Entry:                                          │
│  ┌─────────────────────────────────────────────────────┐          │
│  │ {                                                   │          │
│  │   "timestamp": "2025-11-27 19:00:00",              │          │
│  │   "level": "error",                                │          │
│  │   "message": "API Error: RATE_LIMIT_EXCEEDED",     │          │
│  │   "status": 403,                                   │          │
│  │   "statusText": "Forbidden",                       │          │
│  │   "url": "https://api.kyroskoh.xyz/...",          │          │
│  │   "data": {...},                                   │          │
│  │   "headers": {...},                                │          │
│  │   "stack": "Error at..."                           │          │
│  │ }                                                   │          │
│  └─────────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────────┘
```

## 🎯 Response Examples

### Scenario 1: Cache Hit (Data < 1 hour old)
```json
{
  "success": true,
  "data": {
    "DispData": "PLATINUM",
    "dateUpdated": "2025-11-27T18:30:00.000Z",
    "range": 2,
    "pl": 45
  },
  "metadata": {
    "source": "cache",
    "cached": true,
    "stale": false,
    "hoursSinceUpdate": 0.5,
    "message": "Data retrieved successfully"
  }
}
```

**Headers:**
- `X-Cache-Status: HIT`
- `X-Data-Source: cache`
- `X-Data-Age-Hours: 0.50`

---

### Scenario 2: Cache Miss (Fresh Data from API)
```json
{
  "success": true,
  "data": {
    "DispData": "PLATINUM",
    "dateUpdated": "2025-11-27T19:00:00.000Z",
    "range": 2,
    "pl": 48
  },
  "metadata": {
    "source": "api",
    "cached": false,
    "stale": false,
    "hoursSinceUpdate": 0,
    "message": "Data retrieved successfully"
  }
}
```

**Headers:**
- `X-Cache-Status: MISS`
- `X-Data-Source: api`
- `X-Data-Age-Hours: 0.00`

---

### Scenario 3: API Failed - Fallback to Stale Cache
```json
{
  "success": true,
  "data": {
    "DispData": "PLATINUM",
    "dateUpdated": "2025-11-27T15:00:00.000Z",
    "range": 2,
    "pl": 40
  },
  "metadata": {
    "source": "stale_cache",
    "cached": true,
    "stale": true,
    "error": "RATE_LIMIT_EXCEEDED: Too many requests (403)",
    "hoursSinceUpdate": 4.0,
    "message": "Using outdated cache due to API failure"
  }
}
```

**Headers:**
- `X-Cache-Status: HIT`
- `X-Data-Source: stale_cache`
- `X-Data-Age-Hours: 4.00`
- `X-Cache-Warning: stale-data-fallback`

---

### Scenario 4: Complete Failure (No Cache + API Failed)
```json
{
  "success": false,
  "error": "Error fetching data from Valorant API",
  "message": "Unable to retrieve rank data: API failed and no cache available",
  "timestamp": "2025-11-27T19:00:00.000Z",
  "requestId": "req_1732744800_x3k9m2n1p"
}
```

**Status Code:** 500

---

## 📊 Architecture Overview

```
┌───────────────────────────────────────────────────────────────────┐
│                           CLIENT                                  │
└──────────────────────────┬────────────────────────────────────────┘
                           │ HTTP Request
                           ▼
┌───────────────────────────────────────────────────────────────────┐
│                        index.js                                   │
│  • Express app setup                                              │
│  • Middleware (cors, static files, logging)                       │
│  • Error handling                                                 │
└──────────────────────────┬────────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────────┐
│                   routes/valorantRoutes.js                        │
│  • /valorant/rank                                                 │
│  • /valorant/rank/refresh                                         │
│  • /valorant/health                                               │
└──────────────────────────┬────────────────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────────────────┐
│                 services/cacheService.js                          │
│  • Cache validation logic                                         │
│  • Fallback strategy                                              │
│  • Coordinates API calls and DB operations                        │
└──────────┬────────────────────────────────────┬───────────────────┘
           │                                    │
           ▼                                    ▼
┌──────────────────────────┐      ┌────────────────────────────────┐
│ services/valorantService │      │   models/ValorantData.js       │
│  • API integration       │      │    • Mongoose schema           │
│  • Error classification  │      │    • DB methods                │
│  • Data parsing          │      │    • Validations               │
└──────────┬───────────────┘      └────────────┬───────────────────┘
           │                                    │
           ▼                                    ▼
┌──────────────────────────┐      ┌────────────────────────────────┐
│  Valorant API (External) │      │     config/database.js         │
│  • kyroskoh.xyz          │      │      • MongoDB connection      │
└──────────────────────────┘      │      • Connection pooling      │
                                  │      • Retry logic             │
                                  └────────────┬───────────────────┘
                                               │
                                               ▼
                                  ┌────────────────────────────────┐
                                  │        MongoDB                 │
                                  │   Collection: valorantdatas    │
                                  └────────────────────────────────┘

All components use:
┌───────────────────────────────────────────────────────────────────┐
│                      utils/logger.js                              │
│  • Winston logging                                                │
│  • Error tracking                                                 │
│  • Performance monitoring                                         │
└───────────────────────────────────────────────────────────────────┘
```

---

**Nota**: Este diagrama muestra el flujo completo de la aplicación, desde la request del cliente hasta la respuesta final, incluyendo todos los posibles caminos (cache hit, cache miss, API error con fallback, etc.).
