USE gestionincidentes;

ALTER TABLE incidentes
  ADD COLUMN Fecha_cierre DATETIME NULL DEFAULT NULL AFTER FechaHora,
  ADD KEY idx_fecha_cierre (Fecha_cierre);

SET SQL_SAFE_UPDATES = 0;

UPDATE incidentes i
JOIN estadosincidentes es ON es.ID_estado = i.ID_estado
JOIN (
  SELECT ai.incidentes_id, MAX(ai.fecha) AS fecha_cierre
  FROM auditoria_incidente ai
  WHERE ai.accion IN (
    'Cambio de estado → Cerrado',
    'Cambio de estado → Resuelto',
    'Cambio de estado → Cancelado'
  )
  GROUP BY ai.incidentes_id
) c ON c.incidentes_id = i.ID_incidente
SET i.Fecha_cierre = c.fecha_cierre
WHERE es.Nombre_estado IN ('Cerrado', 'Resuelto', 'Cancelado')
  AND i.Fecha_cierre IS NULL;

SET SQL_SAFE_UPDATES = 1;

CREATE OR REPLACE VIEW vw_reporte_incidentes_pbi AS
SELECT
  i.ID_incidente AS id_incidente,
  i.ID_visible AS numero_inc,
  i.FechaHora AS fecha_creacion,
  CAST(i.FechaHora AS DATE) AS fecha,
  YEAR(i.FechaHora) AS anio,
  MONTH(i.FechaHora) AS mes,
  HOUR(i.FechaHora) AS hora_del_dia,
  e.TipoEvento AS tipo_inc,
  e.Descripcion AS descripcion_evento,
  pr.Prioridad AS prioridad,
  es.Nombre_estado AS estado,
  o.Nombre AS origen,
  i.ANI AS celular,
  i.Direccion AS ubicacion,
  i.Latitud AS latitud,
  i.Longitud AS longitud,
  i.IDAgencias AS agencia_codigo,
  ag.Nombre_Agencia AS agencia_nombre,
  (
    SELECT TRIM(CONCAT_WS(' ', u.Primer_Nombre, u.Segundo_Nombre, u.Primer_Apellido, u.Segundo_Apellido))
    FROM personas p
    JOIN usuarios u ON u.ID_Usuario = p.ID_Usuario AND u.ID_Agencia = p.ID_Agencia
    WHERE p.ID_incidente = i.ID_incidente AND p.ID_Usuario IS NOT NULL
    ORDER BY p.FechaRegistro DESC
    LIMIT 1
  ) AS nombre_operador,
  (
    SELECT ci.Comentario
    FROM comentarios_incidentes ci
    WHERE ci.ID_Incidente = i.ID_incidente
    ORDER BY ci.FechaHora DESC
    LIMIT 1
  ) AS comentarios,
  CASE WHEN es.Nombre_estado = 'Cerrado' THEN 1 ELSE 0 END AS es_cerrado,
  CASE WHEN es.Nombre_estado = 'Cancelado' THEN 1 ELSE 0 END AS es_cancelado,
  CASE WHEN es.Nombre_estado NOT IN ('Cerrado', 'Cancelado') THEN 1 ELSE 0 END AS es_activo,
  CASE WHEN pr.Prioridad = 'Alta' THEN 1 ELSE 0 END AS es_prioridad_alta,
  (
    SELECT TIMESTAMPDIFF(MINUTE, MIN(ai.fecha), MAX(ai.fecha))
    FROM auditoria_incidente ai
    WHERE ai.incidentes_id = i.ID_incidente
  ) AS tiempo_resolucion_minutos,
  i.Fecha_cierre AS fecha_cierre
FROM incidentes i
JOIN eventos e ON e.ID_evento = i.ID_evento
JOIN prioridades pr ON pr.ID_prioridad = i.ID_prioridad
JOIN estadosincidentes es ON es.ID_estado = i.ID_estado
JOIN origen o ON o.ID_Origen = i.ID_Origen
JOIN agencias ag ON ag.IDAgencias = i.IDAgencias;
