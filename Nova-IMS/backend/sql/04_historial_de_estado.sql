USE gestionincidentes;

CREATE TABLE historial_de_estado (
  ID_historial INT NOT NULL AUTO_INCREMENT,
  ID_incidente INT NOT NULL,
  ID_estado_anterior INT DEFAULT NULL,
  ID_estado_nuevo INT NOT NULL,
  FechaHora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ID_usuario VARCHAR(20) DEFAULT NULL,
  ID_Agencia VARCHAR(5) NOT NULL,
  PRIMARY KEY (ID_historial),
  KEY idx_historial_incidente (ID_incidente, FechaHora),
  KEY idx_historial_fecha (FechaHora),
  CONSTRAINT fk_historial_incidente FOREIGN KEY (ID_incidente) REFERENCES incidentes (ID_incidente),
  CONSTRAINT fk_historial_estado_anterior FOREIGN KEY (ID_estado_anterior) REFERENCES estadosincidentes (ID_estado),
  CONSTRAINT fk_historial_estado_nuevo FOREIGN KEY (ID_estado_nuevo) REFERENCES estadosincidentes (ID_estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO historial_de_estado
  (ID_incidente, ID_estado_anterior, ID_estado_nuevo, FechaHora, ID_usuario, ID_Agencia)
SELECT
  i.ID_incidente,
  NULL,
  COALESCE(e_ini.ID_estado, i.ID_estado),
  i.FechaHora,
  (
    SELECT a.usuarios_id
    FROM auditoria_incidente a
    WHERE a.incidentes_id = i.ID_incidente AND a.accion = 'Creación'
    ORDER BY a.fecha
    LIMIT 1
  ),
  i.IDAgencias
FROM incidentes i
LEFT JOIN estadosincidentes e_ini
  ON e_ini.ID_Agencia = i.IDAgencias
 AND BINARY e_ini.Nombre_estado = BINARY (
   SELECT jt.estado_old
   FROM auditoria_incidente a,
        JSON_TABLE(a.detalles, '$.changes[*]' COLUMNS (
          campo VARCHAR(50) PATH '$.field',
          estado_old VARCHAR(100) PATH '$.old'
        )) jt
   WHERE a.incidentes_id = i.ID_incidente
     AND a.accion LIKE 'Cambio de estado%'
     AND jt.campo = 'Estado'
   ORDER BY a.fecha
   LIMIT 1
 );

INSERT INTO historial_de_estado
  (ID_incidente, ID_estado_anterior, ID_estado_nuevo, FechaHora, ID_usuario, ID_Agencia)
SELECT
  a.incidentes_id,
  ea.ID_estado,
  en.ID_estado,
  a.fecha,
  a.usuarios_id,
  i.IDAgencias
FROM auditoria_incidente a
JOIN incidentes i ON i.ID_incidente = a.incidentes_id
JOIN JSON_TABLE(a.detalles, '$.changes[*]' COLUMNS (
  campo VARCHAR(50) PATH '$.field',
  estado_old VARCHAR(100) PATH '$.old',
  estado_new VARCHAR(100) PATH '$.new'
)) jt ON jt.campo = 'Estado'
JOIN estadosincidentes en
  ON en.ID_Agencia = i.IDAgencias AND BINARY en.Nombre_estado = BINARY jt.estado_new
LEFT JOIN estadosincidentes ea
  ON ea.ID_Agencia = i.IDAgencias AND BINARY ea.Nombre_estado = BINARY jt.estado_old
WHERE a.accion LIKE 'Cambio de estado%'
ORDER BY a.fecha;

CREATE OR REPLACE VIEW vw_historial_de_estado AS
SELECT
  h.ID_historial AS id_historial,
  h.ID_incidente AS id_incidente,
  i.ID_visible AS numero_inc,
  h.ID_Agencia AS agencia_codigo,
  ea.Nombre_estado AS estado_anterior,
  en.Nombre_estado AS estado_nuevo,
  h.FechaHora AS fecha_cambio,
  h.ID_usuario AS usuario,
  TRIM(CONCAT_WS(' ', u.Primer_Nombre, u.Segundo_Nombre, u.Primer_Apellido, u.Segundo_Apellido)) AS nombre_usuario,
  TIMESTAMPDIFF(
    MINUTE,
    LAG(h.FechaHora) OVER (PARTITION BY h.ID_incidente ORDER BY h.FechaHora, h.ID_historial),
    h.FechaHora
  ) AS minutos_en_estado_anterior
FROM historial_de_estado h
JOIN incidentes i ON i.ID_incidente = h.ID_incidente
JOIN estadosincidentes en ON en.ID_estado = h.ID_estado_nuevo
LEFT JOIN estadosincidentes ea ON ea.ID_estado = h.ID_estado_anterior
LEFT JOIN usuarios u ON u.ID_Usuario = h.ID_usuario AND u.ID_Agencia = h.ID_Agencia;
