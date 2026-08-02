# Estructura Base de Datos MongoDB - Farmalink

## Colecciones

### 1. Users
```typescript
{
  name: string;           // Nombre completo
  email: string;          // Email único
  password: string;       // Contraseña hasheada
  role: 'cliente' | 'farmaceutico' | 'admin';
  createdAt: Date;
}
```

### 2. Farmacias
```typescript
{
  name: string;           // Nombre de la farmacia
  address: string;       // Dirección
  phone: string;         // Teléfono
  location: {
    type: 'Point';
    coordinates: [lng, lat];  // Para búsquedas geoespaciales
  };
  createdAt: Date;
}
```
**Índices:** 
- `2dsphere` en `location` para búsquedas por proximidad

### 3. Medicamentos
```typescript
{
  name: string;           // Nombre del medicamento
  lab: string;            // Laboratorio
  active: boolean;       // Si está activo/disponible
  description?: string;  // Descripción opcional
  category?: string;     // Categoría (analgesicos, antibioticos, etc.)
  farmaciaId: ObjectId;  // Referencia a Farmacia
  createdAt: Date;
}
```

### 4. Precios
```typescript
{
  precio: number;         // Precio del medicamento
  medicamentoId: ObjectId; // Referencia a Medicamento
  farmaciaId: ObjectId;    // Referencia a Farmacia
  fecha: Date;            // Fecha del precio
}
```
**Índices:**
- Compuesto en `(medicamentoId, farmaciaId)` para búsquedas rápidas

---

## Seed de Datos de Ejemplo

### Scripts disponibles en `backend/seed/`

| Script | Descripción |
|--------|-------------|
| `1_users.js` | 7 usuarios (clientes, farmacéuticos, admin) |
| `2_farmacias.js` | 8 farmacias en Bogotá con GeoJSON |
| `3_medicamentos.js` | 30 medicamentos en diversas categorías |
| `4_precios.js` | Precios variados por medicamento y farmacia |
| `run-seed.sh` | Script maestro que ejecuta todos en orden |

### Datos de ejemplo incluidos

**Usuarios (7):**
- 3 clientes
- 3 farmacéuticos  
- 1 admin

**Farmacias (8):** Ubicaciones en distintas zonas de Bogotá (Chapinero, Usaquén, Ciudad Bolívar, Engativá, etc.)

**Medicamentos (30):** Including:
- Analgésicos (Acetaminofén)
- Antibióticos (Amoxicilina, Ciprofloxacino, Azitromicina)
- Antiinflamatorios (Ibuprofeno, Naproxeno)
- Antialérgicos (Loratadina, Cetirizina)
- Gastrointestinales (Omeprazol, Ranitidina)
- Antidiabéticos (Metformina)
- Cardiovasculares (Losartán, Atorvastatina, Enalapril)
- Respiratorios (Salbutamol)
- Corticosteroides (Prednisona)
- Psicofármacos (Diazepam)
- Suplementos (Vitamina C)

**Precios:** Múltiples precios por medicamento en diferentes farmacias (aproximadamente 90+ registros)

### Ejecutar seed

```bash
# Iniciar MongoDB primero (si no está corriendo)
mongod --dbpath /ruta/a/datos

# Ejecutar seed
./backend/seed/run-seed.sh

# O ejecutar individualmente
mongosh mongodb://localhost:27017/farmalink --file backend/seed/1_users.js
mongosh mongodb://localhost:27017/farmalink --file backend/seed/2_farmacias.js
mongosh mongodb://localhost:27017/farmalink --file backend/seed/3_medicamentos.js
mongosh mongodb://localhost:27017/farmalink --file backend/seed/4_precios.js
```

### Requisitos

- MongoDB ejecutándose en `mongodb://localhost:27017`
- Base de datos `farmalink` creada (se crea automáticamente)

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/farmalink
NODE_ENV=development
```
