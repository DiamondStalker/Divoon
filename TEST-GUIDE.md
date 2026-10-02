# 🧪 Testing Guide - Divoon API

## Resumen Rápido

```bash
# Instalar dependencias
npm install

# Ejecutar tests
npm test

# Watch mode (re-ejecutar en cada cambio)
npm run test:watch

# Con coverage report
npm test -- --coverage

# Linting
npm run lint
npm run lint:fix
```

---

## 📋 Descripción

Este documento describe cómo ejecutar, escribir y mantener tests en el proyecto Divoon API.

### Qué Está Testeado ✅
- `routes/valorantRoutes.js` - Endpoints de Valorant
- `services/cacheService.js` - Lógica de caché
- `services/valorantService.js` - Integración con API (en futuro)

### Qué NO Está Testeado ⚠️
- `routes/gamesRoutes.js` - Ambiente compartido dev/prod
- `routes/authRoutes.js` - Requiere Google OAuth setup
- `routes/portfolioRoutes.js` - Futuro

---

## 🚀 Instalación y Setup

### 1. Instalar Dependencias
```bash
npm install
```

Esto instala:
- `jest` - Testing framework
- `supertest` - HTTP testing
- `@babel/preset-env` - JavaScript transpiling (si es necesario)

### 2. Configuración de Tests
```bash
# Crear archivo .env.test (opcional)
cp .env.example .env.test

# Editar con valores de test
NODE_ENV=test
MONGO_URI=mongodb://localhost:27017/divoon-test
```

### 3. Ejecutar Tests
```bash
npm test
```

---

## 🧪 Ejecutar Tests

### Comando Básico
```bash
npm test
```

Esto ejecuta todos los tests excepto los de games.

### Watch Mode
```bash
npm run test:watch
```

Re-ejecuta tests automáticamente cuando cambias archivos.

### Coverage Report
```bash
npm test -- --coverage
```

Genera reporte en `coverage/`:
```
coverage/
├── index.html        # Reporte visual (abrir en navegador)
├── lcov.info         # Formato estándar
└── ...
```

### Tests Específicos
```bash
# Solo tests de Valorant
npm test valorantRoutes.test.js

# Solo cache service
npm test cacheService.test.js

# Con patrón
npm test -- --testNamePattern="should return"
```

### Modo Debug
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

---

## 📝 Escribir Nuevos Tests

### Estructura Básica
```javascript
const request = require('supertest');
const app = require('../index');

describe('Mi módulo', () => {
  describe('GET /endpoint', () => {
    it('should do something', async () => {
      const res = await request(app).get('/endpoint');
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
```

### Mocking
```javascript
// Mock un servicio
jest.mock('../services/valorantService', () => ({
  fetchRankData: jest.fn(),
}));

// Usar en test
const valorantService = require('../services/valorantService');

it('should handle API errors', async () => {
  valorantService.fetchRankData.mockRejectedValue(
    new Error('API down')
  );
  
  // tu test aquí
});
```

### Testing Async
```javascript
it('should fetch data', async () => {
  const res = await request(app)
    .get('/valorant/rank')
    .expect(200);
  
  expect(res.body.data).toBeDefined();
});
```

### Ejemplo Completo
```javascript
describe('Cache Logic', () => {
  let cacheService;
  
  beforeEach(() => {
    // Setup antes de cada test
    cacheService = require('../services/cacheService');
  });

  it('should validate cache age correctly', () => {
    const recentDate = new Date(Date.now() - 30 * 60 * 1000); // 30 min
    const isValid = cacheService.isCacheValid(recentDate);
    
    expect(isValid).toBe(true);
  });

  it('should invalidate old cache', () => {
    const oldDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 horas
    const isValid = cacheService.isCacheValid(oldDate);
    
    expect(isValid).toBe(false);
  });
});
```

---

## 📊 Coverage Goals

Configurado en `jest.config.js` y `package.json`:

```json
"coverageThreshold": {
  "global": {
    "branches": 60,
    "functions": 60,
    "lines": 60,
    "statements": 60
  }
}
```

**Significa**: Mínimo 60% de cobertura en:
- Branches (if/else)
- Functions (funciones definidas)
- Lines (líneas de código)
- Statements (sentencias)

### Ver Coverage
```bash
npm test -- --coverage

# Abrir reporte HTML
open coverage/index.html
```

---

## 🔄 CI/CD Integration

### GitHub Actions
Configurado en `.github/workflows/ci.yml`:

```yaml
- name: Run Tests
  run: npm test
  env:
    MONGO_URI: mongodb://localhost:27017/divoon-test
```

### Pre-commit Hook (Opcional)
```bash
npm install --save-dev husky lint-staged

npx husky install
npx husky add .husky/pre-commit "npm run lint && npm test"
```

Esto ejecuta lint y tests antes de cada commit.

---

## 🐛 Debugging Tests

### 1. Usar console.log
```javascript
it('should work', async () => {
  const res = await request(app).get('/valorant/rank');
  console.log('Response:', res.body);
  expect(res.status).toBe(200);
});
```

### 2. Debugger Node
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

Luego abre `chrome://inspect` en Chrome.

### 3. Verbose Output
```bash
npm test -- --verbose
```

### 4. Un Solo Test
```javascript
it.only('debug this test', async () => {
  // Solo este test se ejecuta
});
```

---

## ⚠️ Limitaciones y Notas

### No Tests para Games
**Razón**: Ambiente compartido dev/prod
- Los datos reales se afectarían
- Períodos mensuales son críticos
- Necesitaría DB separada

**Solución futura**: 
- Ambiente test aislado
- MongoDB Atlas test database
- Mocking de GameSession model

### MongoDB en Tests
Opciones:
1. **Local**: `mongodb://localhost:27017` (más rápido)
2. **Memory**: `mongodb-memory-server` (sin instalación)
3. **Docker**: Usado en CI/CD

### Timeouts
Ajustar en `jest.config.js`:
```javascript
testTimeout: 10000, // 10 segundos
```

---

## 📚 Recursos

### Jest Docs
- https://jestjs.io/docs/getting-started
- https://jestjs.io/docs/expect

### Supertest
- https://github.com/visionmedia/supertest

### Testing Best Practices
```javascript
// ✅ BUENO
expect(res.status).toBe(200);
expect(res.body.success).toBe(true);

// ❌ MALO
expect(res).toEqual({...}); // Muy específico
expect(res.body).toBeTruthy(); // No es claro
```

---

## 🎯 Checklist para PR

- [ ] Tests pasan: `npm test`
- [ ] Coverage >= 60%: `npm test -- --coverage`
- [ ] Linting pasa: `npm run lint`
- [ ] Sin console.log en código
- [ ] README actualizado si hay cambios de API
- [ ] Commit message descriptivo

---

## 📞 Problemas Comunes

### "Cannot find module"
```bash
# Limpiar cache de Jest
npm test -- --clearCache
```

### "MongoDB connection refused"
```bash
# Asegurate que MongoDB está corriendo
mongod --version  # Verificar instalación
```

### Timeout en tests
```bash
# Aumentar timeout
npm test -- --testTimeout=20000
```

### Mock no funciona
```javascript
// Importar DESPUÉS de mock
jest.mock('../service');
const service = require('../service');
```

---

## 🚀 Próximos Pasos

1. **Mejorar coverage** - Agregar tests para auth, portfolio
2. **E2E tests** - Cypress o Playwright
3. **Performance tests** - Benchmarking
4. **Load tests** - Artillery o k6
5. **Integración** - SonarQube, CodeClimate

---

**Última actualización**: 2026-10-02  
**Versión**: 3.0.0
