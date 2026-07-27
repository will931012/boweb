# BoWebsite

Pantalla de acceso para Black Oaths con frontend en React y backend en Express conectado a PostgreSQL para Railway.

## Stack actual

- React + Vite
- Express
- PostgreSQL via `pg`
- despliegue compatible con Railway usando `DATABASE_URL`

## Variables de entorno

Copia `.env.example` a `.env` para trabajar localmente.

- `DATABASE_URL`: URL de PostgreSQL, idealmente la que expone Railway
- `CLIENT_ORIGIN`: origen del frontend en desarrollo, por defecto `http://localhost:5173`

## Scripts

- `npm run dev`: inicia frontend y backend
- `npm run build`: compila el frontend
- `npm start`: ejecuta solo el backend

## Endpoints

- `GET /api/health`
- `GET /api/access/bootstrap`
- `POST /api/access/login`
- `POST /api/access/register`

## Railway

1. Crea un servicio PostgreSQL en Railway.
2. Copia la variable `DATABASE_URL` al servicio web de este proyecto.
3. Ejecuta el deploy del proyecto.

Al iniciar, el backend:

- crea la tabla `access_users` si no existe
- inserta usuarios semilla si la tabla esta vacia
- sirve el frontend compilado desde `dist`
