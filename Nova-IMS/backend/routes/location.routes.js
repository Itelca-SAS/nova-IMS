const express = require('express');
const router = express.Router();
const path = require('node:path');
const socket = require('../realtime/socket');
const giLocation = require('../db/gestionincidentes/location');
const giUsers = require('../db/gestionincidentes/users');
const { reverseGeocode } = require('../services/geocode.service');
const { recordAudit } = require('../utils/auditTrail');
const logger = require('../utils/logger');

const REQUEST_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function auditLocationReceived(row, { lat, lng, address }) {
  try {
    if (!row?.ID_usuario) return;
    const operator = await giUsers.findUserById(row.ID_usuario, row.ID_Agencia).catch(() => null);
    const coords = `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`;
    await recordAudit({
      actorId: row.ID_usuario,
      actorName: operator?.name || null,
      agencyCode: row.ID_Agencia || operator?.agency_code || null,
      categoria: 'incidente',
      modulo: 'Incidentes',
      tablaAfectada: 'ubicacion',
      accion: 'Recepción de ubicación rápida',
      resultado: 'exitoso',
      detalle: `Se recibió la ubicación de ${row.Numero_ubicacion || 'el solicitante'}: ${
        address || coords
      }`,
    });
  } catch (err) {
    logger.warn('[LOCATION] Auditoría de recepción:', err.message);
  }
}

router.get('/share', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/location-share.html'));
});

router.post('/submit', async (req, res) => {
  const { request_id, lat, lng } = req.body || {};

  if (!request_id || typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: 'request_id, lat y lng son requeridos' });
  }
  if (!REQUEST_ID_RE.test(String(request_id))) {
    return res.status(400).json({ error: 'request_id inválido' });
  }

  try {
    const existing = await giLocation.findByRequestUrlPattern(String(request_id));
    if (!existing) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    const address = await reverseGeocode(lat, lng);
    await giLocation.updateLocationByRequestUrl(String(request_id), lat, lng, address);

    const row = await giLocation.findByRequestUrlPattern(String(request_id));
    const payload = {
      lat,
      lng,
      request_id: String(request_id),
      solicitudId: row?.ID_solicitud ?? null,
      phoneNumber: row?.Numero_ubicacion ?? null,
      address: address || row?.direccion || null,
      timestamp: Date.now(),
    };
    logger.debug('[LOCATION] Socket location:received', payload);
    socket.emitToAgency(row?.ID_Agencia, 'location:received', payload);

    await auditLocationReceived(row, { lat, lng, address });

    res.json({ ok: true, address });
  } catch (err) {
    logger.error('[LOCATION] Error:', err.message);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
