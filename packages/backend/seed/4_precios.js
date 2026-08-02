use('farmalink');

print("=== Insertando Precios ===");

db.precios.deleteMany({});

const medicamentos = db.medicamentos.find().toArray();
const farmacias = db.farmacias.find().toArray();

if (medicamentos.length === 0) {
  print("✗ ERROR: No hay medicamentos. Ejecuta 3_medicamentos.js primero");
  quit(1);
}
if (farmacias.length === 0) {
  print("✗ ERROR: No hay farmacias. Ejecuta 2_farmacias.js primero");
  quit(1);
}

const precios = [];

medicamentos.forEach((medicamento, medIndex) => {
  const numFarmacias = 2 + Math.floor(Math.random() * 4);
  
  for (let i = 0; i < numFarmacias; i++) {
    const farmIndex = (medIndex + i) % farmacias.length;
    const farmacia = farmacias[farmIndex];
    
    let precioBase;
    const nameLower = medicamento.name.toLowerCase();
    
    if (nameLower.includes("acetaminofén") || nameLower.includes("acetaminofen")) {
      precioBase = 800 + Math.floor(Math.random() * 2000);
    } else if (nameLower.includes("amoxicilina")) {
      precioBase = 3500 + Math.floor(Math.random() * 8000);
    } else if (nameLower.includes("ibuprofeno")) {
      precioBase = 1500 + Math.floor(Math.random() * 3000);
    } else if (nameLower.includes("loratadina")) {
      precioBase = 2500 + Math.floor(Math.random() * 4000);
    } else if (nameLower.includes("omeprazol")) {
      precioBase = 2000 + Math.floor(Math.random() * 5000);
    } else if (nameLower.includes("metformina")) {
      precioBase = 1500 + Math.floor(Math.random() * 3500);
    } else if (nameLower.includes("losartán") || nameLower.includes("losartan")) {
      precioBase = 3000 + Math.floor(Math.random() * 5000);
    } else if (nameLower.includes("atorvastatina")) {
      precioBase = 4000 + Math.floor(Math.random() * 8000);
    } else if (nameLower.includes("salbutamol")) {
      precioBase = 8000 + Math.floor(Math.random() * 12000);
    } else if (nameLower.includes("prednisona")) {
      precioBase = 1000 + Math.floor(Math.random() * 2500);
    } else if (nameLower.includes("diazepam")) {
      precioBase = 1500 + Math.floor(Math.random() * 3000);
    } else if (nameLower.includes("ciprofloxacino")) {
      precioBase = 4500 + Math.floor(Math.random() * 6000);
    } else if (nameLower.includes("azitromicina")) {
      precioBase = 5000 + Math.floor(Math.random() * 7000);
    } else if (nameLower.includes("naproxeno")) {
      precioBase = 2000 + Math.floor(Math.random() * 4000);
    } else if (nameLower.includes("ranitidina")) {
      precioBase = 1800 + Math.floor(Math.random() * 3000);
    } else if (nameLower.includes("enalapril")) {
      precioBase = 2500 + Math.floor(Math.random() * 4000);
    } else if (nameLower.includes("cetirizina")) {
      precioBase = 3000 + Math.floor(Math.random() * 4500);
    } else if (nameLower.includes("vitamina")) {
      precioBase = 1500 + Math.floor(Math.random() * 2500);
    } else {
      precioBase = 2000 + Math.floor(Math.random() * 5000);
    }
    
    const diasAtras = Math.floor(Math.random() * 30);
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - diasAtras);
    
    precios.push({
      precio: precioBase,
      medicamentoId: medicamento._id,
      farmaciaId: farmacia._id,
      fecha: fecha
    });
  }
});

db.precios.insertMany(precios);

print(`✓ Insertados ${precios.length} precios`);

print("\nEstadísticas de precios por categoría de medicamento:");
const stats = db.precios.aggregate([
  {
    $lookup: {
      from: "medicamentos",
      localField: "medicamentoId",
      foreignField: "_id",
      as: "medicamento"
    }
  },
  { $unwind: "$medicamento" },
  {
    $group: {
      _id: "$medicamento.category",
      count: { $sum: 1 },
      precioMin: { $min: "$precio" },
      precioMax: { $max: "$precio" },
      precioPromedio: { $avg: "$precio" }
    }
  },
  { $sort: { _id: 1 } }
]).toArray();

stats.forEach(stat => {
  print(`  - ${stat._id}:`);
  print(`    Registros: ${stat.count}`);
  print(`    Precio mínimo: $${stat.precioMin.toLocaleString('es-CO')}`);
  print(`    Precio máximo: $${stat.precioMax.toLocaleString('es-CO')}`);
  print(`    Precio promedio: $${Math.round(stat.precioPromedio).toLocaleString('es-CO')}`);
});

print("\nPrecios por farmacia:");
const farmStats = db.precios.aggregate([
  {
    $lookup: {
      from: "farmacias",
      localField: "farmaciaId",
      foreignField: "_id",
      as: "farmacia"
    }
  },
  { $unwind: "$farmacia" },
  {
    $group: {
      _id: "$farmacia.name",
      count: { $sum: 1 },
      precioPromedio: { $avg: "$precio" }
    }
  },
  { $sort: { _id: 1 } }
]).toArray();

farmStats.forEach(stat => {
  print(`  - ${stat._id}: ${stat.count} precios (promedio: $${Math.round(stat.precioPromedio).toLocaleString('es-CO')})`);
});

print("\n=== Seed completado exitosamente ===");
