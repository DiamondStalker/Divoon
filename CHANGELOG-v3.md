# 📝 CHANGELOG - Divoon API v3.0.0

## ✨ Cambios Principales (v3.0.0)

### 🔒 Seguridad Mejorada
- **CORS Restrictivo**: Ahora solo permite orígenes específicos:
  - `https://divoon.onrender.com` (API producción)
  - `https://diamondstalker.github.io` (Mesesaurios - GitHub Pages)
  - `http://localhost:3000` (dev local)
  - `http://localhost:5000` (API local)

- **Rate Limiting Activado**:
  - Global: 100 requests/15 minutos
  - Refresh endpoint: 5 requests/1 minuto
  - Deshabilitado en desarrollo para facilitar testing

### 📊 Testing Implementado
- **Tests unitarios** con Jest + Supertest
- **Coverage**: Mínimo 60% global (configurable)
- **Exclusiones**: SushiGO (games) NO tiene tests debido a ambiente compartido dev/prod
- **Ejecución**:
  ```bash
  npm test                 # Ejecutar tests (sin games)
  npm run test:watch      # Watch mode
  npm run test:all        # Todos los tests (sin games)
  ```

### 🔄 CI/CD Pipeline (GitHub Actions)
- **Trigger**: Push a `main` o `develop`, Pull Requests
- **Pasos**:
  1. ✅ Setup Node 18
  2. 🧪 Tests unitarios (MongoDB en Docker)
  3. 🔍 ESLint + Code quality
  4. 📦 Build check (validar sintaxis)
  5. 🔐 Security scan (dependencias)
  6. 🚀 Deploy automático a Render (solo en main)
- **Configuración**:
  - MongoDB test en servicio Docker
  - Coverage report en Codecov
  - Notificaciones en case de fallo

### 📚 Documentación Mejorada
- **Endpoints de documentación** en cada módulo:
  - `GET /` - Documentación raíz
  - `GET /valorant` - Docs módulo Valorant
  - `GET /games` - Docs módulo Games
  - `GET /portfolio` - Docs módulo Portfolio
  - `GET /auth` - Docs módulo Auth

- **Response consistente**:
  ```json
  {
    "success": true|false,
    "data": { ... },
    "metadata": { ... },
    "timestamp": "ISO-8601"
  }
  ```

### 🛠️ Herramientas de Desarrollo
- **ESLint**: Configuración Airbnb
  ```bash
  npm run lint        # Validar código
  npm run lint:fix    # Arreglar automáticamente
  ```

- **Jest Configuration**:
  - Coverage: `coverage/`
  - Test path: `test/**/*.test.js`
  - MongoDB mock en tests

### 📦 Cambios en package.json
```json
{
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "test": "jest --coverage --testPathIgnorePatterns=games",
    "test:watch": "jest --watch --testPathIgnorePatterns=games",
    "test:games": "echo 'Games tests skipped - shared dev/prod database'",
    "lint": "eslint . --ext .js",
    "lint:fix": "eslint . --ext .js --fix"
  }
}
```

**Nuevas dependencias**:
- `jest` - Testing framework
- `supertest` - HTTP assertion library
- `eslint` - Code linting
- `eslint-config-airbnb-base` - Linting rules

### 📂 Nueva Estructura
```
.github/
├── workflows/
│   └── ci.yml              # GitHub Actions CI/CD
.eslintrc.json             # ESLint configuration
test/
├── valorantRoutes.test.js  # Tests para Valorant
└── services/
    └── cacheService.test.js # Tests para cache
```

### 🚀 Despliegue en Render

Para configurar el auto-deploy desde GitHub Actions:

1. **En GitHub** (Settings → Secrets and variables → Actions):
   ```
   RENDER_DEPLOY_HOOK = https://api.render.com/deploy/srv-...
   ```

2. **En Render** (Dashboard → Settings → Deploy Hook):
   - Copiar la URL del hook
   - Agregarla como secret en GitHub

3. **Automáticamente**:
   - Cada push a `main` ejecuta tests
   - Si pasa, deploya a https://divoon.onrender.com/

### ⚙️ Variables de Entorno (.env)
Actualizado `.env.example` con:
- `PORT` - Puerto (5000)
- `NODE_ENV` - Ambiente (development|test|production)
- `MONGO_URI` - MongoDB
- `VALORANT_API_URL` - API externa
- `FRONTEND_URL` - CORS frontend
- `LOG_LEVEL` - Verbosidad de logs
- `GOOGLE_CLIENT_ID/SECRET` - OAuth
- `RENDER_DEPLOY_HOOK` - CI/CD hook

### 🔄 Flujo de Desarrollo Recomendado

```bash
# 1. Clonear y configurar
git clone ...
cp .env.example .env
npm install

# 2. Desarrollo local
npm run dev           # API en http://localhost:5000

# 3. Escribir tests para nuevas features
# (excepto en /games)

# 4. Validar código
npm run lint          # Validar
npm run lint:fix      # Arreglar automáticamente

# 5. Ejecutar tests
npm test              # Con coverage

# 6. Commit y push
git add .
git commit -m "feat: nueva feature"
git push origin main

# 7. GitHub Actions ejecuta:
#    - Tests
#    - Linting
#    - Security checks
#    - Deploy (si todo pasa)
```

### ⚠️ IMPORTANTE: SushiGO (Games)

**No hay tests para `/games`** porque:
- Ambiente compartido entre dev/prod
- Datos reales se afectarían con test automation
- La lógica de períodos es crítica

**Decisión**: Tests manual o ambiente separado en futuro

### 📊 Métricas de Testing

Configurado en `package.json`:
```json
"jest": {
  "coverageThreshold": {
    "global": {
      "branches": 60,
      "functions": 60,
      "lines": 60,
      "statements": 60
    }
  }
}
```

### 🚨 Próximos Pasos (Futuro)

- [ ] Tests para `/portfolio`
- [ ] Tests para `/auth`
- [ ] Integración con SonarQube
- [ ] E2E tests con Cypress/Playwright
- [ ] Performance testing (k6)
- [ ] Load testing
- [ ] Docker containerization
- [ ] Kubernetes deployment
- [ ] Redis caché layer
- [ ] WebSocket support (real-time updates)

---

**Fecha**: 2026-10-02  
**Versión**: 3.0.0  
**Autor**: Claude Code + DiamondStalker (Carlos)
