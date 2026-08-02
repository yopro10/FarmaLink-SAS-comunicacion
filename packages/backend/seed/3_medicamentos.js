use('farmalink');

print("=== Insertando Medicamentos ===");

db.medicamentos.deleteMany({});

const farmacias = db.farmacias.find().toArray();
if (farmacias.length === 0) {
  print("✗ ERROR: No hay farmacias en la base de datos. Ejecuta 2_farmacias.js primero");
  quit(1);
}

const getFarmaciaId = (index) => farmacias[index % farmacias.length]._id;

const medicamentos = [
  {
    name: "Acetaminofén 500mg",
    lab: "Bayer S.A.",
    active: true,
    description: "Analgésico y antipirético. Alivia el dolor y reduce la fiebre.",
    category: "Analgésicos",
    categoriaIndex: 1,
    createdAt: new Date("2024-01-01T08:00:00Z")
  },
  {
    name: "Acetaminofén 1000mg",
    lab: "Bayer S.A.",
    active: true,
    description: "Analgésico de alta dosis para dolores intensos.",
    category: "Analgésicos",
    categoriaIndex: 1,
    createdAt: new Date("2024-01-01T08:00:00Z")
  },
  {
    name: "Amoxicilina 500mg Cápsulas",
    lab: "Roche S.A.",
    active: true,
    description: "Antibiótico de amplio espectro del grupo de las penicilinas.",
    category: "Antibióticos",
    categoriaIndex: 2,
    createdAt: new Date("2024-01-02T09:00:00Z")
  },
  {
    name: "Amoxicilina 250mg Suspensión",
    lab: "Roche S.A.",
    active: true,
    description: "Antibiótico en suspensión oral para niños.",
    category: "Antibióticos",
    categoriaIndex: 2,
    createdAt: new Date("2024-01-02T09:00:00Z")
  },
  {
    name: "Ibuprofeno 400mg",
    lab: "Pfizer Colombia",
    active: true,
    description: "Antiinflamatorio no esteroideo (AINE) para dolor e inflamación.",
    category: "Antiinflamatorios",
    categoriaIndex: 3,
    createdAt: new Date("2024-01-03T10:00:00Z")
  },
  {
    name: "Ibuprofeno 600mg",
    lab: "Pfizer Colombia",
    active: true,
    description: "Antiinflamatorio para procesos inflamatorios moderados.",
    category: "Antiinflamatorios",
    categoriaIndex: 3,
    createdAt: new Date("2024-01-03T10:00:00Z")
  },
  {
    name: "Loratadina 10mg",
    lab: "Merck Colombia",
    active: true,
    description: "Antihistamínico de segunda generación para alergias.",
    category: "Antialérgicos",
    categoriaIndex: 4,
    createdAt: new Date("2024-01-04T11:00:00Z")
  },
  {
    name: "Loratadina 5mg/5ml Jarabe",
    lab: "Merck Colombia",
    active: true,
    description: "Antihistamónico infantil en jarabe.",
    category: "Antialérgicos",
    categoriaIndex: 4,
    createdAt: new Date("2024-01-04T11:00:00Z")
  },
  {
    name: "Omeprazol 20mg",
    lab: "AstraZeneca",
    active: true,
    description: "Inhibidor de la bomba de protones para acidez y reflujo.",
    category: "Gastrointestinales",
    categoriaIndex: 5,
    createdAt: new Date("2024-01-05T08:30:00Z")
  },
  {
    name: "Omeprazol 40mg",
    lab: "AstraZeneca",
    active: true,
    description: "Inhibidor de bomba de protones de alta dosis.",
    category: "Gastrointestinales",
    categoriaIndex: 5,
    createdAt: new Date("2024-01-05T08:30:00Z")
  },
  {
    name: "Metformina 500mg",
    lab: "Novartis",
    active: true,
    description: "Antidiabético oral para diabetes tipo 2.",
    category: "Antidiabéticos",
    categoriaIndex: 6,
    createdAt: new Date("2024-01-06T09:00:00Z")
  },
  {
    name: "Metformina 850mg",
    lab: "Novartis",
    active: true,
    description: "Antidiabético de mayor concentración.",
    category: "Antidiabéticos",
    categoriaIndex: 6,
    createdAt: new Date("2024-01-06T09:00:00Z")
  },
  {
    name: "Losartán 50mg",
    lab: "Boehringer Ingelheim",
    active: true,
    description: "Antihipertensivo bloqueador de receptores de angiotensina II.",
    category: "Cardiovasculares",
    categoriaIndex: 7,
    createdAt: new Date("2024-01-07T10:30:00Z")
  },
  {
    name: "Losartán 100mg",
    lab: "Boehringer Ingelheim",
    active: true,
    description: "Antihipertensivo de alta dosis.",
    category: "Cardiovasculares",
    categoriaIndex: 7,
    createdAt: new Date("2024-01-07T10:30:00Z")
  },
  {
    name: "Atorvastatina 20mg",
    lab: "Pfizer Colombia",
    active: true,
    description: "Estatina para control del colesterol.",
    category: "Cardiovasculares",
    categoriaIndex: 7,
    createdAt: new Date("2024-01-08T08:00:00Z")
  },
  {
    name: "Atorvastatina 40mg",
    lab: "Pfizer Colombia",
    active: true,
    description: "Estatina de alta potencia.",
    category: "Cardiovasculares",
    categoriaIndex: 7,
    createdAt: new Date("2024-01-08T08:00:00Z")
  },
  {
    name: "Salbutamol 100mcg Inhalador",
    lab: "GlaxoSmithKline",
    active: true,
    description: "Broncodilatador para asm y EPOC.",
    category: "Respiratorios",
    categoriaIndex: 8,
    createdAt: new Date("2024-01-09T09:00:00Z")
  },
  {
    name: "Salbutamol 2mg/5ml Jarabe",
    lab: "GlaxoSmithKline",
    active: true,
    description: "Broncodilatador en jarabe.",
    category: "Respiratorios",
    categoriaIndex: 8,
    createdAt: new Date("2024-01-09T09:00:00Z")
  },
  {
    name: "Prednisona 5mg",
    lab: "Bayer S.A.",
    active: true,
    description: "Corticosteroide sistémico.",
    category: "Corticosteroides",
    categoriaIndex: 9,
    createdAt: new Date("2024-01-10T10:00:00Z")
  },
  {
    name: "Prednisona 50mg",
    lab: "Bayer S.A.",
    active: true,
    description: "Corticosteroide de alta dosis.",
    category: "Corticosteroides",
    categoriaIndex: 9,
    createdAt: new Date("2024-01-10T10:00:00Z")
  },
  {
    name: "Diazepam 5mg",
    lab: "Roche S.A.",
    active: true,
    description: "Benzodiazepina para ansiedad y convulsiones.",
    category: "Psicofármacos",
    categoriaIndex: 10,
    createdAt: new Date("2024-01-11T08:30:00Z")
  },
  {
    name: "Diazepam 10mg",
    lab: "Roche S.A.",
    active: true,
    description: "Benzodiazepina de alta dosis.",
    category: "Psicofármacos",
    categoriaIndex: 10,
    createdAt: new Date("2024-01-11T08:30:00Z")
  },
  {
    name: "Ciprofloxacino 500mg",
    lab: "Bayer S.A.",
    active: true,
    description: "Antibiótico fluoroquinolona de amplio espectro.",
    category: "Antibióticos",
    categoriaIndex: 2,
    createdAt: new Date("2024-01-12T09:30:00Z")
  },
  {
    name: "Azitromicina 500mg",
    lab: "Pfizer Colombia",
    active: true,
    description: "Antibiótico macrólido para infecciones respiratorias.",
    category: "Antibióticos",
    categoriaIndex: 2,
    createdAt: new Date("2024-01-13T10:00:00Z")
  },
  {
    name: "Naproxeno 500mg",
    lab: "AstraZeneca",
    active: true,
    description: "Antiinflamatorio no esteroideo.",
    category: "Antiinflamatorios",
    categoriaIndex: 3,
    createdAt: new Date("2024-01-14T11:00:00Z")
  },
  {
    name: "Ranitidina 150mg",
    lab: "Boehringer Ingelheim",
    active: true,
    description: "Antagonista H2 para acidez.",
    category: "Gastrointestinales",
    categoriaIndex: 5,
    createdAt: new Date("2024-01-15T08:00:00Z")
  },
  {
    name: "Enalapril 10mg",
    lab: "Novartis",
    active: true,
    description: "Inhibidor de ECA para hipertensión.",
    category: "Cardiovasculares",
    categoriaIndex: 7,
    createdAt: new Date("2024-01-16T09:00:00Z")
  },
  {
    name: "Enalapril 20mg",
    lab: "Novartis",
    active: true,
    description: "Inhibidor de ECA de alta dosis.",
    category: "Cardiovasculares",
    categoriaIndex: 7,
    createdAt: new Date("2024-01-16T09:00:00Z")
  },
  {
    name: "Cetirizina 10mg",
    lab: "Merck Colombia",
    active: true,
    description: "Antihistamínico de tercera generación.",
    category: "Antialérgicos",
    categoriaIndex: 4,
    createdAt: new Date("2024-01-17T10:00:00Z")
  },
  {
    name: "Vitamina C 1000mg",
    lab: "Bayer S.A.",
    active: true,
    description: "Suplemento vitamínico.",
    category: "Suplementos",
    categoriaIndex: 11,
    createdAt: new Date("2024-01-18T11:00:00Z")
  }
];

const medicamentosToInsert = medicamentos.map(med => {
  const { categoriaIndex, ...rest } = med;
  return {
    ...rest,
    farmaciaId: getFarmaciaId(categoriaIndex - 1)
  };
});

db.medicamentos.insertMany(medicamentosToInsert);

print(`✓ Insertados ${medicamentosToInsert.length} medicamentos`);
print("\nLista de medicamentos por categoría:");
const categories = db.medicamentos.aggregate([
  { $group: { _id: "$category", count: { $sum: 1 } } },
  { $sort: { _id: 1 } }
]).toArray();

categories.forEach(cat => {
  print(`  - ${cat._id}: ${cat.count} medicamentos`);
});

print("\nMedicamentos insertados (primeros 10):");
db.medicamentos.find({}, { _id: 1, name: 1, lab: 1, category: 1 }).limit(10).forEach(doc => {
  print(`  - ${doc.name} (${doc.lab}) - ${doc.category}`);
});
