-- =====================================================
-- FARMALINK - Script para Neon PostgreSQL
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CREACIÓN DE SECUENCIAS (Auto-increment)
-- =====================================================

CREATE SEQUENCE IF NOT EXISTS usuarios_id_seq;
CREATE SEQUENCE IF NOT EXISTS farmacias_id_seq;
CREATE SEQUENCE IF NOT EXISTS categorias_id_seq;
CREATE SEQUENCE IF NOT EXISTS medicamentos_id_seq;
CREATE SEQUENCE IF NOT EXISTS precios_id_seq;
CREATE SEQUENCE IF NOT EXISTS historial_precios_id_seq;

-- =====================================================
-- 2. CREACIÓN DE TABLAS
-- =====================================================

-- Tabla de Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id BIGINT DEFAULT nextval('usuarios_id_seq') PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('cliente', 'farmaceutico', 'admin')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Categorías (Normalización)
CREATE TABLE IF NOT EXISTS categorias (
    id BIGINT DEFAULT nextval('categorias_id_seq') PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    orden INTEGER NOT NULL
);

-- Tabla de Farmacias
CREATE TABLE IF NOT EXISTS farmacias (
    id BIGINT DEFAULT nextval('farmacias_id_seq') PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Medicamentos
CREATE TABLE IF NOT EXISTS medicamentos (
    id BIGINT DEFAULT nextval('medicamentos_id_seq') PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    lab VARCHAR(255) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    categoria_id BIGINT REFERENCES categorias(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Precios
CREATE TABLE IF NOT EXISTS precios (
    id BIGINT DEFAULT nextval('precios_id_seq') PRIMARY KEY,
    precio INTEGER NOT NULL,
    medicamento_id BIGINT NOT NULL REFERENCES medicamentos(id),
    farmacia_id BIGINT NOT NULL REFERENCES farmacias(id),
    fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Historial de Precios
CREATE TABLE IF NOT EXISTS historial_precios (
    id BIGINT DEFAULT nextval('historial_precios_id_seq') PRIMARY KEY,
    precio_id BIGINT NOT NULL REFERENCES precios(id) ON DELETE CASCADE,
    medicamento_id BIGINT NOT NULL REFERENCES medicamentos(id),
    farmacia_id BIGINT NOT NULL REFERENCES farmacias(id),
    precio_anterior INTEGER NOT NULL,
    precio_nuevo INTEGER NOT NULL,
    quien_cambio VARCHAR(255),
    fecha_cambio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 3. CREACIÓN DE ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_farmacias_lat_lng ON farmacias(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_precios_medicamento ON precios(medicamento_id);
CREATE INDEX IF NOT EXISTS idx_precios_farmacia ON precios(farmacia_id);
CREATE INDEX IF NOT EXISTS idx_precios_fecha ON precios(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_medicamentos_categoria ON medicamentos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_medicamentos_nombre ON medicamentos(name);
CREATE INDEX IF NOT EXISTS idx_medicamentos_lab ON medicamentos(lab);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_role ON usuarios(role);
CREATE INDEX IF NOT EXISTS idx_historial_medicamento ON historial_precios(medicamento_id);
CREATE INDEX IF NOT EXISTS idx_historial_farmacia ON historial_precios(farmacia_id);
CREATE INDEX IF NOT EXISTS idx_historial_fecha ON historial_precios(fecha_cambio DESC);
CREATE INDEX IF NOT EXISTS idx_historial_precio_id ON historial_precios(precio_id);

-- =====================================================
-- 4. INSERCIÓN DE DATOS (solo si las tablas están vacías)
-- =====================================================

-- Categorías
INSERT INTO categorias (nombre, orden) VALUES
    ('Analgésicos', 1),
    ('Antibióticos', 2),
    ('Antiinflamatorios', 3),
    ('Antialérgicos', 4),
    ('Gastrointestinales', 5),
    ('Antidiabéticos', 6),
    ('Cardiovasculares', 7),
    ('Respiratorios', 8),
    ('Corticosteroides', 9),
    ('Psicofármacos', 10),
    ('Suplementos', 11)
ON CONFLICT (nombre) DO NOTHING;

-- Usuarios (contraseña: 1234 hasheada con bcrypt)
INSERT INTO usuarios (id, name, email, password, role, created_at) VALUES
    (1, 'Juan Carlos Pérez García', 'juan.perez@email.com', '$2b$10$LnEmVr97p4RcblB.67FykewNBMooQfvEBDdwX57JdHQKWpU9bhvli', 'cliente', '2024-01-15 10:30:00'),
    (2, 'María López Hernández', 'maria.lopez@email.com', '$2b$10$LnEmVr97p4RcblB.67FykewNBMooQfvEBDdwX57JdHQKWpU9bhvli', 'cliente', '2024-02-20 14:45:00'),
    (3, 'Carlos Rodríguez Soto', 'carlos.rodriguez@farmalink.com', '$2b$10$LnEmVr97p4RcblB.67FykewNBMooQfvEBDdwX57JdHQKWpU9bhvli', 'farmaceutico', '2024-01-05 08:00:00'),
    (4, 'Ana Martínez Torres', 'ana.martinez@farmalink.com', '$2b$10$LnEmVr97p4RcblB.67FykewNBMooQfvEBDdwX57JdHQKWpU9bhvli', 'farmaceutico', '2024-01-10 09:15:00'),
    (5, 'Luis Fernando Gómez', 'admin@farmalink.com', '$2b$10$LnEmVr97p4RcblB.67FykewNBMooQfvEBDdwX57JdHQKWpU9bhvli', 'admin', '2023-12-01 00:00:00'),
    (6, 'Laura Ramírez Castro', 'laura.ramirez@email.com', '$2b$10$LnEmVr97p4RcblB.67FykewNBMooQfvEBDdwX57JdHQKWpU9bhvli', 'cliente', '2024-03-01 16:20:00'),
    (7, 'Pedro Sánchez Molina', 'pedro.sanchez@farmalink.com', '$2b$10$LnEmVr97p4RcblB.67FykewNBMooQfvEBDdwX57JdHQKWpU9bhvli', 'farmaceutico', '2024-02-15 11:30:00'),
    (8, 'Usuario Demo', 'user@farmalink.com', '$2b$10$LnEmVr97p4RcblB.67FykewNBMooQfvEBDdwX57JdHQKWpU9bhvli', 'cliente', '2024-01-01 00:00:00')
ON CONFLICT (email) DO NOTHING;

-- Farmacias
INSERT INTO farmacias (id, name, address, phone, latitude, longitude, created_at) VALUES
    (1, 'Farmacia Central Bogotá', 'Carrera 7 # 71-21, Chapinero, Bogotá', '6017456789', 4.6450, -74.0503, '2024-01-01 08:00:00'),
    (2, 'Farmacia Norte', 'Carrera 45 # 124-30, Usaquén, Bogotá', '6016253456', 4.7200, -74.0290, '2024-01-05 08:30:00'),
    (3, 'Farmacia del Sur', 'Calle 38 Sur # 28-45, Ciudad Bolívar, Bogotá', '6017751234', 4.3200, -74.1500, '2024-01-10 09:00:00'),
    (4, 'Farmacia Premium Torre 80', 'Carrera 80 # 80-10, Engativá, Bogotá', '6014457890', 4.6800, -74.1000, '2024-01-15 08:15:00'),
    (5, 'Farmacia La 70', 'Calle 70 # 52-30, Barrios Unidos, Bogotá', '6012556789', 4.6550, -74.0750, '2024-02-01 10:00:00'),
    (6, 'Farmacia Zona Franca', 'Autopista Norte # 232-45, Toberín, Bogotá', '6016951234', 4.7500, -74.0450, '2024-02-10 09:30:00'),
    (7, 'Farmacia San Rafael', 'Carrera 30 # 45-12, San Cristóbal, Bogotá', '6013852345', 4.5800, -74.0900, '2024-02-15 11:00:00'),
    (8, 'Farmacia Plaza Imperial', 'Avenida Suba # 123-50, Suba, Bogotá', '6015258901', 4.7100, -74.0700, '2024-03-01 08:45:00')
ON CONFLICT (id) DO NOTHING;

-- Medicamentos
INSERT INTO medicamentos (id, name, lab, active, description, categoria_id, created_at) VALUES
    (1, 'Acetaminofén 500mg', 'Bayer S.A.', true, 'Analgésico y antipirético. Alivia el dolor y reduce la fiebre.', 1, '2024-01-01 08:00:00'),
    (2, 'Acetaminofén 1000mg', 'Bayer S.A.', true, 'Analgésico de alta dosis para dolores intensos.', 1, '2024-01-01 08:00:00'),
    (3, 'Amoxicilina 500mg Cápsulas', 'Roche S.A.', true, 'Antibiótico de amplio espectro del grupo de las penicilinas.', 2, '2024-01-02 09:00:00'),
    (4, 'Amoxicilina 250mg Suspensión', 'Roche S.A.', true, 'Antibiótico en suspensión oral para niños.', 2, '2024-01-02 09:00:00'),
    (5, 'Ibuprofeno 400mg', 'Pfizer Colombia', true, 'Antiinflamatorio no esteroideo (AINE) para dolor e inflamación.', 3, '2024-01-03 10:00:00'),
    (6, 'Ibuprofeno 600mg', 'Pfizer Colombia', true, 'Antiinflamatorio para procesos inflamatorios moderados.', 3, '2024-01-03 10:00:00'),
    (7, 'Loratadina 10mg', 'Merck Colombia', true, 'Antihistamínico de segunda generación para alergias.', 4, '2024-01-04 11:00:00'),
    (8, 'Loratadina 5mg/5ml Jarabe', 'Merck Colombia', true, 'Antihistamónico infantil en jarabe.', 4, '2024-01-04 11:00:00'),
    (9, 'Omeprazol 20mg', 'AstraZeneca', true, 'Inhibidor de la bomba de protones para acidez y reflujo.', 5, '2024-01-05 08:30:00'),
    (10, 'Omeprazol 40mg', 'AstraZeneca', true, 'Inhibidor de bomba de protones de alta dosis.', 5, '2024-01-05 08:30:00'),
    (11, 'Metformina 500mg', 'Novartis', true, 'Antidiabético oral para diabetes tipo 2.', 6, '2024-01-06 09:00:00'),
    (12, 'Metformina 850mg', 'Novartis', true, 'Antidiabético de mayor concentración.', 6, '2024-01-06 09:00:00'),
    (13, 'Losartán 50mg', 'Boehringer Ingelheim', true, 'Antihipertensivo bloqueador de receptores de angiotensina II.', 7, '2024-01-07 10:30:00'),
    (14, 'Losartán 100mg', 'Boehringer Ingelheim', true, 'Antihipertensivo de alta dosis.', 7, '2024-01-07 10:30:00'),
    (15, 'Atorvastatina 20mg', 'Pfizer Colombia', true, 'Estatina para control del colesterol.', 7, '2024-01-08 08:00:00'),
    (16, 'Atorvastatina 40mg', 'Pfizer Colombia', true, 'Estatina de alta potencia.', 7, '2024-01-08 08:00:00'),
    (17, 'Salbutamol 100mcg Inhalador', 'GlaxoSmithKline', true, 'Broncodilatador para asma y EPOC.', 8, '2024-01-09 09:00:00'),
    (18, 'Salbutamol 2mg/5ml Jarabe', 'GlaxoSmithKline', true, 'Broncodilatador en jarabe.', 8, '2024-01-09 09:00:00'),
    (19, 'Prednisona 5mg', 'Bayer S.A.', true, 'Corticosteroide sistémico.', 9, '2024-01-10 10:00:00'),
    (20, 'Prednisona 50mg', 'Bayer S.A.', true, 'Corticosteroide de alta dosis.', 9, '2024-01-10 10:00:00'),
    (21, 'Diazepam 5mg', 'Roche S.A.', true, 'Benzodiazepina para ansiedad y convulsiones.', 10, '2024-01-11 08:30:00'),
    (22, 'Diazepam 10mg', 'Roche S.A.', true, 'Benzodiazepina de alta dosis.', 10, '2024-01-11 08:30:00'),
    (23, 'Ciprofloxacino 500mg', 'Bayer S.A.', true, 'Antibiótico fluoroquinolona de amplio espectro.', 2, '2024-01-12 09:30:00'),
    (24, 'Azitromicina 500mg', 'Pfizer Colombia', true, 'Antibiótico macrólido para infecciones respiratorias.', 2, '2024-01-13 10:00:00'),
    (25, 'Naproxeno 500mg', 'AstraZeneca', true, 'Antiinflamatorio no esteroideo.', 3, '2024-01-14 11:00:00'),
    (26, 'Ranitidina 150mg', 'Boehringer Ingelheim', true, 'Antagonista H2 para acidez.', 5, '2024-01-15 08:00:00'),
    (27, 'Enalapril 10mg', 'Novartis', true, 'Inhibidor de ECA para hipertensión.', 7, '2024-01-16 09:00:00'),
    (28, 'Enalapril 20mg', 'Novartis', true, 'Inhibidor de ECA de alta dosis.', 7, '2024-01-16 09:00:00'),
    (29, 'Cetirizina 10mg', 'Merck Colombia', true, 'Antihistamínico de tercera generación.', 4, '2024-01-17 10:00:00'),
    (30, 'Vitamina C 1000mg', 'Bayer S.A.', true, 'Suplemento vitamínimo.', 11, '2024-01-18 11:00:00')
ON CONFLICT (id) DO NOTHING;

-- Precios
INSERT INTO precios (precio, medicamento_id, farmacia_id, fecha) VALUES
    (2100, 1, 1, '2024-01-20 10:00:00'),
    (1850, 1, 2, '2024-01-22 14:30:00'),
    (2350, 1, 3, '2024-01-25 09:15:00'),
    (1900, 1, 4, '2024-01-28 16:45:00'),
    (2800, 2, 1, '2024-01-21 11:00:00'),
    (2500, 2, 2, '2024-01-23 10:30:00'),
    (2650, 2, 3, '2024-01-26 13:20:00'),
    (2450, 2, 4, '2024-01-29 15:00:00'),
    (8500, 3, 2, '2024-01-20 10:00:00'),
    (9200, 3, 3, '2024-01-22 14:30:00'),
    (7800, 3, 4, '2024-01-25 09:15:00'),
    (8900, 3, 5, '2024-01-28 16:45:00'),
    (5500, 4, 2, '2024-01-21 11:00:00'),
    (4800, 4, 3, '2024-01-23 10:30:00'),
    (5200, 4, 4, '2024-01-26 13:20:00'),
    (5900, 4, 5, '2024-01-29 15:00:00'),
    (3200, 5, 3, '2024-01-20 10:00:00'),
    (3500, 5, 4, '2024-01-22 14:30:00'),
    (2800, 5, 5, '2024-01-25 09:15:00'),
    (3100, 5, 6, '2024-01-28 16:45:00'),
    (4200, 6, 3, '2024-01-21 11:00:00'),
    (4500, 6, 4, '2024-01-23 10:30:00'),
    (3800, 6, 5, '2024-01-26 13:20:00'),
    (4000, 6, 6, '2024-01-29 15:00:00'),
    (4800, 7, 4, '2024-01-20 10:00:00'),
    (5200, 7, 5, '2024-01-22 14:30:00'),
    (4500, 7, 6, '2024-01-25 09:15:00'),
    (5100, 7, 7, '2024-01-28 16:45:00'),
    (3500, 8, 4, '2024-01-21 11:00:00'),
    (3200, 8, 5, '2024-01-23 10:30:00'),
    (3800, 8, 6, '2024-01-26 13:20:00'),
    (3400, 8, 7, '2024-01-29 15:00:00'),
    (5500, 9, 5, '2024-01-20 10:00:00'),
    (6200, 9, 6, '2024-01-22 14:30:00'),
    (5800, 9, 7, '2024-01-25 09:15:00'),
    (6000, 9, 8, '2024-01-28 16:45:00'),
    (7200, 10, 5, '2024-01-21 11:00:00'),
    (7500, 10, 6, '2024-01-23 10:30:00'),
    (6800, 10, 7, '2024-01-26 13:20:00'),
    (7100, 10, 8, '2024-01-29 15:00:00'),
    (3800, 11, 1, '2024-01-20 10:00:00'),
    (4200, 11, 6, '2024-01-22 14:30:00'),
    (3500, 11, 7, '2024-01-25 09:15:00'),
    (4000, 11, 8, '2024-01-28 16:45:00'),
    (6500, 13, 1, '2024-01-20 10:00:00'),
    (7200, 13, 2, '2024-01-22 14:30:00'),
    (6800, 13, 3, '2024-01-25 09:15:00'),
    (7000, 13, 4, '2024-01-28 16:45:00'),
    (15500, 17, 2, '2024-01-20 10:00:00'),
    (16200, 17, 3, '2024-01-22 14:30:00'),
    (14800, 17, 4, '2024-01-25 09:15:00'),
    (15800, 17, 5, '2024-01-28 16:45:00')
ON CONFLICT DO NOTHING;

COMMIT;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

SELECT 'usuarios' AS tabla, COUNT(*) AS total FROM usuarios
UNION ALL
SELECT 'categorias', COUNT(*) FROM categorias
UNION ALL
SELECT 'farmacias', COUNT(*) FROM farmacias
UNION ALL
SELECT 'medicamentos', COUNT(*) FROM medicamentos
UNION ALL
SELECT 'precios', COUNT(*) FROM precios;

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Base de datos FARMALINK inicializada exitosamente';
    RAISE NOTICE '============================================';
END $$;
