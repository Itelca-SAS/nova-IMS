const express = require('express');
const router = express.Router();

const { pool } = require('../config/db');
const { authRequired } = require('../middleware/auth');
const auditMiddleware = require('../middleware/auditMiddleware');
const { recordAudit, formatAuditDetailsText } = require('../utils/auditTrail');
const { isRiesgoOrdinario } = require('../db/gestionincidentes/riesgoNivel');
const perm = require('../middleware/permissions');
const { getAllowedNextStates } = require('../db/gestionincidentes/transitions');
const { mapStatusToGi } = require('../db/gestionincidentes/maps');

const authCtrl = require('../controllers/auth.controller');
const incCtrl = require('../controllers/incident.controller');
const peopleCtrl = require('../controllers/people.controller');
const opCtrl = require('../controllers/operator.controller');
const typeCtrl = require('../controllers/incidentType.controller');
const protoCtrl = require('../controllers/protocol.controller');
const notifCtrl = require('../controllers/notification.controller');
const roleCtrl = require('../controllers/role.controller');
const logCtrl = require('../controllers/log.controller');
const locCtrl = require('../controllers/locationRequest.controller');
const catCtrl = require('../controllers/catalog.controller');
const reportsCtrl = require('../controllers/reports.controller');
const configCtrl = require('../controllers/config.controller');
const auditClientCtrl = require('../controllers/auditClient.controller');
const medidas = require('../db/gestionincidentes/medidas');
const giIncidents = require('../db/gestionincidentes/incidents');
const { sessionDisplayName } = require('../utils/jwtUser');
const HttpError = require('../utils/HttpError');
const rateLimit = require('../middleware/rateLimit');
const { validateBody } = require('../middleware/validate');
const schemas = require('./schemas');

const FIFTEEN_MIN = 15 * 60 * 1000;
const loginLimiter = rateLimit({ name: 'login', windowMs: FIFTEEN_MIN, max: 10 });
const otpLimiter = rateLimit({ name: 'otp', windowMs: FIFTEEN_MIN, max: 10 });
const forgotLimiter = rateLimit({ name: 'forgot', windowMs: FIFTEEN_MIN, max: 5 });
const resetLimiter = rateLimit({ name: 'reset', windowMs: FIFTEEN_MIN, max: 10 });
const changeCredLimiter = rateLimit({ name: 'change-cred', windowMs: FIFTEEN_MIN, max: 10 });

async function requireIncidentInAgency(req, res, next) {
  try {
    const agency = req.user?.agency_code || req.user?.agency;
    const internalId = agency ? await giIncidents.getInternalId(req.params.id, agency) : null;
    if (!internalId) return next(new HttpError(404, 'Incidente no encontrado'));
    next();
  } catch (err) {
    next(err);
  }
}

async function writeIncidentAudit(incidentId, user, { action, changes, details }) {
  if (!details?.length) return;
  await giIncidents.writeAudit(pool, {
    incidentId,
    user,
    action,
    changes,
    details,
    actorDisplayName: sessionDisplayName(user, 'Sistema'),
  });
}

router.get('/config/public', configCtrl.publicConfig);
router.post('/auth/login', validateBody(schemas.login), loginLimiter, authCtrl.login);
router.post('/auth/verify-otp', validateBody(schemas.verifyOtp), otpLimiter, authCtrl.verifyOtp);
router.post(
  '/auth/forgot-password',
  validateBody(schemas.forgotPassword),
  forgotLimiter,
  authCtrl.forgotPassword,
);
router.post(
  '/auth/reset-password',
  validateBody(schemas.resetPassword),
  resetLimiter,
  authCtrl.resetPassword,
);
router.post(
  '/auth/change-password-credentials',
  validateBody(schemas.changePasswordWithCredentials),
  changeCredLimiter,
  authCtrl.changePasswordWithCredentials,
);
router.get('/auth/ldap-health', authCtrl.ldapHealth);
router.get('/agencies', catCtrl.agencies);
router.get('/login/options', catCtrl.loginOptions);
router.get('/roles/list', catCtrl.rolesSimple);
router.get('/departments', catCtrl.departments);
router.get('/municipalities', catCtrl.municipalities);
router.get('/place-roles', catCtrl.placeRoles);
router.get('/vehicle-roles', catCtrl.vehicleRoles);
router.get('/origins', catCtrl.origins);
router.get('/incident-statuses', catCtrl.incidentStatuses);
router.get('/priorities', catCtrl.priorities);
router.get('/incident-statuses/allowed', authRequired, async (req, res, next) => {
  try {
    const { currentStatus } = req.query;
    const allowedNames = getAllowedNextStates(currentStatus);

    if (!allowedNames.length) {
      return res.json([]);
    }

    const giNames = allowedNames.map((name) => mapStatusToGi(name));
    const agency = req.user?.agency_code;
    if (!agency) {
      return res.status(400).json({ error: { message: 'Agency requerida' } });
    }

    const placeholders = giNames.map(() => '?').join(',');
    const [rows] = await pool.query(
      `SELECT ID_estado AS id, Nombre_estado AS name
       FROM estadosincidentes
       WHERE Nombre_estado IN (${placeholders})
         AND UPPER(ID_Agencia) = UPPER(?)
       ORDER BY ID_estado`,
      [...giNames, agency],
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.use(authRequired);

router.use(auditMiddleware);

router.post('/audit/client-event', auditClientCtrl.clientEvent);

router.get('/auth/me', authCtrl.me);
router.get('/auth/permissions', authCtrl.permissions);
router.post('/auth/change-password', validateBody(schemas.changePassword), authCtrl.changePassword);
router.post('/auth/logout', authCtrl.logout);

router.get('/incidents', incCtrl.list);
router.get('/incidents/dashboard-metrics', incCtrl.dashboardMetrics);
router.get('/incidents/vehicle-lookup/:plate', incCtrl.lookupVehicleByPlate);
router.get('/incidents/:id', incCtrl.getOne);
router.post('/incidents/:id/send-email', perm.notify('Incidentes'), incCtrl.sendEmail);
router.post('/incidents', perm.create('Incidentes'), validateBody(schemas.incident), incCtrl.create);
router.put('/incidents/:id', perm.edit('Incidentes'), validateBody(schemas.incident), incCtrl.update);

router.get('/people', peopleCtrl.list);
router.post('/people', perm.create('Administración'), validateBody(schemas.person), peopleCtrl.create);
router.put('/people/:id', perm.edit('Administración'), validateBody(schemas.person), peopleCtrl.update);
router.patch('/people/:id/status', perm.edit('Administración'), peopleCtrl.setStatus);
router.get('/person-roles', peopleCtrl.personRoles);
router.get('/judge-cargos', peopleCtrl.judgeCargos);
router.get('/genders', peopleCtrl.genders);
router.get('/document-types', peopleCtrl.documentTypes);

router.get('/telephony/lookup/:phone', peopleCtrl.lookupByPhone);
router.get('/people/lookup/document/:documentId', peopleCtrl.lookupByDocument);

router.get('/operators', opCtrl.list);
router.post('/operators', perm.create('Administración'), validateBody(schemas.operator), opCtrl.create);
router.put('/operators/:id', perm.edit('Administración'), validateBody(schemas.operator), opCtrl.update);

router.get('/incident-types', typeCtrl.list);
router.post('/incident-types', perm.create('Administración'), typeCtrl.create);
router.put('/incident-types/:id', perm.edit('Administración'), typeCtrl.update);

router.get('/response-protocols', protoCtrl.list);
router.post('/response-protocols', perm.create('Administración'), protoCtrl.create);
router.put('/response-protocols/:id', perm.edit('Administración'), protoCtrl.update);

router.get('/notification-emails', notifCtrl.list);
router.post(
  '/notification-emails',
  perm.create('Administración'),
  validateBody(schemas.notificationEmail),
  notifCtrl.add,
);
router.patch('/notification-emails/:email/status', perm.edit('Administración'), notifCtrl.setStatus);

router.get('/roles', perm.view('Administración'), roleCtrl.list);
router.post('/roles', perm.create('Administración'), validateBody(schemas.role), roleCtrl.create);
router.put('/roles/:id', perm.edit('Administración'), roleCtrl.update);

router.get('/admin-logs', perm.view('Administración'), logCtrl.adminLogs);
router.get('/audit-logs', logCtrl.auditLogs);
router.get('/users-audit-summary', perm.view('Administración'), logCtrl.usersAuditSummary);
router.get('/users-audit-summary/:userId/actions', perm.view('Administración'), logCtrl.userActions);
router.get('/reports/summary', perm.view('Reportes'), reportsCtrl.summary);

router.get('/location-requests', locCtrl.list);
router.post('/location-requests', validateBody(schemas.locationRequest), locCtrl.create);
router.post('/location-requests/:id/received', locCtrl.receive);

router.get('/catalog/riesgos', async (req, res, next) => {
  try {
    const agency = req.user?.agency_code || req.user?.agency;
    const [rows] = await pool.query(
      `SELECT ID_riesgo AS id, Nombre_riesgo AS nombre, Descripcion AS descripcion
       FROM riesgos WHERE ID_Agencia = ? ORDER BY ID_riesgo`,
      [agency],
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/medidas/tipos', async (req, res, next) => {
  try {
    const agency = req.user?.agency_code || req.user?.agency;
    const rows = await medidas.getTiposMedida(agency);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get('/incidents/:id/medidas', requireIncidentInAgency, async (req, res, next) => {
  try {
    const solicitud = await medidas.getSolicitudFromPersonas(req.params.id);
    const gestion = await medidas.getGestionByIncidente(req.params.id);
    if (!gestion) {
      return res.json({ gestion: null, medidas: [], solicitud });
    }
    const lista = await medidas.getMedidasByGestion(gestion.ID_gestion);
    res.json({ gestion, medidas: lista, solicitud });
  } catch (err) {
    next(err);
  }
});

router.post('/incidents/:id/gestion', requireIncidentInAgency, async (req, res, next) => {
  try {
    const visibleId = req.params.id;
    const beforeGestion = await medidas.getGestionByIncidente(visibleId);
    const idGestion = await medidas.upsertGestion(visibleId, req.body, req.user);
    const gestion = await medidas.getGestionByIncidente(visibleId);
    const auditDetails = medidas.buildGestionAuditDetails(beforeGestion, gestion);
    if (auditDetails.length) {
      await writeIncidentAudit(visibleId, req.user, {
        action: 'Actualización gestión OSEG/CERREM',
        changes: `${auditDetails.length} campo(s) en gestión`,
        details: auditDetails,
      });
      await recordAudit({
        req,
        user: req.user,
        categoria: 'incidente',
        modulo: 'Incidentes',
        tablaAfectada: 'gestion_medidas',
        accion: `Gestión OSEG/CERREM (Incidente ${visibleId})`,
        resultado: 'exitoso',
        detalle: formatAuditDetailsText(auditDetails),
      });
    } else {
      req.skipAutoAudit = true;
    }
    res.json({
      ok: true,
      ID_gestion: idGestion,
      codigo_oficio: gestion?.codigo_oficio ?? null,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/incidents/:id/medidas', requireIncidentInAgency, async (req, res, next) => {
  try {
    const visibleId = req.params.id;
    let gestion = await medidas.getGestionByIncidente(visibleId);
    if (!gestion) {
      await medidas.upsertGestion(visibleId, {}, req.user);
      gestion = await medidas.getGestionByIncidente(visibleId);
    }
    if (!gestion) {
      return res.status(404).json({
        error: { message: 'No se pudo registrar la gestión del incidente.' },
      });
    }
    const lista = Array.isArray(req.body.medidas) ? req.body.medidas : [];
    if (!lista.length) {
      return res.status(400).json({
        error: { message: 'Seleccione al menos una medida de seguridad.' },
      });
    }
    if (isRiesgoOrdinario(gestion)) {
      return res.status(409).json({
        error: {
          message:
            'El nivel de riesgo Ordinario no requiere medidas de seguridad. Cierre el incidente en «Cerrado».',
        },
      });
    }
    const beforeMedidas = await medidas.getMedidasByGestion(gestion.ID_gestion);
    const beforeMeta = { ...gestion };
    await medidas.asignarMedidas(gestion.ID_gestion, lista, req.user, {
      tipo_esquema: req.body.tipo_esquema,
      compartido_con: req.body.compartido_con,
      observaciones: req.body.observaciones,
    });
    const afterGestion = await medidas.getGestionByIncidente(visibleId);
    const afterMedidas = await medidas.getMedidasByGestion(gestion.ID_gestion);
    const auditDetails = [
      ...medidas.buildMedidasAuditDetails(beforeMedidas, afterMedidas),
      ...medidas.buildMedidasMetaAuditDetails(beforeMeta, afterGestion),
    ];
    if (auditDetails.length) {
      await writeIncidentAudit(visibleId, req.user, {
        action: 'Medidas de seguridad',
        changes: `${auditDetails.length} cambio(s) en medidas`,
        details: auditDetails,
      });
      await recordAudit({
        req,
        user: req.user,
        categoria: 'incidente',
        modulo: 'Incidentes',
        tablaAfectada: 'incidente_medidas',
        accion: `Medidas de seguridad (Incidente ${visibleId})`,
        resultado: 'exitoso',
        detalle: formatAuditDetailsText(auditDetails),
      });
    } else {
      req.skipAutoAudit = true;
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
