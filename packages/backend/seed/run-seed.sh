#!/bin/bash

# Obtener la ruta absoluta de la carpeta donde está este script
SCRIPT_DIR=$(dirname "$(readlink -f "$0")")

echo "========================================"
echo "  FARALINK - SEED DE DATOS"
echo "========================================"
echo ""

# Si estás dentro de Docker, localhost puede fallar, usa 127.0.0.1
MONGODB_URI=${MONGODB_URI:-"mongodb://127.0.0.1:27017/farmalink"}

echo "Conectando a: $MONGODB_URI"
echo "Carpeta de archivos JS: $SCRIPT_DIR"
echo ""

echo "Paso 1/4: Insertando Usuarios..."
mongosh "$MONGODB_URI" --file "$SCRIPT_DIR/1_users.js"

echo ""
echo "Paso 2/4: Insertando Farmacias..."
mongosh "$MONGODB_URI" --file "$SCRIPT_DIR/2_farmacias.js"

echo ""
echo "Paso 3/4: Insertando Medicamentos..."
mongosh "$MONGODB_URI" --file "$SCRIPT_DIR/3_medicamentos.js"

echo ""
echo "Paso 4/4: Insertando Precios..."
mongosh "$MONGODB_URI" --file "$SCRIPT_DIR/4_precios.js"

echo ""
echo "========================================"
echo "  SEED COMPLETADO"
echo "========================================"
echo ""
echo "Resumen de datos:"
mongosh "$MONGODB_URI" --quiet --eval '
  print("  Usuarios: " + db.users.countDocuments());
  print("  Farmacias: " + db.farmacias.countDocuments());
  print("  Medicamentos: " + db.medicamentos.countDocuments());
  print("  Precios: " + db.precios.countDocuments());
'