# ClassBland v0.1

Plataforma educativa gamificada para escuelas. Estilo Duolingo + Kahoot.

## Caracteristicas

- **Roles**: Teacher (profesor) y Student (alumno)
- **Materias**: Crea materias con codigos unicos para que los estudiantes se unan
- **Clases**: Define ventanas de tiempo para acceder al contenido
- **Actividades**: Quizzes de opcion multiple con puntuacion por tiempo
- **Gamificacion**: Puntos, feedback inmediato, progreso visual
- **Modo oscuro**: Toggle de tema claro/oscuro

## Stack Tecnologico

- Next.js 14 (App Router) + TypeScript
- TailwindCSS + shadcn/ui
- PostgreSQL + Prisma ORM
- Docker + Docker Compose
- Cloudflare Quick Tunnel (trycloudflare)

---

## Inicio Rapido

### Requisitos

- Node.js 20+
- Docker Desktop
- (Opcional) cloudflared para exponer la app

### Desarrollo Local

**Windows (PowerShell):**
```powershell
.\scripts\dev.ps1
```

**Linux/Mac:**
```bash
chmod +x scripts/*.sh
./scripts/dev.sh
```

Esto:
1. Crea `.env` desde `.env.example`
2. Inicia PostgreSQL en Docker
3. Instala dependencias
4. Ejecuta migraciones y seed
5. Inicia el servidor en http://localhost:3000

### Produccion con Docker

**Windows:**
```powershell
.\scripts\prod.ps1
```

**Linux/Mac:**
```bash
./scripts/prod.sh
```

---

## Exponer con Cloudflare Quick Tunnel

Para que ~10 personas accedan desde fuera de tu red:

### 1. Instalar cloudflared

**Windows (winget):**
```powershell
winget install Cloudflare.cloudflared
```

**Ubuntu/Debian:**
```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb
```

**Mac (Homebrew):**
```bash
brew install cloudflared
```

### 2. Iniciar el Tunnel

Asegurate de que la app este corriendo, luego:

**Windows:**
```powershell
.\scripts\start_tunnel.ps1
```

**Linux/Mac:**
```bash
./scripts/start_tunnel.sh
```

Veras una URL tipo:
```
https://random-words-here.trycloudflare.com
```

Comparte esa URL con tus estudiantes.

> **Nota**: La URL cambia cada vez que inicias el tunnel. Si reinicias, comparte la nueva URL.

---

## Crear Usuarios de Prueba

### Opcion 1: Usar el Seed

El seed crea automaticamente:
- Teacher: `teacher@classbland.local` / `Teacher123!`
- Student: `student@classbland.local` / `Student123!`
- Materia demo con codigo: `DEMO2024`

### Opcion 2: Registro con Invite Code

1. Ve a `/register`
2. Usa el codigo de invitacion: `CLASSBLAND2024` (o el que configures en `.env`)
3. Selecciona rol Teacher o Student

### Cambiar Invite Code

Edita `.env`:
```env
INVITE_CODE="TU_CODIGO_SECRETO"
```

---

## Configuracion

### Variables de Entorno

| Variable | Descripcion | Default |
|----------|-------------|---------|
| `DATABASE_URL` | URL de conexion PostgreSQL | (requerido) |
| `JWT_SECRET` | Secreto para tokens JWT | (requerido) |
| `INVITE_CODE` | Codigo para registro beta | `CLASSBLAND2024` |
| `ALLOWED_EMAILS` | Emails permitidos (comma-separated) | (vacio) |
| `NEXT_PUBLIC_APP_URL` | URL publica de la app | `http://localhost:3000` |

---

## Estructura del Proyecto

```
classbland/
├── prisma/
│   ├── schema.prisma      # Modelo de datos
│   └── seed.ts            # Datos de ejemplo
├── src/
│   ├── app/               # Pages y API routes
│   │   ├── api/           # REST API
│   │   ├── teacher/       # Dashboard profesor
│   │   ├── student/       # Dashboard alumno
│   │   └── ...
│   ├── components/        # Componentes React
│   └── lib/               # Utilidades
├── scripts/               # Scripts de desarrollo
├── docker-compose.yml     # Configuracion Docker
└── Dockerfile             # Build de produccion
```

---

## Flujo de Uso

### Para el Profesor

1. Registrarse como Teacher
2. Crear una Materia (recibe un codigo unico)
3. Compartir el codigo con estudiantes
4. Crear Clases con ventanas de tiempo
5. Agregar Actividades con preguntas
6. Ver el progreso de los estudiantes

### Para el Estudiante

1. Registrarse como Student
2. Unirse a una Materia con el codigo
3. Acceder a las Clases disponibles (dentro de horario)
4. Completar Actividades (quizzes gamificados)
5. Ver puntuacion y progreso

---

## Formula de Puntuacion

```
Si respuesta correcta:
  score = base_points * max(0.3, 1 - (tiempo_usado / tiempo_limite))

Si respuesta incorrecta:
  score = 0
```

- Base points: 100 por defecto
- Minimo 30% de puntos si es correcta (aunque sea lento)
- Sin limite de tiempo: 100 puntos fijos si es correcta

---

## Riesgos y Limitaciones (MVP)

### Seguridad
- **No usar en produccion real** sin revisar seguridad
- Rate limiting basico (5 login/min, 3 register/min)
- No hay recuperacion de contrasena
- No hay verificacion de email

### Datos
- **No recolecta datos sensibles** de menores (sin fecha nacimiento, direccion, etc.)
- Solo email, apodo opcional, y respuestas de quiz
- Backups: responsabilidad del operador

### Tunnel
- **URL cambia** cada vez que reinicias el tunnel
- No usar para mas de ~10-20 usuarios simultaneos
- Si necesitas persistencia, considera Cloudflare Tunnel con cuenta (gratis)

---

## Roadmap (Despues del MVP)

- [ ] Preguntas abiertas + evaluacion con IA
- [ ] Sistema de asistencia
- [ ] Notificaciones
- [ ] Reportes PDF
- [ ] Recuperacion de contrasena
- [ ] Subir archivos/imagenes

---

## Licencia

Uso interno/educativo. No distribuir.
