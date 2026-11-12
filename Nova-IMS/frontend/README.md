# Frontend — Incident Management System

Cliente **Angular 20** (componentes standalone) conectado al backend Node.js + MySQL.

---

## ⚡ Inicio rápido

### 1. Backend en marcha

El backend debe estar activo en `http://localhost:3000`. Ver [backend/README.md](../backend/README.md).

### 2. Instalar y arrancar

```bash
cd frontend
pnpm install
pnpm dev
```

Abre [http://localhost:4200](http://localhost:4200).

---

## 🔧 Scripts pnpm

| Script | Descripción |
| ------ | ----------- |
| `pnpm dev` / `pnpm start` | Dev server en el puerto 4200 con proxy al backend |
| `pnpm build` | Build de producción en `dist/` |
| `pnpm preview` | Sirve la configuración de producción en local |
| `pnpm run lint` | ESLint (Angular + TypeScript + accesibilidad) |
| `pnpm test` | Tests unitarios (Vitest) |
| `pnpm run test:coverage` | Tests + informe LCOV en `coverage/` para SonarCloud |
| `pnpm audit` | Verifica vulnerabilidades en dependencias |

---

## 🔑 Inicio de sesión

1. Se elige la agencia y se ingresa usuario y contraseña (cuenta local creada en Administración o usuario LDAP si `LDAP_ENABLED=true` en el backend).
2. Se ingresa el código OTP que llega al correo.
3. Desde la misma pantalla se puede recuperar la contraseña.

---

## 🏗️ Arquitectura

### Proxy de desarrollo

El dev server corre en el **puerto 4200** y redirige al backend (puerto 3000) las llamadas a `/api/**` y `/socket.io` mediante `proxy.conf.json`. Así se evitan problemas de CORS en desarrollo.

### Configuración (`src/environments/`)

| Clave | Uso |
| ----- | --- |
| `apiUrl` | URL base del backend. Vacía = mismo origen (proxy en desarrollo, nginx en producción) |
| `publicShareBaseUrl` | URL pública para los enlaces de ubicación |
| `powerBiEmbedUrl` | Informe de Power BI embebido en Reportes |

La clave de Google Maps **no** va en el repo: se obtiene en tiempo de ejecución de `GET /api/config/public`.

### Autenticación

- El login (`components/login/`) llama a `POST /api/auth/login` y luego a `POST /api/auth/verify-otp`, que devuelve el JWT.
- El JWT se guarda en `sessionStorage` (key `ims_token`).
- El interceptor `src/interceptors/auth.interceptor.ts` añade `Authorization: Bearer <token>` a cada petición y cierra la sesión si el backend responde 401.
- `inactivity.service.ts` + `session-warning` avisan y cierran la sesión por inactividad.
- `permission.service.ts` muestra u oculta módulos y acciones según los permisos del rol (`GET /api/auth/permissions`).

### Tiempo real

`src/services/socket.service.ts` se conecta a `/socket.io` en el mismo origen (o en `apiUrl`) y escucha:

- `incident:created` / `incident:updated`
- `admin:log`
- `location:received`

---

## 📂 Estructura principal

```text
frontend/
├── index.html              ← Fuentes, Tailwind e iconos
├── index.tsx               ← Bootstrap con interceptor JWT
├── proxy.conf.json         ← Proxy dev /api y /socket.io → :3000
├── angular.json            ← Build/serve (puerto 4200, proxy)
├── eslint.config.js
├── vitest.config.ts
├── pnpm-workspace.yaml     ← Builds de dependencias aprobados
└── src/
    ├── app.component.{ts,html}
    ├── environments/       ← environment.ts / environment.prod.ts
    ├── models/             ← incident, user, admin
    ├── interceptors/       ← auth.interceptor.ts
    ├── services/           ← auth, incident, person, socket, permission,
    │                         inactivity, reports, location-request,
    │                         notification, configuration, audit-client…
    ├── utils/              ← Helpers + sus tests (*.spec.ts)
    └── components/
        ├── login/
        ├── incidents/              ← Dashboard y formulario de incidentes
        ├── incident-list/
        ├── medidas/                ← Medidas de seguridad del incidente
        ├── incident-email-modal/
        ├── admin/                  ← Usuarios, personas, tipos, protocolos, correos, permisos, auditoría
        ├── reports/
        ├── profile-modal/
        ├── change-password/
        └── session-warning/
```

---

## 🛠️ Troubleshooting

**`ECONNREFUSED 127.0.0.1:3000`** → El backend no está corriendo.

**Login da 401** → Revisa que el usuario exista en Administración o en LDAP, y la configuración del backend.

**No aparece el mapa** → Falta `GOOGLE_MAPS_API_KEY` en `backend/.env`, o la clave no permite el dominio actual en Google Cloud.

**Socket.IO no conecta** → Revisa que el proxy esté activo (`proxy.conf.json`) y que el backend esté en el puerto 3000.

**Estilos o iconos no cargan** → `index.html` carga Tailwind y las fuentes desde CDN; se necesita acceso a internet.

**Cambiar la URL del backend** → En desarrollo, el `target` de `proxy.conf.json`. Si el backend está en otro dominio, `apiUrl` en `src/environments/`.
