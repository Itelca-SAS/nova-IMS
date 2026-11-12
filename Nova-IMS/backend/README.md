# Backend — Incident Management System

API REST + Socket.IO + MySQL para el sistema de gestión de incidentes.

---

## 📦 Stack

- **Node.js 22+** con Express 4
- **MySQL 8.x** con `mysql2/promise`
- **Socket.IO 4** para eventos en tiempo real
- **JWT** (`jsonwebtoken`) + **bcryptjs** + **LDAP** (`ldapts`) para autenticación
- **Nodemailer** para correos (OTP, bienvenida, notificaciones)
- **pnpm 11** como package manager

---

## ⚡ Setup rápido

```bash
cp .env.example .env       # edita credenciales MySQL, JWT, correo y Google Maps
pnpm install
pnpm run db:import         # solo en una BD nueva (ver "Base de datos")
pnpm dev                   # http://localhost:3000
```

Comprobación: `GET http://localhost:3000/health`.

---

## 🔧 Scripts pnpm

| Script | Descripción |
| ------ | ----------- |
| `pnpm dev` | Arranca con nodemon (hot reload) |
| `pnpm start` | Arranca en modo producción |
| `pnpm run db:import` | Crea esquema + catálogos base en MySQL |
| `pnpm run ldap:test -- <uid> <password>` | Prueba un login contra LDAP |
| `pnpm test` | Tests unitarios (`node:test`, carpeta `test/`) |
| `pnpm run test:coverage` | Tests + informe LCOV en `coverage/` para SonarCloud |
| `pnpm audit` | Verifica vulnerabilidades en dependencias |
| `pnpm run lint` | ESLint + plugin de seguridad |

---

## 🌍 Variables de entorno (`.env`)

La plantilla completa, con comentarios, está en [`.env.example`](./.env.example).

### Servidor y URLs

| Variable | Ejemplo | Descripción |
| -------- | ------- | ----------- |
| `PORT` | `3000` | Puerto del backend |
| `NODE_ENV` | `development` | `production` en el servidor |
| `CORS_ORIGIN` | `http://localhost:4200` | Origen permitido del frontend |
| `APP_URL` | `http://localhost:4200` | URL del frontend usada en correos de bienvenida |
| `PUBLIC_URL` | `https://dominio` | URL pública para los enlaces de ubicación por WhatsApp/SMS |
| `NGROK_URL` | `https://xxx.ngrok-free.app` | Alternativa a `PUBLIC_URL` solo en desarrollo |

### JWT y MySQL

| Variable | Ejemplo | Descripción |
| -------- | ------- | ----------- |
| `JWT_SECRET` | — | Clave de firma; aleatoria de 64+ caracteres en producción |
| `JWT_EXPIRES_IN` | `8h` | Vigencia del token |
| `DB_HOST` / `DB_PORT` | `localhost` / `3306` | Servidor MySQL |
| `DB_USER` / `DB_PASSWORD` | — | Credenciales MySQL |
| `DB_NAME` | `gestionincidentes` | Base de datos |
| `DB_CONNECTION_LIMIT` | `10` | Tamaño del pool de conexiones |

### LDAP / Active Directory

| Variable | Ejemplo | Descripción |
| -------- | ------- | ----------- |
| `LDAP_ENABLED` | `false` | Activa el login contra el directorio |
| `LDAP_URL` | `ldap://localhost:389` | Servidor LDAP |
| `LDAP_BIND_DN` / `LDAP_BIND_PASSWORD` | — | Cuenta de solo lectura para búsquedas |
| `LDAP_BASE_DN` | `ou=users,dc=ims,dc=local` | Base de búsqueda de usuarios |
| `LDAP_USER_ATTRIBUTE` | `uid` | Atributo del nombre de usuario |
| `LDAP_TIMEOUT_MS` | `5000` | Timeout de conexión |
| `LDAP_TLS_REJECT_UNAUTHORIZED` | `true` | Validación del certificado TLS |
| `LDAP_DEFAULT_ROLE_ID` | `RP-3` | Rol de un usuario que solo existe en el directorio |
| `LDAP_DEFAULT_AGENCY_CODE` | `CSJ` | Agencia de un usuario que solo existe en el directorio |

### Google Maps y correo

| Variable | Ejemplo | Descripción |
| -------- | ------- | ----------- |
| `GOOGLE_MAPS_API_KEY` | — | Obligatoria para mapas y geocodificación. El frontend la obtiene de `GET /api/config/public` |
| `MAIL_PROVIDER` | `smtp` | `smtp` (Office 365) o `resend` |
| `SMTP_HOST` / `SMTP_PORT` | `smtp.office365.com` / `587` | Servidor SMTP |
| `SMTP_USER` / `SMTP_PASS` | — | Cuenta de envío |
| `SMTP_FROM` / `MAIL_FROM` | `"Itelca S.A.S <...>"` | Remitente |
| `RESEND_API_KEY` | — | Solo si `MAIL_PROVIDER=resend` |

### Login híbrido (directorio + MySQL local)

| Usuario | Dónde valida la contraseña | ¿Fila en `usuarios`? |
| ------- | -------------------------- | -------------------- |
| `uid` del directorio | OpenLDAP / AD | No obligatoria (usa rol y agencia por defecto) |
| Cuenta local (módulo Administración) | bcrypt en MySQL | Sí |

Después de validar la contraseña se envía un código OTP al correo del usuario (`POST /api/auth/verify-otp`).

Código: `services/auth.service.js` · `services/ldap.service.js` · `services/otp.service.js` · `controllers/auth.controller.js`

Diagnóstico: `GET /api/auth/ldap-health` · `pnpm run ldap:test -- <uid> <password>`

---

## 🗄️ Base de datos

Base **`gestionincidentes`** (MySQL 8.x). Los scripts están en [`sql/`](./sql).

### Qué hay en el repo y qué no

| Qué | Dónde vive |
| --- | ---------- |
| Esquema de tablas | `sql/01_schema.sql` |
| Catálogos base (agencias, estados, eventos, origen, roles, cargos, DIVIPOLA…) | `sql/02_catalogos_referencia.sql` (alineado a Dump20260903) |
| Usuarios, correos, incidentes, auditoría | **MySQL del cliente** / módulo Administración |

El seed incluye DIVIPOLA CSJ: `departamentos` (33) y `municipios` (1122). No incluye datos operativos.

### Scripts SQL

| Archivo | Uso |
| ------- | --- |
| `01_schema.sql` | `CREATE DATABASE` + tablas |
| `02_catalogos_referencia.sql` | Catálogos de referencia + DIVIPOLA |
| `03_fecha_cierre_incidentes.sql` | **Solo BD existentes**: agrega `incidentes.Fecha_cierre`, carga la fecha de los ya cerrados y actualiza `vw_reporte_incidentes_pbi` (en BD nuevas la columna ya viene en `01_schema.sql`) |
| `04_historial_de_estado.sql` | **Solo BD existentes**: crea `historial_de_estado`, carga los cambios de estado desde `auditoria_incidente` y crea `vw_historial_de_estado` |
| `05_vista_pbi_solicitante.sql` | Agrega nombres, apellidos y género del solicitante a `vw_reporte_incidentes_pbi` |
| `import-db.js` | Ejecuta `01` + `02` (lo usa `pnpm run db:import`) |

### Instalación

**Entorno con BD del cliente (producción / CSJ):** restaurar el dump MySQL del cliente en Workbench o CLI y aplicar los scripts `03`–`05` que aún no estén aplicados. No se usa `db:import`.

**Entorno nuevo solo con catálogos:**

```bash
pnpm run db:import
```

Deja esquema, catálogos y DIVIPOLA. Los operadores se crean después en Administración.

**Manual (Workbench):** ejecutar `01_schema.sql` y luego `02_catalogos_referencia.sql`.

> ⚠️ No ejecutes `db:import` contra una BD que ya tenga datos del dump.

### Cambiar una contraseña manualmente

```bash
node -e "console.log(require('bcryptjs').hashSync('nuevaClave', 10))"
```

```sql
UPDATE usuarios SET `Contraseña` = '<hash>' WHERE ID_Usuario = '<usuario>' AND ID_Agencia = '<agencia>';
```

---

## 🔌 API REST

Todas las rutas bajo `/api` requieren `Authorization: Bearer <token>`, excepto las públicas 🔓. Los datos se filtran por la agencia del usuario y cada módulo valida permisos por rol.

### 🔓 Públicas

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/health` | Estado del servidor |
| GET | `/api/config/public` | Configuración pública (clave de Google Maps) |
| POST | `/api/auth/login` | `{ agencia, usuario, password }` → envía OTP |
| POST | `/api/auth/verify-otp` | Valida el OTP y devuelve el JWT |
| POST | `/api/auth/forgot-password` | Solicita recuperación de contraseña |
| POST | `/api/auth/reset-password` | Restablece la contraseña con el token recibido |
| POST | `/api/auth/change-password-credentials` | Cambio de contraseña con usuario y contraseña actual |
| GET | `/api/auth/ldap-health` | Diagnóstico de conexión LDAP |
| GET | `/api/agencies`, `/api/login/options`, `/api/roles/list` | Opciones de la pantalla de login |
| GET | `/api/departments`, `/api/municipalities` | DIVIPOLA |
| GET | `/api/place-roles`, `/api/vehicle-roles`, `/api/origins`, `/api/priorities` | Catálogos |
| GET | `/api/incident-statuses`, `/api/incident-statuses/allowed` | Estados y transiciones permitidas |
| GET | `/location/share`, POST `/location/submit` | Página pública donde el ciudadano comparte su ubicación |

### 🔒 Sesión

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/api/auth/me` | Usuario actual |
| GET | `/api/auth/permissions` | Permisos del rol |
| POST | `/api/auth/change-password` | Cambio de contraseña con sesión iniciada |
| POST | `/api/auth/logout` | Cierre de sesión |
| POST | `/api/audit/client-event` | Registra eventos de auditoría del cliente |

### 🔒 Incidentes y medidas

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/api/incidents` | Lista |
| GET | `/api/incidents/dashboard-metrics` | Métricas del dashboard |
| GET | `/api/incidents/vehicle-lookup/:plate` | Busca un vehículo por placa |
| GET | `/api/incidents/:id` | Detalle con personas, lugares y vehículos |
| POST | `/api/incidents` | Crea (emite `incident:created`) |
| PUT | `/api/incidents/:id` | Actualiza con auditoría y control de edición simultánea (emite `incident:updated`) |
| POST | `/api/incidents/:id/send-email` | Envía el incidente por correo |
| GET | `/api/medidas/tipos` | Tipos de medida de seguridad |
| GET | `/api/incidents/:id/medidas` | Gestión y medidas del incidente |
| POST | `/api/incidents/:id/gestion` | Guarda la gestión de medidas |
| POST | `/api/incidents/:id/medidas` | Guarda las medidas del incidente |
| GET | `/api/catalog/riesgos` | Niveles de riesgo |

### 🔒 Administración y otros

| Recurso | Rutas |
| ------- | ----- |
| Personas | `GET/POST /api/people`, `PUT /api/people/:id`, `PATCH /api/people/:id/status`, `GET /api/people/lookup/document/:documentId`, `GET /api/telephony/lookup/:phone` |
| Catálogos de personas | `GET /api/person-roles`, `/api/judge-cargos`, `/api/genders`, `/api/document-types` |
| Operadores | `GET/POST /api/operators`, `PUT /api/operators/:id` |
| Tipos de incidente | `GET/POST /api/incident-types`, `PUT /api/incident-types/:id` |
| Protocolos | `GET/POST /api/response-protocols`, `PUT /api/response-protocols/:id` |
| Correos de notificación | `GET/POST /api/notification-emails`, `PATCH /api/notification-emails/:email/status` |
| Roles y permisos | `GET/POST /api/roles`, `PUT /api/roles/:id` |
| Auditoría | `GET /api/admin-logs`, `GET /api/audit-logs?incidentId=…`, `GET /api/users-audit-summary`, `GET /api/users-audit-summary/:userId/actions` |
| Reportes | `GET /api/reports/summary` |
| Ubicación | `GET/POST /api/location-requests`, `POST /api/location-requests/:id/received` |
| Notificaciones del usuario | `GET/POST /api/notifications`, `PUT /api/notifications/read-all`, `PATCH /api/notifications/mark-all-read` |

No hay rutas `DELETE`: los registros se activan o inactivan con los endpoints `.../status`.

La definición exacta está en [`routes/index.js`](./routes/index.js) y la validación de cuerpos en [`routes/schemas.js`](./routes/schemas.js).

---

## 📡 Eventos Socket.IO

Los eventos se emiten solo a los usuarios conectados de la misma agencia.

| Evento | Payload | Cuándo |
| ------ | ------- | ------ |
| `incident:created` | `Incident` | Se crea un incidente |
| `incident:updated` | `Incident` | Se actualiza un incidente |
| `admin:log` | `AdminActionLog` | Acción administrativa |
| `location:received` | `{ id, lat, lng, phoneNumber }` | Llega una ubicación compartida |

---

## 📂 Estructura

```text
backend/
├── config/               # app, db (pool MySQL), ldap, validateEnv
├── controllers/          # Lógica de cada recurso (auth, incident, people, roles…)
├── db/gestionincidentes/ # Consultas MySQL por dominio (incidents, medidas, users…)
├── middleware/           # auth (JWT), permissions, rateLimit, securityHeaders,
│                         # validate, auditMiddleware, errorHandler
├── realtime/socket.js    # Socket.IO con salas por agencia
├── routes/               # index.js (API), location.routes.js, notification.route.js, schemas.js
├── scripts/              # ldap-login-test.js
├── services/             # auth, ldap, otp, email, geocode
├── sql/                  # Esquema, catálogos y migraciones (01–05) + import-db.js
├── test/                 # Tests unitarios (node:test)
├── utils/                # Helpers (auditoría, contraseñas, URLs públicas, errores…)
├── views/                # location-share.html
├── .env.example
├── .npmrc                # Supply-chain policy pnpm 11
├── eslint.config.js
└── server.js
```

---

## 🛠️ Troubleshooting

**`ER_ACCESS_DENIED_ERROR`** → Revisa `DB_USER` y `DB_PASSWORD` en `.env`.

**El servidor no arranca y menciona `JWT_SECRET` o `CORS_ORIGIN`** → `config/validateEnv.js` exige `JWT_SECRET`; en producción además pide que no sea el de ejemplo, que tenga 32+ caracteres y que `CORS_ORIGIN` no sea `*`.

**Login da 401** → Verifica `LDAP_ENABLED` y las credenciales. Para cuentas locales revisa la fila en `usuarios`.

**No llega el OTP** → Revisa `MAIL_PROVIDER` y las credenciales `SMTP_*`.

**CORS bloqueado** → Ajusta `CORS_ORIGIN` al origen del frontend.

**El enlace de ubicación sale con `localhost`** → Define `PUBLIC_URL` (o `NGROK_URL` en desarrollo). Ver [DEPLOY.md](../DEPLOY.md).
