# 🚀 Guía de Despliegue - Valorant Rank Tracker

## 📋 Pre-requisitos

- Node.js >= 16.x
- MongoDB (local o MongoDB Atlas)
- Git
- npm o yarn

## 🔧 Configuración Local

### 1. Clonar y configurar

```bash
# Clonar el repositorio
git clone <repository-url>
cd times-gates

# Instalar dependencias
npm install
```

### 2. Configurar variables de entorno

```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar .env con tus valores
nano .env  # o usa tu editor favorito
```

Variables requeridas:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/valorant
VALORANT_API_URL=https://api.kyroskoh.xyz/valorant/v1/mmr/na/DiamondStalker/MaMi?show=combo&display=0
NODE_ENV=development
LOG_LEVEL=info
```

### 3. Iniciar MongoDB (si es local)

```bash
# Windows
net start MongoDB

# Linux/Mac
sudo systemctl start mongod

# O usar Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 4. Migrar schema (si tienes datos existentes)

```bash
node scripts/migrate-schema.js
```

### 5. Iniciar la aplicación

**Modo desarrollo (con auto-reload):**
```bash
npm run dev
```

**Modo producción:**
```bash
npm start
```

### 6. Verificar funcionamiento

```bash
# Health check
curl http://localhost:5000/valorant/health

# Obtener rank
curl http://localhost:5000/valorant/rank
```

---

## ☁️ Despliegue en la Nube

### Opción 1: Railway.app

1. **Crear cuenta en Railway**: https://railway.app/

2. **Instalar Railway CLI**:
```bash
npm install -g @railway/cli
railway login
```

3. **Inicializar proyecto**:
```bash
railway init
```

4. **Agregar MongoDB**:
```bash
railway add
# Seleccionar: MongoDB
```

5. **Configurar variables de entorno**:
```bash
railway variables set PORT=5000
railway variables set VALORANT_API_URL=https://api.kyroskoh.xyz/...
railway variables set NODE_ENV=production
railway variables set LOG_LEVEL=info
# MONGO_URI se configura automáticamente por Railway
```

6. **Desplegar**:
```bash
railway up
```

7. **Ver logs**:
```bash
railway logs
```

---

### Opción 2: Heroku

1. **Instalar Heroku CLI**: https://devcenter.heroku.com/articles/heroku-cli

2. **Login y crear app**:
```bash
heroku login
heroku create valorant-rank-tracker
```

3. **Agregar MongoDB (mLab o MongoDB Atlas)**:
```bash
heroku addons:create mongolab:sandbox
```

4. **Configurar variables de entorno**:
```bash
heroku config:set NODE_ENV=production
heroku config:set LOG_LEVEL=info
heroku config:set VALORANT_API_URL=https://api.kyroskoh.xyz/...
# MONGODB_URI ya está configurado por el addon
```

5. **Crear Procfile**:
```bash
echo "web: npm start" > Procfile
```

6. **Desplegar**:
```bash
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

7. **Ver logs**:
```bash
heroku logs --tail
```

---

### Opción 3: Render.com

1. **Crear cuenta en Render**: https://render.com/

2. **Conectar repositorio de GitHub**

3. **Crear nuevo Web Service**:
   - Build Command: `npm install`
   - Start Command: `npm start`

4. **Agregar MongoDB**:
   - Crear nuevo MongoDB database en Render
   - Copiar connection string

5. **Configurar Environment Variables**:
```
NODE_ENV=production
PORT=10000
MONGO_URI=<tu-connection-string-de-render>
VALORANT_API_URL=https://api.kyroskoh.xyz/...
LOG_LEVEL=info
```

6. **Deploy automático** al hacer push a main

---

### Opción 4: DigitalOcean App Platform

1. **Crear cuenta en DigitalOcean**

2. **Crear nueva App**:
   - Conectar repositorio
   - Detecta Node.js automáticamente

3. **Configurar MongoDB**:
   - Opción A: Usar DigitalOcean Managed Database
   - Opción B: Usar MongoDB Atlas

4. **Environment Variables**:
```
NODE_ENV=production
MONGO_URI=<connection-string>
VALORANT_API_URL=https://api.kyroskoh.xyz/...
LOG_LEVEL=info
```

5. **Deploy** automático

---

## 🗄️ MongoDB en la Nube

### Opción 1: MongoDB Atlas (Gratis hasta 512MB)

1. **Crear cuenta**: https://www.mongodb.com/cloud/atlas

2. **Crear cluster gratis (M0)**:
   - Región: Elegir más cercana
   - Provider: AWS/GCP/Azure

3. **Configurar acceso**:
   - Database Access: Crear usuario y contraseña
   - Network Access: Agregar IP `0.0.0.0/0` (acceso desde cualquier lugar)

4. **Obtener connection string**:
```
mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/valorant?retryWrites=true&w=majority
```

5. **Actualizar .env o variables de entorno**:
```env
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/valorant
```

---

## 🐳 Docker (Opcional)

### Crear Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
```

### Crear docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - MONGO_URI=mongodb://mongo:27017/valorant
      - VALORANT_API_URL=https://api.kyroskoh.xyz/valorant/v1/mmr/na/DiamondStalker/MaMi?show=combo&display=0
      - LOG_LEVEL=info
    depends_on:
      - mongo
    volumes:
      - ./logs:/app/logs

  mongo:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

volumes:
  mongo-data:
```

### Construir y ejecutar

```bash
# Construir imagen
docker build -t valorant-tracker .

# Ejecutar con docker-compose
docker-compose up -d

# Ver logs
docker-compose logs -f app

# Detener
docker-compose down
```

---

## 🔐 Seguridad en Producción

### 1. Variables de Entorno

✅ **SIEMPRE** usar variables de entorno, nunca hardcodear:
- Credenciales de MongoDB
- API keys
- Secretos

❌ **NUNCA** commitear `.env` a git

### 2. Rate Limiting (Recomendado)

Agregar `express-rate-limit`:

```bash
npm install express-rate-limit
```

```javascript
// index.js
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // máximo 100 requests por IP
});

app.use('/valorant', limiter);
```

### 3. Helmet (Seguridad de Headers)

```bash
npm install helmet
```

```javascript
// index.js
const helmet = require('helmet');
app.use(helmet());
```

### 4. CORS Restrictivo

En producción, restringir CORS:

```javascript
// index.js
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://tu-dominio.com']
    : '*'
};
app.use(cors(corsOptions));
```

### 5. Logs en Producción

- Usar servicio de logging centralizado (Logtail, Papertrail, etc.)
- Configurar log rotation
- Monitorear logs de error

---

## 📊 Monitoreo y Mantenimiento

### Health Checks

```bash
# Usar endpoint de health para monitoring
curl https://tu-app.com/valorant/health

# Configurar en Uptime Robot, Pingdom, etc.
```

### Logs

```bash
# Ver logs en tiempo real
tail -f logs/combined.log
tail -f logs/error.log

# Buscar errores específicos
grep "RATE_LIMIT_EXCEEDED" logs/error.log
grep "500" logs/combined.log
```

### Backup de MongoDB

```bash
# Exportar datos
mongodump --uri="mongodb://localhost:27017/valorant" --out=/backup

# Restaurar datos
mongorestore --uri="mongodb://localhost:27017/valorant" /backup/valorant
```

### Actualizar Aplicación

```bash
# Pull últimos cambios
git pull origin main

# Instalar dependencias (si hay nuevas)
npm install

# Reiniciar aplicación
pm2 restart valorant-tracker
# o si no usas PM2:
npm start
```

---

## 🚨 Troubleshooting

### Error: Cannot connect to MongoDB

```bash
# Verificar que MongoDB esté corriendo
mongosh --eval "db.adminCommand('ping')"

# Verificar connection string en .env
echo $MONGO_URI

# Ver logs de MongoDB
tail -f /var/log/mongodb/mongod.log
```

### Error: Port already in use

```bash
# Windows - Liberar puerto 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac - Liberar puerto 5000
lsof -ti:5000 | xargs kill -9
```

### Error: Logs no se generan

```bash
# Verificar permisos de carpeta logs/
ls -la logs/

# Crear carpeta si no existe
mkdir -p logs
chmod 755 logs
```

### Error: API de Valorant retorna 403

Esto es normal (rate limiting). La aplicación usa el fallback automáticamente:
- Verifica logs: `grep "403" logs/error.log`
- La app retorna datos antiguos del caché
- Espera y reintenta más tarde

---

## 📝 Checklist de Despliegue

Antes de desplegar a producción, verificar:

- [ ] `.env` configurado correctamente
- [ ] Variables de entorno en plataforma cloud
- [ ] MongoDB accesible desde la app
- [ ] `NODE_ENV=production`
- [ ] Logs folder con permisos correctos
- [ ] Health endpoint responde: `/valorant/health`
- [ ] Endpoint principal funciona: `/valorant/rank`
- [ ] Monitoreo configurado (uptime checks)
- [ ] Backups de MongoDB configurados
- [ ] Rate limiting habilitado (opcional pero recomendado)
- [ ] CORS configurado apropiadamente
- [ ] Documentación actualizada

---

## 🎉 Post-Despliegue

Una vez desplegado:

1. **Probar todos los endpoints**:
```bash
curl https://tu-app.com/
curl https://tu-app.com/valorant/health
curl https://tu-app.com/valorant/rank
curl https://tu-app.com/valorant/rank/refresh
```

2. **Verificar logs**:
```bash
# Ver que no haya errores críticos
tail -100 logs/error.log
```

3. **Configurar monitoring**:
   - Uptime Robot: https://uptimerobot.com/
   - Pingdom: https://www.pingdom.com/
   - StatusCake: https://www.statuscake.com/

4. **Documentar URLs**:
   - API Base URL
   - Health Check URL
   - Documentación

---

**¡Listo!** Tu API de Valorant Rank Tracker está desplegada y lista para usar 🚀
