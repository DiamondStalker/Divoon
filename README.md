# Valorant Rank Tracker API

API REST para obtener y cachear el rango competitivo de jugadores de Valorant, con sistema inteligente de caché y mecanismo de fallback en caso de errores.

## 🚀 Características

- ✅ **Caché Inteligente**: Almacena datos por 1 hora para reducir llamadas a la API externa
- ✅ **Fallback Automático**: Si la API externa falla, retorna datos antiguos del caché
- ✅ **Logging Detallado**: Registra todos los errores con Winston para debugging
- ✅ **Manejo Robusto de Errores**: Captura errores 403, 429, timeouts y más
- ✅ **Arquitectura Modular**: Código organizado en servicios, rutas y modelos
- ✅ **API Pública**: No requiere autenticación

## 📁 Estructura del Proyecto

```
.
├── config/               # Configuraciones
│   └── database.js      # Configuración de MongoDB con reintentos
├── models/              # Modelos de Mongoose
│   └── ValorantData.js  # Esquema de datos de Valorant
├── services/            # Lógica de negocio
│   ├── cacheService.js  # Gestión de caché con fallback
│   └── valorantService.js # Integración con API de Valorant
├── routes/              # Definición de rutas
│   └── valorantRoutes.js # Endpoints de la API
├── utils/               # Utilidades
│   └── logger.js        # Configuración de Winston para logging
├── logs/                # Archivos de logs (generados automáticamente)
│   ├── error.log        # Solo errores
│   └── combined.log     # Todos los eventos
├── public/              # Archivos estáticos
│   └── data.txt         # Datos en formato JSON (actualizado automáticamente)
├── index.js             # Punto de entrada de la aplicación
├── .env                 # Variables de entorno (no incluido en git)
├── .env.example         # Plantilla de variables de entorno
└── package.json         # Dependencias y scripts
```

## 🔧 Instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd times-gates
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env
```

Edita el archivo `.env` con tus configuraciones:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/valorant
VALORANT_API_URL=https://api.kyroskoh.xyz/valorant/v1/mmr/na/DiamondStalker/MaMi?show=combo&display=0
LOG_LEVEL=info
```

4. **Iniciar el servidor**

Modo producción:
```bash
npm start
```

Modo desarrollo (con auto-reload):
```bash
npm run dev
```

## 📡 Endpoints

### `GET /valorant/rank`
Obtiene el rango actual del jugador.

**Respuesta exitosa:**
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
    "message": "Data retrieved successfully",
    "timestamp": "2025-11-27T19:00:00.000Z"
  }
}
```

**Headers informativos:**
- `X-Cache-Status`: `HIT` (caché) o `MISS` (API)
- `X-Data-Source`: `cache`, `api`, o `stale_cache`
- `X-Data-Age-Hours`: Horas desde última actualización
- `X-Cache-Warning`: Presente si se usan datos antiguos

### `GET /valorant/rank/refresh`
Fuerza una actualización desde la API, ignorando el caché.

**Respuesta exitosa:**
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
    "forced": true,
    "message": "Data refreshed successfully",
    "timestamp": "2025-11-27T19:00:00.000Z"
  }
}
```

### `GET /valorant/health`
Verifica el estado del servicio y del caché.

**Respuesta:**
```json
{
  "success": true,
  "status": "healthy",
  "cache": {
    "hasData": true,
    "lastUpdate": "2025-11-27T18:30:00.000Z",
    "hoursSinceUpdate": "0.50"
  },
  "timestamp": "2025-11-27T19:00:00.000Z"
}
```

### `GET /`
Información general de la API.

## 🛡️ Manejo de Errores

### Errores de API Externa

Cuando la API de Valorant falla (403, 429, timeout, etc.), el sistema:

1. **Registra el error** en `logs/error.log` con detalles completos:
   ```
   2025-11-27 19:00:00 [error]: API Error: RATE_LIMIT_EXCEEDED
   {
     "status": 403,
     "url": "https://api.kyroskoh.xyz/valorant/...",
     "timestamp": "2025-11-27T19:00:00.000Z"
   }
   ```

2. **Retorna datos antiguos del caché** como fallback:
   ```json
   {
     "success": true,
     "data": { ... },
     "metadata": {
       "source": "stale_cache",
       "stale": true,
       "error": "RATE_LIMIT_EXCEEDED: Too many requests (403)",
       "message": "Using outdated cache due to API failure"
     }
   }
   ```

### Tipos de Errores Capturados

- **403 Forbidden**: Demasiadas peticiones a la API
- **429 Too Many Requests**: Rate limit excedido
- **Timeout**: Sin respuesta en 10 segundos
- **500+ Server Errors**: Errores del servidor de Valorant
- **Network Errors**: Sin conexión o DNS fallido

## 📊 Logging

El sistema usa **Winston** para registrar eventos:

### Niveles de Log
- `error`: Errores críticos
- `warn`: Advertencias
- `info`: Información general
- `http`: Peticiones HTTP
- `debug`: Información detallada de debugging

### Archivos de Log
- `logs/error.log`: Solo errores (máx 5 archivos de 5MB)
- `logs/combined.log`: Todos los eventos (máx 5 archivos de 5MB)
- Consola: Output con colores para desarrollo

### Funciones Especiales de Logging
```javascript
logger.logApiError(error, context);    // Errores de API con detalles HTTP
logger.logDbError(error, operation);   // Errores de base de datos
```

## 🗄️ Base de Datos

### Esquema de Datos

```javascript
{
  DispData: String,      // Rango (ej: "PLATINUM")
  dateUpdated: Date,     // Última actualización
  range: Number,         // División (1-3)
  pl: Number,           // Puntos RR (0-100)
  createdAt: Date,      // Auto-generado
  updatedAt: Date       // Auto-generado
}
```

### Métodos Útiles

```javascript
// Obtener último registro
await ValorantData.getLatest();

// Actualizar o crear (upsert)
await ValorantData.upsertData(data);

// Calcular horas desde actualización
data.hoursSinceUpdate;  // Virtual field
```

## 🔄 Flujo de Funcionamiento

1. **Request** a `/valorant/rank`
2. **Verificar caché**: ¿Datos < 1 hora?
   - ✅ **Sí** → Retornar datos del caché
   - ❌ **No** → Continuar al paso 3
3. **Consultar API** de Valorant
   - ✅ **Éxito** → Actualizar caché y retornar
   - ❌ **Error** → Continuar al paso 4
4. **Fallback**: ¿Hay datos antiguos en caché?
   - ✅ **Sí** → Retornar datos antiguos con warning
   - ❌ **No** → Error 500

## 🚨 Notas Importantes

### Compatibilidad con Esquema Antiguo
El modelo acepta `dateUptaded` (typo) para compatibilidad hacia atrás, pero internamente usa `dateUpdated`.

### Caché Público
Los datos también se guardan en `public/data.txt` para acceso directo por archivos.

### Un Solo Jugador
Esta versión está configurada para trackear un solo jugador. Para múltiples jugadores, necesitarías:
- Agregar identificador de jugador en el modelo
- Modificar las consultas para filtrar por jugador
- Actualizar endpoints para recibir parámetros de jugador

## 🔐 Seguridad

- ⚠️ **CORS habilitado** para todos los orígenes (considera restringir en producción)
- ⚠️ **Sin rate limiting** (considera agregar en producción)
- ⚠️ **Sin autenticación** (API pública por diseño)
- ✅ **Variables sensibles** en .env (no en git)
- ✅ **Logs rotativos** (no llenan el disco)

## 📝 TODO / Mejoras Futuras

- [ ] Agregar tests unitarios e integración
- [ ] Implementar rate limiting
- [ ] Soporte para múltiples jugadores
- [ ] Dashboard web para visualización
- [ ] Integración con Discord bot
- [ ] Caché en Redis para mejor performance
- [ ] Documentación con Swagger/OpenAPI
- [ ] CI/CD pipeline
- [ ] Docker containerization

## 📄 Licencia

ISC

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

**Nota**: Este proyecto usa la API no oficial de Kyroskoh. Respeta los límites de rate limiting de la API externa.
