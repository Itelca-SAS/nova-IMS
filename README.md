# 🚨 Incident Management System (IMS) — Nova-IMS

Sistema de gestión de incidentes de emergencia en tiempo real.
Incluye dashboard con mapa, registro y seguimiento de incidentes, medidas de seguridad, administración de operadores, personas, protocolos y roles, auditoría, reportes y solicitud de ubicación por WhatsApp/SMS.

![Node](https://img.shields.io/badge/Node.js-22%2B-339933?logo=node.js&logoColor=white)
![Angular](https://img.shields.io/badge/Angular-20-DD0031?logo=angular&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8.x-4479A1?logo=mysql&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-010101?logo=socket.io&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-11-F69220?logo=pnpm&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

---

## 📚 Documentación

| Documento | Contenido |
| --------- | --------- |
| [Nova-IMS/backend/README.md](./Nova-IMS/backend/README.md) | API REST, variables de entorno, base de datos, Socket.IO, login LDAP/local |
| [Nova-IMS/frontend/README.md](./Nova-IMS/frontend/README.md) | Estructura Angular, proxy, autenticación en cliente, scripts |
| [Nova-IMS/DEPLOY.md](./Nova-IMS/DEPLOY.md) | Despliegue en producción (nginx), ngrok y flujo WhatsApp/SMS |

---

## 🧱 Stack tecnológico

| Capa | Tecnología |
| ---- | ---------- |
| **Frontend** | Angular 20, TypeScript, Tailwind CSS, Google Maps |
| **Backend** | Node.js, Express 4, Socket.IO 4 |
| **Base de datos** | MySQL 8.x (`gestionincidentes`) |
| **Auth** | JWT + bcryptjs + LDAP/Active Directory + OTP por correo |
| **Correo** | Nodemailer (SMTP Office 365) o Resend |
| **Tests** | `node:test` (backend), Vitest (frontend) |
| **Package manager** | pnpm 11 |

---

## 📁 Estructura del monorepo

```text
.
├── .github/
│   └── dependabot.yml    # Dependabot (backend y frontend)
├── .sonarcloud.properties
├── LICENSE
├── README.md
└── Nova-IMS/
    ├── backend/          # API Express + Socket.IO + scripts SQL
    ├── frontend/         # Cliente Angular 20
    ├── .prettierrc
    ├── .prettierignore
    └── DEPLOY.md
```

---

## 🚀 Inicio rápido

### Prerrequisitos

- **Node.js** 22 LTS o superior (Angular 20 exige mínimo 20.19)
- **MySQL** 8.x
- **pnpm** 11 — `npm install -g pnpm@latest`
- **git**

### 1️⃣ Clonar el repositorio

```bash
git clone https://github.com/Rogelio-Menco-Itelca/nova-IMS.git
cd nova-IMS/Nova-IMS
```

### 2️⃣ Backend

```bash
cd backend
cp .env.example .env        # edita credenciales MySQL, JWT, correo, Google Maps
pnpm install
pnpm run db:import          # solo en una BD nueva: esquema + catálogos
pnpm dev                    # http://localhost:3000
```

> Si ya tienes el dump del cliente restaurado, **no** ejecutes `db:import`. Ver la sección "Base de datos" de [backend/README.md](./Nova-IMS/backend/README.md).

### 3️⃣ Frontend (en otra terminal)

```bash
cd frontend
pnpm install
pnpm dev                    # http://localhost:4200
```

### 4️⃣ Iniciar sesión

Abre [http://localhost:4200](http://localhost:4200).

- **Cuenta local:** operador creado desde el módulo de Administración (contraseña en MySQL).
- **Directorio:** usuario LDAP/AD, con `LDAP_ENABLED=true` en `backend/.env`.

Tras validar la contraseña se envía un código OTP al correo del usuario.

---

## 🗺️ Arquitectura

```text
       ┌──────────────────────────┐
       │        Navegador         │
       │ Angular 20 (puerto 4200) │
       └────────────┬─────────────┘
                    │
       ┌────────────┴────────────┐
       │                         │
   HTTP (REST)          WebSocket (Socket.IO)
     /api/**                /socket.io
       │                         │
       └────────────┬────────────┘
                    │
       ┌────────────┴─────────────┐
       │   Backend Node/Express   │
       │       (puerto 3000)      │
       │  • JWT + OTP + LDAP/AD   │
       │  • Permisos por rol      │
       │  • Auditoría             │
       │  • Eventos por agencia   │
       └────────────┬─────────────┘
                    │ mysql2
       ┌────────────┴─────────────┐
       │        MySQL 8.x         │
       │    gestionincidentes     │
       └──────────────────────────┘
```

En desarrollo, el dev server de Angular redirige `/api/**` y `/socket.io` al backend mediante `Nova-IMS/frontend/proxy.conf.json`. En producción ambos se sirven desde el mismo dominio (ver [DEPLOY.md](./Nova-IMS/DEPLOY.md)).

---

## ✨ Funcionalidades

- 🔐 **Autenticación** JWT + bcrypt + LDAP, segundo factor por OTP, recuperación y cambio de contraseña
- 🛡️ **Permisos granulares** por rol y módulo, con datos aislados por agencia
- 🗺️ **Dashboard** con Google Maps y métricas de incidentes activos en tiempo real
- 📋 **Incidentes** con personas, vehículos, lugares, notas y control de edición simultánea
- 🧾 **Medidas de seguridad** asociadas a cada incidente
- ⚙️ **Administración** de operadores, personas, tipos de incidente, protocolos, roles y correos de notificación
- 📊 **Reportes** y vistas para Power BI
- 📜 **Auditoría** de cambios de incidentes y acciones administrativas
- 🔴 **Tiempo real** vía Socket.IO sin refrescar
- 📱 **Solicitud de ubicación** por WhatsApp/SMS con consentimiento del usuario
- 📧 **Notificaciones por correo** de incidentes

---

## 🔧 Scripts principales

| Carpeta | Script | Descripción |
| ------- | ------ | ----------- |
| `backend` | `pnpm dev` | Servidor con nodemon (hot reload) |
| `backend` | `pnpm run db:import` | Esquema + catálogos base en MySQL |
| `backend` | `pnpm test` | Tests unitarios |
| `frontend` | `pnpm dev` | Dev server en el puerto 4200 |
| `frontend` | `pnpm build` | Build de producción |
| `frontend` | `pnpm test` | Tests unitarios (Vitest) |

La lista completa está en el README de cada carpeta.

---

## 🛡️ Calidad y seguridad

| Herramienta | Alcance | Estado |
| ----------- | ------- | ------ |
| ESLint + angular-eslint | Frontend | ✅ `pnpm run lint` |
| ESLint + plugin de seguridad | Backend | ✅ `pnpm run lint` |
| Prettier | Ambos | ✅ `.prettierrc` en la raíz |
| SonarCloud | Ambos | ✅ `.sonarcloud.properties` + cobertura LCOV |
| pnpm 11 supply-chain policy | Ambos | ✅ `.npmrc` |
| Dependabot | Ambos | ✅ Revisión semanal |
| Rate limit en login / OTP / contraseñas | Backend | ✅ `middleware/rateLimit.js` |
| Cabeceras de seguridad | Backend | ✅ `middleware/securityHeaders.js` |
| Tests unitarios | Ambos | 🟡 Cobertura parcial (utils y seguridad) |
| Tests E2E | Frontend | 🔄 Pendiente |

### Supply-chain policy (`.npmrc`)

```ini
minimumReleaseAge=1440        # No instala paquetes publicados hace < 24 h
trustPolicy=no-downgrade      # Rechaza paquetes que pierden evidencia de procedencia
trustPolicyIgnoreAfter=43200  # Omite la verificación para paquetes con > 30 días
```

---

## 🔐 Checklist de producción

- [ ] `JWT_SECRET` aleatorio de 64+ caracteres
- [ ] `NODE_ENV=production`
- [ ] HTTPS con nginx como reverse proxy (ver [DEPLOY.md](./Nova-IMS/DEPLOY.md))
- [ ] `CORS_ORIGIN`, `APP_URL` y `PUBLIC_URL` con el dominio real
- [ ] `GOOGLE_MAPS_API_KEY` restringida por dominio en Google Cloud
- [ ] Credenciales SMTP de producción
- [ ] `LDAP_ENABLED=true` con credenciales de producción (si aplica)
- [ ] Backups automáticos de MySQL

---

## 📝 Licencia

MIT — ver [LICENSE](./LICENSE).

---

## 🤝 Contribuir

1. Crea una rama desde `develop`: `git checkout -b feature/mi-feature`
2. Commit: `git commit -m "feat: agrega nueva feature"`
3. Push: `git push origin feature/mi-feature`
4. Abre un Pull Request hacia `develop`
