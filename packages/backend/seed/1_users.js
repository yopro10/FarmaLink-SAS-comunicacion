use('farmalink');

print("=== Insertando Users ===");

db.users.deleteMany({});

const users = [
  {
    name: "Juan Carlos Pérez García",
    email: "juan.perez@email.com",
    password: "$2a$10$xQZ8h9K3pL2mV1nW5xY0zO4jK8X5Y6Z7A8B9C0D1E2F3G4H5I6J7K8L", // password: usuario123
    role: "cliente",
    createdAt: new Date("2024-01-15T10:30:00Z")
  },
  {
    name: "María López Hernández",
    email: "maria.lopez@email.com",
    password: "$2a$10$xQZ8h9K3pL2mV1nW5xY0zO4jK8X5Y6Z7A8B9C0D1E2F3G4H5I6J7K8L",
    role: "cliente",
    createdAt: new Date("2024-02-20T14:45:00Z")
  },
  {
    name: "Carlos Rodríguez Soto",
    email: "carlos.rodriguez@farmalink.com",
    password: "$2a$10$xQZ8h9K3pL2mV1nW5xY0zO4jK8X5Y6Z7A8B9C0D1E2F3G4H5I6J7K8L",
    role: "farmaceutico",
    createdAt: new Date("2024-01-05T08:00:00Z")
  },
  {
    name: "Ana Martínez Torres",
    email: "ana.martinez@farmalink.com",
    password: "$2a$10$xQZ8h9K3pL2mV1nW5xY0zO4jK8X5Y6Z7A8B9C0D1E2F3G4H5I6J7K8L",
    role: "farmaceutico",
    createdAt: new Date("2024-01-10T09:15:00Z")
  },
  {
    name: "Luis Fernando Gómez",
    email: "admin@farmalink.com",
    password: "$2a$10$xQZ8h9K3pL2mV1nW5xY0zO4jK8X5Y6Z7A8B9C0D1E2F3G4H5I6J7K8L",
    role: "admin",
    createdAt: new Date("2023-12-01T00:00:00Z")
  },
  {
    name: "Laura Ramírez Castro",
    email: "laura.ramirez@email.com",
    password: "$2a$10$xQZ8h9K3pL2mV1nW5xY0zO4jK8X5Y6Z7A8B9C0D1E2F3G4H5I6J7K8L",
    role: "cliente",
    createdAt: new Date("2024-03-01T16:20:00Z")
  },
  {
    name: "Pedro Sánchez Molina",
    email: "pedro.sanchez@farmalink.com",
    password: "$2a$10$xQZ8h9K3pL2mV1nW5xY0zO4jK8X5Y6Z7A8B9C0D1E2F3G4H5I6J7K8L",
    role: "farmaceutico",
    createdAt: new Date("2024-02-15T11:30:00Z")
  }
];

db.users.insertMany(users);

print(`✓ Insertados ${users.length} usuarios`);
print("\nLista de usuarios insertados:");
db.users.find({}, { _id: 1, name: 1, email: 1, role: 1 }).forEach(doc => {
  print(`  - ${doc.name} | ${doc.email} | ${doc.role}`);
});
