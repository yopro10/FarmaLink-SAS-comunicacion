-- =====================================================
-- FARMALINK - Migración v1.4.0
-- Extensión de la Tabla de Usuarios para Perfil
-- Fecha: 2026-03-29
-- Autor: Arquitecto de Base de Datos y Seguridad
-- NOTA: Este script es ADITIVO. No elimina ni modifica
--       columnas existentes. Es seguro aplicarlo sobre
--       una base de datos en producción.
-- =====================================================

-- ✅ Verificar que estamos en la base de datos correcta
-- \c farmalink;

BEGIN;

-- =====================================================
-- 1. NUEVOS CAMPOS DE PERFIL PERSONAL
-- =====================================================

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS phone        VARCHAR(20)  DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS address      TEXT         DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS bio          TEXT         DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS birth_date   DATE         DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS profile_picture TEXT      DEFAULT NULL;

-- =====================================================
-- 2. NUEVOS CAMPOS DE PREFERENCIAS Y SISTEMA
-- =====================================================

ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS preferences  JSONB        DEFAULT '{"theme": "light", "language": "es", "notifications": true}'::jsonb,
    ADD COLUMN IF NOT EXISTS last_login   TIMESTAMP    DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP;

-- =====================================================
-- 3. ÍNDICES PARA NUEVOS CAMPOS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_usuarios_updated_at ON usuarios(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_usuarios_last_login  ON usuarios(last_login  DESC);

-- =====================================================
-- 4. COMENTARIOS DE DOCUMENTACIÓN
-- =====================================================

COMMENT ON COLUMN usuarios.phone           IS 'Número de teléfono de contacto del usuario';
COMMENT ON COLUMN usuarios.address         IS 'Dirección de residencia del usuario';
COMMENT ON COLUMN usuarios.bio             IS 'Biografía breve o descripción del usuario';
COMMENT ON COLUMN usuarios.birth_date      IS 'Fecha de nacimiento del usuario';
COMMENT ON COLUMN usuarios.profile_picture IS 'URL de la foto de perfil del usuario';
COMMENT ON COLUMN usuarios.preferences     IS 'Preferencias del usuario en formato JSON (tema, idioma, notificaciones)';
COMMENT ON COLUMN usuarios.last_login      IS 'Fecha y hora del último acceso al sistema';
COMMENT ON COLUMN usuarios.updated_at      IS 'Fecha y hora de la última actualización del perfil';

-- =====================================================
-- 5. ACTUALIZAR USUARIO ADMIN INICIAL (OPCIONAL)
-- =====================================================

UPDATE usuarios
SET preferences = '{"theme": "dark", "language": "es", "notifications": true}'::jsonb,
    updated_at  = CURRENT_TIMESTAMP
WHERE email = 'admin@farmalink.com';

COMMIT;

-- =====================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- =====================================================

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'usuarios'
ORDER BY ordinal_position;

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Migración v1.4.0 aplicada exitosamente';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Columnas añadidas: phone, address, bio, birth_date,';
    RAISE NOTICE '  profile_picture, preferences, last_login, updated_at';
    RAISE NOTICE 'Índices creados: idx_usuarios_updated_at, idx_usuarios_last_login';
    RAISE NOTICE '============================================';
END $$;
