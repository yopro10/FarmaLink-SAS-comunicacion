use('farmalink');

print("=== Insertando Farmacias ===");

db.farmacias.deleteMany({});

const farmacias = [
  {
    name: "Farmacia Central Bogotá",
    address: "Carrera 7 # 71-21, Chapinero, Bogotá",
    phone: "6017456789",
    latitude: 4.6450,
    longitude: -74.0503,
    location: {
      type: "Point",
      coordinates: [-74.0503, 4.6450]
    },
    createdAt: new Date("2024-01-01T08:00:00Z")
  },
  {
    name: "Farmacia Norte",
    address: "Carrera 45 # 124-30, Usaquén, Bogotá",
    phone: "6016253456",
    latitude: 4.7200,
    longitude: -74.0290,
    location: {
      type: "Point",
      coordinates: [-74.0290, 4.7200]
    },
    createdAt: new Date("2024-01-05T08:30:00Z")
  },
  {
    name: "Farmacia del Sur",
    address: "Calle 38 Sur # 28-45, Ciudad Bolívar, Bogotá",
    phone: "6017751234",
    latitude: 4.3200,
    longitude: -74.1500,
    location: {
      type: "Point",
      coordinates: [-74.1500, 4.3200]
    },
    createdAt: new Date("2024-01-10T09:00:00Z")
  },
  {
    name: "Farmacia Premium Torre 80",
    address: "Carrera 80 # 80-10, Engativá, Bogotá",
    phone: "6014457890",
    latitude: 4.6800,
    longitude: -74.1000,
    location: {
      type: "Point",
      coordinates: [-74.1000, 4.6800]
    },
    createdAt: new Date("2024-01-15T08:15:00Z")
  },
  {
    name: "Farmacia La 70",
    address: "Calle 70 # 52-30, Barrios Unidos, Bogotá",
    phone: "6012556789",
    latitude: 4.6550,
    longitude: -74.0750,
    location: {
      type: "Point",
      coordinates: [-74.0750, 4.6550]
    },
    createdAt: new Date("2024-02-01T10:00:00Z")
  },
  {
    name: "Farmacia Zona Franca",
    address: "Autopista Norte # 232-45, Toberín, Bogotá",
    phone: "6016951234",
    latitude: 4.7500,
    longitude: -74.0450,
    location: {
      type: "Point",
      coordinates: [-74.0450, 4.7500]
    },
    createdAt: new Date("2024-02-10T09:30:00Z")
  },
  {
    name: "Farmacia San Rafael",
    address: "Carrera 30 # 45-12, San Cristóbal, Bogotá",
    phone: "6013852345",
    latitude: 4.5800,
    longitude: -74.0900,
    location: {
      type: "Point",
      coordinates: [-74.0900, 4.5800]
    },
    createdAt: new Date("2024-02-15T11:00:00Z")
  },
  {
    name: "Farmacia Plaza Imperial",
    address: "Avenida Suba # 123-50, Suba, Bogotá",
    phone: "6015258901",
    latitude: 4.7100,
    longitude: -74.0700,
    location: {
      type: "Point",
      coordinates: [-74.0700, 4.7100]
    },
    createdAt: new Date("2024-03-01T08:45:00Z")
  }
];

db.farmacias.insertMany(farmacias);

print(`✓ Insertadas ${farmacias.length} farmacias`);
print("\nLista de farmacias insertadas:");
db.farmacias.find({}, { _id: 1, name: 1, address: 1, phone: 1, latitude: 1, longitude: 1 }).forEach(doc => {
  print(`  - ${doc.name}`);
  print(`    Dirección: ${doc.address}`);
  print(`    Teléfono: ${doc.phone}`);
  print(`    Coordenadas: ${doc.latitude}, ${doc.longitude}`);
});
