-- ============================================================
-- MIGRACIÓN PUNTO 4: Nuevas columnas para la tabla usuarios
-- Ejecutar una sola vez sobre la BD existente.
-- ============================================================

-- Columna: teléfono de contacto (opcional)
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS telefono VARCHAR(20) DEFAULT NULL;

-- Columna: URL de foto de perfil (opcional)
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500) DEFAULT NULL;

-- Columna: preferencias del usuario en JSON
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS preferencias JSONB DEFAULT '{}'::jsonb;

-- Columna: última sesión registrada
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS ultimo_login TIMESTAMP DEFAULT NULL;

-- Usuario demo que usa el botón "Demo Usuario" del frontend
INSERT INTO usuarios (name, email, password, role, created_at)
SELECT 'Usuario Demo', 'user@farmalink.com',
       '$2a$10$xQZ8h9K3pL2mV1nW5xY0zO4jK8X5Y6Z7A8B9C0D1E2F3G4H5I6J7K8L',
       'cliente', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM usuarios WHERE email = 'user@farmalink.com'
);

-- Índice para búsquedas por teléfono
CREATE INDEX IF NOT EXISTS idx_usuarios_telefono ON usuarios(telefono)
  WHERE telefono IS NOT NULL;

-- Verificación
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'usuarios'
ORDER BY ordinal_position;
