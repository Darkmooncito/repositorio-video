# 🚀 Guía de Despliegue - Servidor de Video

## Opción 1: Railway.app (Recomendado)

### 1. Crear cuenta en Railway
- Ve a [railway.app](https://railway.app)
- Inicia sesión con GitHub

### 2. Crear nuevo proyecto
1. Click en "New Project"
2. Selecciona "Deploy from GitHub repo"
3. Selecciona `repositorio-video`
4. Railway detectará automáticamente que es un proyecto Node.js

### 3. Configurar variables de entorno
En el dashboard de Railway:
1. Ve a tu proyecto
2. Click en "Variables"
3. Agrega:
   ```
   PORT=3001
   ORIGIN=https://tu-app-frontend.vercel.app
   ```

### 4. Configurar dominio
1. Ve a "Settings"
2. En "Domains" click en "Generate Domain"
3. Copia la URL generada (ej: `tu-app.up.railway.app`)

### 5. Verificar despliegue
```bash
curl https://tu-app.up.railway.app/health
```

---

## Opción 2: Render.com

### 1. Crear cuenta en Render
- Ve a [render.com](https://render.com)
- Inicia sesión con GitHub

### 2. Crear Web Service
1. Click en "New +" → "Web Service"
2. Conecta tu repositorio `repositorio-video`
3. Configura:
   - **Name:** `uvmeet-video-server`
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Free

### 3. Agregar variables de entorno
En "Environment":
```
PORT=3001
ORIGIN=https://tu-app-frontend.vercel.app
```

### 4. Deploy
- Click en "Create Web Service"
- Espera a que termine el despliegue
- Copia la URL (ej: `uvmeet-video-server.onrender.com`)

---

## Opción 3: Heroku

### 1. Instalar Heroku CLI
```bash
npm install -g heroku
```

### 2. Login
```bash
heroku login
```

### 3. Crear app
```bash
heroku create uvmeet-video-server
```

### 4. Configurar variables
```bash
heroku config:set PORT=3001
heroku config:set ORIGIN=https://tu-app-frontend.vercel.app
```

### 5. Deploy
```bash
git push heroku main
```

---

## Verificar Despliegue

Una vez desplegado, verifica que funcione:

```bash
curl https://tu-servidor.com/health
```

Debe responder:
```json
{
  "status": "ok",
  "rooms": 0,
  "totalPeers": 0
}
```

## Actualizar CORS

Después de desplegar el frontend, actualiza la variable `ORIGIN`:

```
ORIGIN=https://tu-app.vercel.app,http://localhost:5173
```

¡Listo! 🎉
