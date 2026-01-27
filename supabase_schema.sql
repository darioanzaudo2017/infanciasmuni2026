-- =====================================================
-- ESQUEMA COMPLETO Y OPTIMIZADO
-- Sistema de Protección de Derechos de NNyA
-- =====================================================

-- Zonas
CREATE TABLE IF NOT EXISTS zonas (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Barrios
CREATE TABLE IF NOT EXISTS barrios (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL UNIQUE,
    coordenada_x NUMERIC(10, 6),
    coordenada_y NUMERIC(10, 6),
    zona_id BIGINT REFERENCES zonas(id)
);

-- Servicios de Protección
CREATE TABLE IF NOT EXISTS servicios_proteccion (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL UNIQUE,
    telefono VARCHAR(50),
    email VARCHAR(100),
    direccion TEXT,
    zona_id BIGINT REFERENCES zonas(id),
    carpeta_drive_id VARCHAR(100)
);

-- Roles
CREATE TABLE IF NOT EXISTS roles (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);

-- Estados
CREATE TABLE IF NOT EXISTS estados (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    tipo VARCHAR(20) NOT NULL, -- 'expediente', 'ingreso', 'medida'
    UNIQUE(nombre, tipo)
);

-- Catálogo de Derechos
CREATE TABLE IF NOT EXISTS catalogo_derechos (
    id BIGSERIAL PRIMARY KEY,
    categoria VARCHAR(100) NOT NULL,
    subcategoria VARCHAR(100),
    UNIQUE(categoria, subcategoria)
);

-- Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    nombre_completo VARCHAR(200),
    email VARCHAR(100),
    servicio_proteccion_id BIGINT REFERENCES servicios_proteccion(id),
    zona_id BIGINT REFERENCES zonas(id),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usuarios_roles (
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    rol_id BIGINT REFERENCES roles(id),
    PRIMARY KEY (usuario_id, rol_id)
);

-- NIÑO
CREATE TABLE IF NOT EXISTS ninos (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    dni BIGINT UNIQUE,
    fecha_nacimiento DATE,
    genero VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- EXPEDIENTE
CREATE TABLE IF NOT EXISTS expedientes (
    id BIGSERIAL PRIMARY KEY,
    numero VARCHAR(50) NOT NULL UNIQUE,
    nino_id BIGINT NOT NULL UNIQUE REFERENCES ninos(id),
    servicio_proteccion_id BIGINT REFERENCES servicios_proteccion(id),
    zona_id BIGINT REFERENCES zonas(id),
    profesional_id UUID REFERENCES usuarios(id),
    fecha_apertura DATE NOT NULL DEFAULT CURRENT_DATE,
    activo BOOLEAN DEFAULT TRUE,
    carpeta_drive_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INGRESOS
CREATE TABLE IF NOT EXISTS ingresos (
    id BIGSERIAL PRIMARY KEY,
    expediente_id BIGINT NOT NULL REFERENCES expedientes(id) ON DELETE CASCADE,
    numero_ingreso SMALLINT,
    fecha_ingreso DATE NOT NULL DEFAULT CURRENT_DATE,
    es_emergencia BOOLEAN DEFAULT FALSE,
    etapa VARCHAR(50) DEFAULT 'Recepción',
    estado VARCHAR(50) DEFAULT 'Activo',
    fecha_cierre DATE,
    motivo_cierre TEXT,
    carpeta_drive_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(expediente_id, numero_ingreso)
);

-- GRUPO CONVIVIENTE
CREATE TABLE IF NOT EXISTS grupo_conviviente (
    id BIGSERIAL PRIMARY KEY,
    expediente_id BIGINT NOT NULL REFERENCES expedientes(id) ON DELETE CASCADE,
    nombre VARCHAR(100),
    apellido VARCHAR(100),
    dni BIGINT,
    fecha_nacimiento DATE,
    vinculo VARCHAR(100),
    telefono VARCHAR(50),
    direccion TEXT,
    convive BOOLEAN DEFAULT TRUE,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FORMULARIO 1
CREATE TABLE IF NOT EXISTS form1_datos_nino (
    ingreso_id BIGINT PRIMARY KEY REFERENCES ingresos(id) ON DELETE CASCADE,
    domicilio TEXT,
    barrio_id BIGINT REFERENCES barrios(id),
    telefono VARCHAR(50),
    centro_salud VARCHAR(200),
    historia_clinica VARCHAR(100),
    tiene_cud BOOLEAN DEFAULT FALSE,
    obra_social VARCHAR(200),
    escuela VARCHAR(200),
    curso VARCHAR(50),
    turno VARCHAR(50),
    asiste_regularmente BOOLEAN,
    trabaja BOOLEAN DEFAULT FALSE,
    trabajo_detalle TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS form1_derivacion (
    ingreso_id BIGINT PRIMARY KEY REFERENCES ingresos(id) ON DELETE CASCADE,
    tipo VARCHAR(50) DEFAULT 'institucional',
    nombre_solicitante VARCHAR(200),
    dni_solicitante BIGINT,
    telefono_solicitante VARCHAR(50),
    vinculo VARCHAR(100),
    institucion VARCHAR(200),
    profesional_contacto VARCHAR(200),
    telefono_institucion VARCHAR(50),
    email_institucion VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS form1_situacion (
    ingreso_id BIGINT PRIMARY KEY REFERENCES ingresos(id) ON DELETE CASCADE,
    tiene_auh BOOLEAN,
    tiene_paicor BOOLEAN,
    tiene_tarjeta_alimentar BOOLEAN,
    pension TEXT,
    otros_ingresos TEXT,
    agua BOOLEAN,
    cloacas BOOLEAN,
    gas BOOLEAN,
    electricidad BOOLEAN,
    internet BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS form1_motivo (
    ingreso_id BIGINT PRIMARY KEY REFERENCES ingresos(id) ON DELETE CASCADE,
    motivo TEXT NOT NULL,
    descripcion_situacion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS form1_intervenciones_previas (
    id BIGSERIAL PRIMARY KEY,
    ingreso_id BIGINT NOT NULL REFERENCES ingresos(id) ON DELETE CASCADE,
    organismo VARCHAR(200),
    acciones TEXT,
    resultado TEXT
);

CREATE TABLE IF NOT EXISTS form1_criterios (
    ingreso_id BIGINT PRIMARY KEY REFERENCES ingresos(id) ON DELETE CASCADE,
    tiene_criterios BOOLEAN DEFAULT FALSE,
    criterios TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS form1_decision (
    ingreso_id BIGINT PRIMARY KEY REFERENCES ingresos(id) ON DELETE CASCADE,
    decision VARCHAR(50),
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AMPLIACIONES
CREATE TABLE IF NOT EXISTS ampliaciones (
    id BIGSERIAL PRIMARY KEY,
    ingreso_id BIGINT NOT NULL REFERENCES ingresos(id) ON DELETE CASCADE,
    tipo VARCHAR(50), -- 'entrevista_adulto', 'entrevista_nino', 'visita'
    fecha DATE,
    profesionales TEXT,
    nombre_entrevistado VARCHAR(100),
    apellido_entrevistado VARCHAR(100),
    relacion VARCHAR(100),
    objetivo TEXT,
    registro TEXT,
    observaciones TEXT,
    documento_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INFORME TÉCNICO
CREATE TABLE IF NOT EXISTS informes_tecnicos (
    id BIGSERIAL PRIMARY KEY,
    ingreso_id BIGINT NOT NULL REFERENCES ingresos(id) ON DELETE CASCADE,
    fecha DATE,
    profesionales TEXT,
    fundamento TEXT,
    antecedentes TEXT,
    valoracion_integral TEXT,
    propuesta_medida TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MEDIDAS
CREATE TABLE IF NOT EXISTS medidas (
    id BIGSERIAL PRIMARY KEY,
    ingreso_id BIGINT NOT NULL REFERENCES ingresos(id) ON DELETE CASCADE,
    fecha DATE,
    medida_propuesta TEXT NOT NULL,
    descripcion TEXT,
    responsables TEXT,
    plazo_dias INTEGER,
    fecha_plazo DATE,
    estado VARCHAR(50) DEFAULT 'Vigente',
    restituido BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medidas_derechos (
    medida_id BIGINT REFERENCES medidas(id) ON DELETE CASCADE,
    derecho_id BIGINT REFERENCES catalogo_derechos(id),
    PRIMARY KEY (medida_id, derecho_id)
);

CREATE TABLE IF NOT EXISTS acciones (
    id BIGSERIAL PRIMARY KEY,
    medida_id BIGINT NOT NULL REFERENCES medidas(id) ON DELETE CASCADE,
    fecha DATE,
    accion TEXT NOT NULL,
    responsable VARCHAR(200),
    estado VARCHAR(50) DEFAULT 'Pendiente',
    requiere_recurso BOOLEAN DEFAULT FALSE,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ACTAS
CREATE TABLE IF NOT EXISTS actas (
    id BIGSERIAL PRIMARY KEY,
    ingreso_id BIGINT NOT NULL REFERENCES ingresos(id) ON DELETE CASCADE,
    fecha DATE,
    texto_acta TEXT,
    responsable_familia VARCHAR(200),
    responsable_servicio VARCHAR(200),
    compromisos TEXT,
    documento_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS actas_participantes (
    id BIGSERIAL PRIMARY KEY,
    acta_id BIGINT NOT NULL REFERENCES actas(id) ON DELETE CASCADE,
    nombre VARCHAR(100),
    apellido VARCHAR(100),
    dni BIGINT,
    firma BOOLEAN DEFAULT FALSE
);

-- SENAF
CREATE TABLE IF NOT EXISTS solicitudes_senaf (
    id BIGSERIAL PRIMARY KEY,
    ingreso_id BIGINT UNIQUE NOT NULL REFERENCES ingresos(id) ON DELETE CASCADE,
    fecha_solicitud DATE,
    causa TEXT,
    fundamentacion TEXT,
    estado VARCHAR(100) DEFAULT 'En elaboración',
    agoto_medidas BOOLEAN DEFAULT FALSE,
    riesgo_vida BOOLEAN DEFAULT FALSE,
    documento_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS solicitudes_seguimiento (
    id BIGSERIAL PRIMARY KEY,
    solicitud_id BIGINT NOT NULL REFERENCES solicitudes_senaf(id) ON DELETE CASCADE,
    fecha DATE,
    estado VARCHAR(100),
    observacion TEXT,
    responsable_id UUID REFERENCES usuarios(id)
);

-- DERECHOS VULNERADOS
CREATE TABLE IF NOT EXISTS derechos_vulnerados (
    id BIGSERIAL PRIMARY KEY,
    ingreso_id BIGINT NOT NULL REFERENCES ingresos(id) ON DELETE CASCADE,
    derecho_id BIGINT NOT NULL REFERENCES catalogo_derechos(id),
    fecha DATE,
    es_principal BOOLEAN DEFAULT FALSE,
    indicador TEXT,
    observaciones TEXT,
    UNIQUE(ingreso_id, derecho_id)
);

-- DOCUMENTOS
CREATE TABLE IF NOT EXISTS documentos (
    id BIGSERIAL PRIMARY KEY,
    ingreso_id BIGINT NOT NULL REFERENCES ingresos(id) ON DELETE CASCADE,
    tipo VARCHAR(100),
    nombre TEXT,
    url TEXT,
    drive_id VARCHAR(100),
    orden SMALLINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTIFICACIONES
CREATE TABLE IF NOT EXISTS notificaciones (
    id BIGSERIAL PRIMARY KEY,
    expediente_id BIGINT REFERENCES expedientes(id),
    titulo TEXT,
    descripcion TEXT,
    tipo VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notificaciones_usuarios (
    notificacion_id BIGINT REFERENCES notificaciones(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id),
    leida BOOLEAN DEFAULT FALSE,
    fecha_lectura TIMESTAMPTZ,
    PRIMARY KEY (notificacion_id, usuario_id)
);

-- AUDITORIA
CREATE TABLE IF NOT EXISTS auditoria (
    id BIGSERIAL PRIMARY KEY,
    tabla VARCHAR(50),
    registro_id BIGINT,
    accion VARCHAR(20),
    usuario_id UUID REFERENCES usuarios(id),
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TRIGGERS
CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_expedientes_updated_at BEFORE UPDATE ON expedientes FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();
CREATE TRIGGER trg_ingresos_updated_at BEFORE UPDATE ON ingresos FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();
CREATE TRIGGER trg_ninos_updated_at BEFORE UPDATE ON ninos FOR EACH ROW EXECUTE FUNCTION actualizar_updated_at();

-- DATOS INICIALES
INSERT INTO estados (nombre, tipo) VALUES
    ('Activo', 'expediente'),
    ('Cerrado', 'expediente'),
    ('Activo', 'ingreso'),
    ('Cerrado', 'ingreso'),
    ('Vigente', 'medida'),
    ('Cumplida', 'medida'),
    ('Cancelada', 'medida')
ON CONFLICT DO NOTHING;

INSERT INTO roles (nombre) VALUES
    ('Administrador'),
    ('Coordinador'),
    ('Profesional'),
    ('Consulta')
ON CONFLICT DO NOTHING;
