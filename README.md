# StrideSense — Backend API

> API REST de gestión de sesiones de entrenamiento y análisis de riesgo de lesión mediante aprendizaje automático.

---

## 1. Descripción general

**StrideSense Backend** es el servidor de la plataforma StrideSense, una aplicación de salud deportiva orientada a atletas que desean monitorizar su carga de entrenamiento y recibir una estimación del riesgo de lesión basada en sus datos reales.

### Problema que aborda

Los atletas amateurs y semiprofesionales carecen de herramientas accesibles que combinen el registro de sesiones de entrenamiento con un análisis cuantitativo del riesgo de sobreentrenamiento. La mayor parte de las soluciones existentes son cajas negras (dispositivos propietarios) o simples hojas de cálculo sin inteligencia incorporada.

StrideSense Backend ofrece:

- Una **API REST segura** para gestionar sesiones de entrenamiento.
- Un **motor de análisis basado en reglas clínicas** que evalúa factores como frecuencia, carga, variedad y descanso.
- Un **modelo de red neuronal ligero** implementado con **TensorFlow.js** que calcula la probabilidad de lesión directamente desde métricas de sesión en bruto.

### Contexto académico del TFM

Este proyecto forma parte del Trabajo de Fin de Máster del Máster en Desarrollo con IA de BigSchool. El objetivo académico es demostrar la viabilidad de integrar técnicas de aprendizaje automático en aplicaciones web de salud deportiva, aplicando principios de **Clean Architecture** y buenas prácticas de ingeniería del software (SOLID, validación de DTOs, testing unitario, contenedorización).

---

## 2. Características principales

| Funcionalidad | Descripción |
|---|---|
| **Autenticación JWT** | Registro e inicio de sesión con tokens Bearer gestionados por `@nestjs/jwt` y `passport-jwt`. |
| **CRUD de sesiones** | Creación, consulta, edición y eliminación de sesiones de entrenamiento con scope por usuario. |
| **Análisis de riesgo** | Motor basado en reglas que evalúa 4 factores clínicos y devuelve nivel y puntuación de riesgo. |
| **Predicción ML** | Red neuronal de 5 entradas implementada con TensorFlow.js que estima la probabilidad de lesión. |
| **Documentación Swagger** | Interfaz interactiva disponible en `/docs` para explorar y probar todos los endpoints. |
| **Validación de entrada** | DTOs validados con `class-validator` y `class-transformer` para proteger la integridad de los datos. |
| **Roles de usuario** | Soporte para roles `athlete`, `coach` y `admin`. |
| **Contenedorización** | Imagen Docker multi-etapa lista para despliegue en cualquier entorno compatible. |
| **Base de datos semilla** | Script de seed con 2 usuarios y 15 sesiones de prueba para desarrollo. |

---

## 3. Arquitectura del sistema

El backend sigue la arquitectura modular de **NestJS**, organizada por dominio funcional. Cada módulo encapsula su propia lógica de negocio, controlador, servicio y DTOs.

```
┌─────────────────────────────────────────────────────────────┐
│                     Cliente HTTP / Frontend                  │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP (Bearer JWT)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    NestJS Application                        │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ AuthModule │  │SessionsModule│  │     RiskModule        │ │
│  │            │  │              │  │  ┌────────────────┐   │ │
│  │ /auth/login│  │ /sessions    │  │  │  RiskService   │   │ │
│  │ /auth/reg. │  │ /sessions/:id│  │  │  (4 factores)  │   │ │
│  │ /auth/me   │  │              │  │  └────────┬───────┘   │ │
│  └─────┬──────┘  └──────┬───────┘  │           │           │ │
│        │                │          │  ┌─────────▼────────┐ │ │
│        │                │          │  │    MlService     │ │ │
│        │                │          │  │  TensorFlow.js   │ │ │
│        │                │          │  │  5→2→1 sigmoid   │ │ │
│        │                │          │  └──────────────────┘ │ │
│        │                │          └──────────────────────────┘ │
│        │                │                                    │
│        └────────┬────────┘                                   │
│                 │                                            │
│  ┌──────────────▼──────────────────────────────────────────┐ │
│  │               PrismaModule (Global)                      │ │
│  │                PrismaService (PostgreSQL)                │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                      │
                      ▼
           ┌──────────────────┐
           │   PostgreSQL DB   │
           │  users, sessions  │
           └──────────────────┘
```

### Flujo de análisis de riesgo

```
Usuario → GET /api/risk/summary
    │
    ├─► PrismaService: consulta sesiones del usuario
    │
    ├─► RiskService.computeFactors()
    │       ├── trainingFrequency()   → factor 1 (sesiones/semana)
    │       ├── trainingLoad()        → factor 2 (duración media)
    │       ├── trainingVariety()     → factor 3 (deportes distintos)
    │       └── restPattern()         → factor 4 (días consecutivos)
    │
    ├─► RiskService.extractMlFeatures()
    │       ├── sessionsPerWeek       (últimos 7 días)
    │       ├── avgDurationMinutes    (últimos 7 días)
    │       ├── uniqueSports          (últimos 14 días)
    │       ├── maxConsecutiveDays    (histórico)
    │       └── loadRatio             (ratio carga aguda/crónica)
    │
    └─► MlService.predict(features)
            └── TensorFlow.js 5→2→1 sigmoid
                    → { score: 0–100, level: 'low'|'medium'|'high' }
```

---

## 4. Tecnologías utilizadas

### Producción

| Tecnología | Versión | Uso |
|---|---|---|
| **NestJS** | ^11.0 | Framework principal del servidor |
| **TypeScript** | ^5.7 | Lenguaje de programación |
| **Prisma ORM** | ^6.19 | Acceso y migraciones de base de datos |
| **PostgreSQL** | 15+ | Base de datos relacional |
| **TensorFlow.js** | ^4.22 | Modelo de red neuronal para predicción de riesgo |
| **@nestjs/jwt** | ^11.0 | Generación y verificación de tokens JWT |
| **passport-jwt** | ^4.0 | Estrategia de autenticación JWT |
| **bcrypt** | ^6.0 | Hashing de contraseñas |
| **class-validator** | ^0.14 | Validación declarativa de DTOs |
| **class-transformer** | ^0.5 | Transformación y serialización de objetos |
| **@nestjs/swagger** | ^11.2 | Documentación OpenAPI interactiva |
| **rxjs** | ^7.8 | Programación reactiva |

### Desarrollo y testing

| Herramienta | Versión | Uso |
|---|---|---|
| **Vitest** | ^3.1 | Framework de tests unitarios y e2e |
| **@nestjs/testing** | ^11.0 | Módulo de testing de NestJS |
| **Supertest** | ^7.0 | Tests HTTP e2e |
| **@swc/core** | ^1.15 | Compilador SWC para tests rápidos |
| **ESLint** | ^10.0 | Linting estático |
| **Prettier** | ^3.4 | Formateo de código |
| **Docker** | — | Contenedorización multi-etapa |

---

## 5. Requisitos previos

Antes de instalar el proyecto, asegúrate de tener disponible:

| Requisito | Versión mínima | Verificación |
|---|---|---|
| **Node.js** | 20.x LTS | `node --version` |
| **npm** | 10.x | `npm --version` |
| **PostgreSQL** | 15.x | `psql --version` |
| **Docker** *(opcional)* | 24.x | `docker --version` |
| **Docker Compose** *(opcional)* | 2.x | `docker compose version` |

> **Nota:** Si utilizas Docker Compose para levantar todo el entorno, solo necesitas Docker instalado; no es necesario tener PostgreSQL de forma local.

---

## 6. Instalación

### 6.1 Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd stridesense-backend
```

### 6.2 Instalar dependencias

```bash
npm install
```

### 6.3 Configurar variables de entorno

Copia el fichero de ejemplo y ajusta los valores a tu entorno local:

```bash
cp .env.example .env
```

> Si no existe `.env.example`, crea un fichero `.env` con el contenido descrito en la sección de **Configuración**.

### 6.4 Generar el cliente de Prisma

```bash
npx prisma generate
```

### 6.5 Ejecutar las migraciones

```bash
npx prisma migrate dev
```

### 6.6 (Opcional) Cargar datos de prueba

```bash
npm run seed
```

---

## 7. Configuración

### Variables de entorno (`.env`)

```env
# ── Servidor ──────────────────────────────────────────────────
PORT=3000

# ── Base de datos ─────────────────────────────────────────────
DATABASE_URL="postgresql://<usuario>:<contraseña>@<host>:<puerto>/<nombre_db>?schema=public"

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=nestuser
DB_PASSWORD=nestpass
DB_NAME=nestdb

# ── JWT ───────────────────────────────────────────────────────
JWT_SECRET=<clave-secreta-larga-y-aleatoria>
JWT_EXPIRATION=1d

# ── CORS ──────────────────────────────────────────────────────
CORS_ORIGIN=http://localhost:4200
```

> **Importante:** Nunca incluyas el fichero `.env` real en el repositorio. Está excluido por `.gitignore`.

### Variables de entorno para tests (`.env.test`)

```env
PORT=3001
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/stridesense_test?schema=public"
JWT_SECRET=test-secret-key
JWT_EXPIRATION=1h
```

---

## 8. Ejecución

### Modo desarrollo (hot-reload)

```bash
npm run start:dev
```

### Modo producción

```bash
npm run build
npm run start:prod
```

### Con Docker Compose (recomendado)

Si el proyecto raíz incluye un `docker-compose.yml` que orquesta el backend, la base de datos y el frontend, levanta todo el entorno con:

```bash
docker compose up --build
```

El servidor estará disponible en `http://localhost:3000`.

La documentación Swagger estará disponible en `http://localhost:3000/docs`.

### Construir y ejecutar solo la imagen Docker

```bash
# Construir la imagen
docker build -t stridesense-backend .

# Ejecutar el contenedor
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="..." \
  stridesense-backend
```

---

## 9. Estructura del repositorio

```
stridesense-backend/
│
├── src/
│   ├── main.ts                        # Bootstrap de la aplicación NestJS
│   ├── app.module.ts                  # Módulo raíz: importa todos los módulos
│   │
│   ├── auth/                          # Módulo de autenticación
│   │   ├── auth.module.ts
│   │   ├── auth.service.ts            # Lógica: login, register, perfil
│   │   ├── auth.controller.ts         # Endpoints: /auth/login, /auth/me
│   │   ├── auth.service.spec.ts       # Tests unitarios del servicio
│   │   ├── decorators/
│   │   │   └── current-user.decorator.ts  # @CurrentUser() param decorator
│   │   ├── dto/
│   │   │   ├── login.dto.ts
│   │   │   ├── register.dto.ts
│   │   │   └── update-profile.dto.ts
│   │   ├── entities/
│   │   │   └── user.entity.ts
│   │   ├── guards/
│   │   │   └── jwt-auth.guard.ts      # Guard que protege rutas con JWT
│   │   └── strategies/
│   │       └── jwt.strategy.ts        # Estrategia Passport JWT
│   │
│   ├── sessions/                      # Módulo de sesiones de entrenamiento
│   │   ├── sessions.module.ts
│   │   ├── sessions.service.ts        # CRUD con scope por usuario
│   │   ├── sessions.controller.ts     # Endpoints: /sessions, /sessions/:id
│   │   ├── dto/
│   │   │   ├── create-session.dto.ts
│   │   │   └── update-session.dto.ts
│   │   └── entities/
│   │       └── session.entity.ts
│   │
│   ├── risk/                          # Módulo de análisis de riesgo
│   │   ├── risk.module.ts
│   │   ├── risk.service.ts            # Motor de 4 factores + extracción de features ML
│   │   └── risk.controller.ts         # Endpoint: GET /risk/summary
│   │
│   ├── ml/                            # Módulo de aprendizaje automático
│   │   ├── ml.module.ts
│   │   └── ml.service.ts              # Red neuronal 5→2→1 con TensorFlow.js
│   │
│   ├── prisma/                        # Módulo global de base de datos
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts          # PrismaClient con lifecycle hooks
│   │
│   ├── database/
│   │   └── seed.ts                    # Script de seed: 2 usuarios + 15 sesiones
│   │
│   └── generated/
│       └── prisma/                    # Cliente Prisma generado automáticamente
│
├── prisma/
│   ├── schema.prisma                  # Esquema de la base de datos
│   └── migrations/                    # Migraciones SQL versionadas
│
├── test/
│   └── app.e2e-spec.ts                # Tests de integración e2e
│
├── Dockerfile                         # Build multi-etapa Node 20 Alpine
├── .dockerignore
├── nest-cli.json                      # Configuración del CLI de NestJS
├── tsconfig.json                      # Configuración TypeScript
├── tsconfig.build.json                # Configuración TypeScript para producción
├── vitest.config.ts                   # Configuración de tests unitarios
├── vitest.config.e2e.ts               # Configuración de tests e2e
├── prisma.config.ts                   # Configuración de Prisma CLI
├── eslint.config.mjs                  # Configuración ESLint
├── .prettierrc                        # Configuración Prettier
├── render.yaml                        # Configuración de despliegue en Render
└── package.json
```

---

## 10. Uso — Endpoints de la API

Todos los endpoints usan el prefijo base `/api`. Los endpoints protegidos requieren el header:

```
Authorization: Bearer <token>
```

### Autenticación

| Método | Endpoint | Descripción | Autenticación |
|---|---|---|---|
| `POST` | `/api/auth/register` | Registrar nuevo usuario | No |
| `POST` | `/api/auth/login` | Iniciar sesión y obtener token | No |
| `GET` | `/api/auth/me` | Obtener perfil del usuario autenticado | JWT |
| `PATCH` | `/api/auth/me` | Actualizar nombre o avatar | JWT |

#### Ejemplo: Registro

```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "Carlos Martínez",
  "email": "carlos@stridesense.com",
  "password": "password123"
}
```

**Respuesta:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 86400
}
```

#### Ejemplo: Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "carlos@stridesense.com",
  "password": "password123"
}
```

---

### Sesiones de entrenamiento

| Método | Endpoint | Descripción | Autenticación |
|---|---|---|---|
| `GET` | `/api/sessions` | Listar todas las sesiones del usuario | JWT |
| `POST` | `/api/sessions` | Crear nueva sesión | JWT |
| `GET` | `/api/sessions/:id` | Obtener sesión por ID | JWT |
| `PATCH` | `/api/sessions/:id` | Actualizar sesión | JWT |
| `DELETE` | `/api/sessions/:id` | Eliminar sesión | JWT |

#### Ejemplo: Crear sesión

```http
POST /api/sessions
Authorization: Bearer <token>
Content-Type: application/json

{
  "date": "2026-02-20",
  "durationMinutes": 45,
  "sport": "running",
  "distanceKm": 7.5,
  "avgHeartRate": 152,
  "cadenceSpm": 172,
  "notes": "Rodaje suave por el parque"
}
```

**Deportes soportados:** `running` · `cycling` · `swimming` · `strength` · `other`

---

### Análisis de riesgo

| Método | Endpoint | Descripción | Autenticación |
|---|---|---|---|
| `GET` | `/api/risk/summary` | Obtener resumen de riesgo de lesión | JWT |

#### Ejemplo: Obtener análisis de riesgo

```http
GET /api/risk/summary
Authorization: Bearer <token>
```

**Respuesta:**
```json
{
  "overallScore": 42,
  "overallLevel": "medium",
  "factors": [
    {
      "id": "training-frequency",
      "label": "Posible sobreentrenamiento por frecuencia",
      "score": 55,
      "level": "medium"
    },
    {
      "id": "training-load",
      "label": "Volumen de entrenamiento equilibrado",
      "score": 15,
      "level": "low"
    },
    {
      "id": "training-variety",
      "label": "Variedad de entrenamiento limitada",
      "score": 45,
      "level": "medium"
    },
    {
      "id": "rest-pattern",
      "label": "Patrón de descanso moderado",
      "score": 40,
      "level": "medium"
    }
  ],
  "mlPrediction": {
    "score": 61,
    "level": "high"
  },
  "generatedAt": "2026-02-20T10:30:00.000Z"
}
```

**Niveles de riesgo:**

| Rango de score | Nivel |
|---|---|
| 0 – 34 | `low` (Bajo) |
| 35 – 59 | `medium` (Medio) |
| 60 – 100 | `high` (Alto) |

---

### Documentación interactiva

La documentación Swagger/OpenAPI completa está disponible en:

```
http://localhost:3000/docs
```

---

## 11. Modelo de Machine Learning

### Descripción del modelo

StrideSense implementa una **red neuronal feedforward ligera** con TensorFlow.js, diseñada para ejecutarse directamente en el servidor Node.js sin dependencias externas de GPU ni servicios en la nube.

**Arquitectura:** 5 entradas → 2 neuronas ocultas (ReLU) → 1 salida (sigmoid)

### Features de entrada

| Feature | Descripción | Normalización |
|---|---|---|
| `sessionsPerWeek` | Nº de sesiones en los últimos 7 días | ÷ 7 |
| `avgDurationMinutes` | Duración media de sesión (min) en los últimos 7 días | ÷ 120 |
| `uniqueSports` | Deportes distintos practicados en los últimos 14 días | ÷ 5 |
| `maxConsecutiveDays` | Máximo de días consecutivos de entrenamiento | ÷ 7 |
| `loadRatio` | Minutos esta semana / minutos semana anterior | ÷ 3, máx. 1 |

### Pesos del modelo (inicializados con conocimiento de dominio)

Los pesos han sido diseñados manualmente siguiendo principios de fisiología del deporte:

- **Neurona H0 ("detector de sobrecarga"):** sensible a frecuencia elevada, sesiones largas, días consecutivos y picos de carga.
- **Neurona H1 ("detector de monotonía"):** sensible a la falta de variedad de deporte y a rachas largas de entrenamiento.

```
Kernel oculto [5×2]:
  sessionsPerWeek:      [0.8,  0.5]
  avgDurationMinutes:   [0.7,  0.2]
  uniqueSports:        [-0.3, -0.8]   ← más variedad = menor riesgo
  maxConsecutiveDays:   [0.6,  0.7]
  loadRatio:            [0.7,  0.3]
Bias oculto:           [-0.7, -0.4]

Kernel de salida [2×1]: [[1.2], [0.8]]
Bias de salida:         [-0.8]
```

### Validación conceptual

| Escenario | sessionsPerWeek | avgDuration | uniqueSports | maxConsecutive | loadRatio | Score esperado |
|---|---|---|---|---|---|---|
| Sobreentrenamiento severo | 6 | 90 min | 1 | 6 días | 2.5× | ~85 (`high`) |
| Entrenamiento equilibrado | 3 | 45 min | 2 | 2 días | 1.0× | ~35 (`medium`) |
| Sedentarismo | 0 | — | 0 | 0 días | 0× | ~31 (`low`) |

---

## 12. Metodología del TFM

El desarrollo de StrideSense Backend ha seguido una metodología iterativa e incremental inspirada en **Agile**, con las siguientes fases:

1. **Análisis de requisitos** — Identificación de los datos mínimos necesarios para modelar el riesgo de lesión en base a literatura científica de fisiología deportiva.
2. **Diseño de la arquitectura** — Selección del stack tecnológico (NestJS + Prisma + TensorFlow.js) y definición del esquema de base de datos.
3. **Implementación por módulos** — Desarrollo iterativo de los módulos Auth → Sessions → Risk → ML, con pruebas unitarias en cada iteración.
4. **Integración del modelo ML** — Diseño e inicialización del modelo de red neuronal con pesos basados en conocimiento de dominio, dado que no existe un dataset etiquetado real.
5. **Contenedorización y despliegue** — Configuración del Dockerfile multi-etapa y del archivo `render.yaml` para despliegue continuo.
6. **Testing y validación** — Ejecución de tests unitarios con Vitest y validación manual del comportamiento del modelo con escenarios extremos.

---

## 13. Resultados principales

- **API REST completamente funcional** con autenticación JWT, CRUD de sesiones y análisis de riesgo.
- **Modelo de ML integrado en el servidor** mediante TensorFlow.js, eliminando la necesidad de infraestructura adicional de ML.
- **Análisis de riesgo dual**: 4 factores basados en reglas clínicas + predicción neuronal basada en métricas de sesión en bruto.
- **Tests unitarios** para el servicio de autenticación (registro, login, validación de contraseña).
- **Documentación Swagger** completa y funcional para todos los endpoints.
- **Despliegue con Docker** validado en entorno local mediante imagen multi-etapa.

---

## 14. Limitaciones

- **Modelo sin entrenamiento supervisado:** Los pesos de la red neuronal han sido inicializados manualmente con conocimiento de dominio, no aprendidos a partir de un dataset etiquetado de lesiones reales. Las predicciones son orientativas y no tienen validez clínica.
- **Sin dataset externo:** La ausencia de un dataset público y etiquetado de sesiones de entrenamiento con lesiones documentadas impide el entrenamiento supervisado del modelo.
- **Factores de riesgo limitados:** El análisis no incluye variables biomecánicas (cadencia, frecuencia cardíaca, potencia) ni factores externos (condiciones meteorológicas, historial de lesiones previas).
- **Sin refresh token real:** El `refreshToken` devuelto en el login es idéntico al `accessToken`; no existe un flujo real de renovación de tokens.
- **Tests parciales:** Solo el módulo de autenticación cuenta con tests unitarios completos. Los módulos de sesiones, riesgo y ML no están cubiertos por tests automatizados en esta versión.
- **Sin paginación:** El endpoint `GET /api/sessions` devuelve todas las sesiones del usuario sin paginación ni filtros de fecha.

---

## 15. Líneas futuras de trabajo

- **Entrenamiento supervisado del modelo:** Recopilar o sintetizar un dataset etiquetado de sesiones y lesiones para entrenar la red neuronal mediante `model.fit()` y validar su precisión con métricas como AUC-ROC.
- **Incorporación de métricas biomecánicas:** Incluir frecuencia cardíaca, cadencia y potencia como features adicionales del modelo ML.
- **Historial de lesiones:** Añadir una entidad `Injury` al esquema de Prisma para correlacionar sesiones pasadas con lesiones documentadas.
- **Refresh token real:** Implementar un flujo completo de renovación de tokens con `refreshToken` independiente del `accessToken`.
- **Paginación y filtrado:** Añadir paginación cursor-based y filtros por deporte y rango de fechas en el endpoint de sesiones.
- **Notificaciones de riesgo:** Integrar un servicio de notificaciones (email o push) cuando el nivel de riesgo supera un umbral configurable.
- **Tests de integración e2e:** Ampliar la cobertura de tests con escenarios de integración para todos los módulos.
- **Exportación de datos:** Permitir al usuario exportar sus sesiones en formato CSV o PDF para compartirlas con un entrenador.

---

## 16. Conclusiones

StrideSense Backend demuestra que es técnicamente viable integrar un modelo de aprendizaje automático ligero en una API REST Node.js sin sacrificar la calidad del código ni la mantenibilidad de la arquitectura. La elección de **TensorFlow.js** permite ejecutar la inferencia del modelo directamente en el servidor, eliminando dependencias externas de ML y simplificando el despliegue.

La arquitectura modular de NestJS, combinada con Prisma ORM, proporciona una base sólida para escalar la aplicación: añadir nuevos módulos (nutrición, sueño, métricas avanzadas) es posible sin modificar el código existente. La separación entre el motor de análisis basado en reglas (`risk.service.ts`) y el módulo de ML (`ml.service.ts`) permite evolucionar ambos enfoques de forma independiente.

El principal desafío identificado es la ausencia de datos reales para entrenar y validar el modelo. En el contexto del TFM, este obstáculo se ha abordado mediante el diseño de pesos iniciales basados en conocimiento de dominio, lo que permite demostrar la integración técnica del ML aunque las predicciones no tengan validez clínica en esta fase.

---

## 17. Autor

| Campo | Valor |
|---|---|
| **Nombre** | Iván Martínez de la Fuente |
| **Máster** | Máster en Desarrollo con IA |
| **Institución** | BigSchool |
| **Año** | 2026 |

---

## 18. Licencia

Este proyecto está distribuido bajo la licencia **MIT**.
Consulta el fichero [LICENSE](./LICENSE) para más detalles.

---

*Generado como parte del TFM — StrideSense © 2026*
