-- Contraseñas bcrypt para cuentas demo (ejecutar sobre BD existente).
-- admin@farmalink.com / admin123
-- user@farmalink.com / user123

UPDATE usuarios
SET password = '$2b$10$3UlGjvc65ntVzBO.uUR8PO4x9tfWTaDOZz57anDJBJ2YYdmSBJm1i'
WHERE email = 'admin@farmalink.com';

UPDATE usuarios
SET password = '$2b$10$cmcfcDm11nwIyez0B074A.kRACdt8TZMrCRqZBzphSx/HLOJcunSm'
WHERE email = 'user@farmalink.com';
