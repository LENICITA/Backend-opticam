import sequelize from "../config/database.js";
import bcrypt from "bcryptjs";
import { subirImagenLocal } from "../utils/uploadLocal.js";
import Role from "../models/Role.js";
import { Usuario, RolUsuario } from "../models/relaciones.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// CONFIGURACIÓN DEL ADMI
const adminData = {
  nombre_completo: process.env.ADMIN_NOMBRE || "Administrador Sistema",
  telefono: process.env.ADMIN_TELEFONO || "3113578562",
  fecha_nacimiento: process.env.ADMIN_FECHA_NACIMIENTO || "1990-01-01",
  documento: process.env.ADMIN_DOCUMENTO || 123456789,
  ciudad: process.env.ADMIN_CIUDAD || "Bogotá",
  direccion: process.env.ADMIN_DIRECCION || "Calle Principal #123",
  email: process.env.ADMIN_EMAIL || "admin@opticam.com",
  contrasena: process.env.ADMIN_CONTRASENA || "Admin123!",
  estado: "ACTIVO"
};
// 1. USUARIOS (SIN ROLES EN EL OBJETO
const usuariosData = [
  // CLIENTES CON PEDIDOS
  {
    nombre_completo: "María González",
    telefono: "3002345678",
    fecha_nacimiento: "1985-06-20",
    documento: 2345678901,
    ciudad: "Bogotá",
    direccion: "Carrera 45 #23-12",
    email: "maria@email.com",
    contrasena: "Maria123*",
    estado: "ACTIVO"
  },
  {
    nombre_completo: "Carlos Rodríguez",
    telefono: "3003456789",
    fecha_nacimiento: "1992-12-10",
    documento: 3456789012,
    ciudad: "Medellín",
    direccion: "Avenida 5 #12-34",
    email: "carlos@email.com",
    contrasena: "Carlos456*",
    estado: "ACTIVO"
  },
  {
    nombre_completo: "Laura Sánchez",
    telefono: "3006789012",
    fecha_nacimiento: "1991-07-14",
    documento: 6789012345,
    ciudad: "Cali",
    direccion: "Avenida 3 #78-90",
    email: "laura@email.com",
    contrasena: "Laura202*",
    estado: "ACTIVO"
  },
  {
    nombre_completo: "Juan Rojas",
    telefono: "3007890123",
    fecha_nacimiento: "1987-09-30",
    documento: 7890123456,
    ciudad: "Bogotá",
    direccion: "Calle 100 #20-30",
    email: "juan@email.com",
    contrasena: "Juan303*",
    estado: "ACTIVO"
  },
  {
    nombre_completo: "Patricia Castillo",
    telefono: "3008901234",
    fecha_nacimiento: "1993-11-12",
    documento: 8901234567,
    ciudad: "Medellín",
    direccion: "Carrera 50 #10-20",
    email: "patricia@email.com",
    contrasena: "Patricia404*",
    estado: "ACTIVO"
  },
  {
    nombre_completo: "Carmen Torres",
    telefono: "3010123456",
    fecha_nacimiento: "1994-02-28",
    documento: 1234567891,
    ciudad: "Bogotá",
    direccion: "Calle 45 #30-40",
    email: "carmen@email.com",
    contrasena: "Carmen606*",
    estado: "ACTIVO"
  },
  // REPARTIDORES
  {
    nombre_completo: "Ana Martínez",
    telefono: "3004567890",
    fecha_nacimiento: "1988-08-05",
    documento: 4567890123,
    ciudad: "Bogotá",
    direccion: "Calle 80 #15-20",
    email: "ana@email.com",
    contrasena: "Ana789*",
    estado: "ACTIVO"
  },
  {
    nombre_completo: "Luis Pérez",
    telefono: "3005678901",
    fecha_nacimiento: "1995-03-25",
    documento: 5678901234,
    ciudad: "Medellín",
    direccion: "Carrera 32 #45-67",
    email: "luis@email.com",
    contrasena: "Luis101*",
    estado: "ACTIVO"
  },
  // CLIENTES SIN PEDIDOS
  {
    nombre_completo: "Diego Fernández",
    telefono: "3009012345",
    fecha_nacimiento: "1986-04-18",
    documento: 9012345678,
    ciudad: "Cali",
    direccion: "Avenida 7 #56-78",
    email: "diego@email.com",
    contrasena: "Diego505*",
    estado: "ACTIVO"
  },
  {
    nombre_completo: "Roberto Méndez",
    telefono: "3011234567",
    fecha_nacimiento: "1989-07-22",
    documento: 2345678902,
    ciudad: "Bogotá",
    direccion: "Calle 70 #15-30",
    email: "roberto@email.com",
    contrasena: "Roberto707*",
    estado: "ACTIVO"
  },
  {
    nombre_completo: "Sofía Ramírez",
    telefono: "3012345678",
    fecha_nacimiento: "1990-11-15",
    documento: 3456789023,
    ciudad: "Bogotá",
    direccion: "Calle 85 #10-20",
    email: "sofia@email.com",
    contrasena: "Sofia808*",
    estado: "ACTIVO"
  }
];
// 2. CATEGORÍA
const categoriasData = [
  { tipo_categoria: "MONTURAS", descripcion: "Monturas para lentes graduados" },
  { tipo_categoria: "ACCESORIOS", descripcion: "Accesorios para lentes y cuidado visual" },
  { tipo_categoria: "GAFAS DE SOL", descripcion: "Gafas con protección UV" }
];
// 3. PRODUCTOS (30 PRODUCTOS
const productosData = [
  // MONTURAS (id_categoria: 1) - 10 productos
  {
    id_categoria: 1,
    nombre: "Montura Elegance",
    descripcion: "Montura ligera de titanio",
    marca: "Rayban",
    precio: 250000,
    imagen: path.join(__dirname, '../public/img/m.negro1.jpg'),
    material: "Titanio",
    color: "Negro"
  },
  {
    id_categoria: 1,
    nombre: "Montura Vintage",
    descripcion: "Estilo clásico con acabado mate",
    marca: "Oakley",
    precio: 180000,
    imagen: path.join(__dirname, '../public/img/m.marron1.jpg'),
    material: "Acetato",
    color: "Marrón"
  },
  {
    id_categoria: 1,
    nombre: "Montura Sport",
    descripcion: "Diseño deportivo y resistente",
    marca: "Nike",
    precio: 210000,
    imagen: path.join(__dirname, '../public/img/m.azul1.jpg'),
    material: "Plástico TR90",
    color: "Azul"
  },
  {
    id_categoria: 1,
    nombre: "Montura Classic",
    descripcion: "Diseño atemporal y elegante",
    marca: "Rayban",
    precio: 195000,
    imagen: path.join(__dirname, '../public/img/m.negro2.jpg'),
    material: "Acetato",
    color: "Negro"
  },
  {
    id_categoria: 1,
    nombre: "Montura Minimal",
    descripcion: "Diseño minimalista y ligero",
    marca: "Oakley",
    precio: 220000,
    imagen: path.join(__dirname, '../public/img/m.plateado1.jpg'),
    material: "Titanio",
    color: "Plateado"
  },
  {
    id_categoria: 1,
    nombre: "Montura Infinity",
    descripcion: "Diseño moderno sin marco superior",
    marca: "Rayban",
    precio: 270000,
    imagen: path.join(__dirname, '../public/img/m.dorado1.jpg'),
    material: "Titanio",
    color: "Dorado"
  },
  {
    id_categoria: 1,
    nombre: "Montura Retro",
    descripcion: "Estilo años 50 con acabado brillante",
    marca: "Oakley",
    precio: 160000,
    imagen: path.join(__dirname, '../public/img/m.rosado1.jpg'),
    material: "Acetato",
    color: "Rosa"
  },
  {
    id_categoria: 1,
    nombre: "Montura Aviator",
    descripcion: "Estilo piloto con doble puente",
    marca: "Rayban",
    precio: 290000,
    imagen: path.join(__dirname, '../public/img/m.dorado2.jpg'),
    material: "Metal",
    color: "Dorado"
  },
  {
    id_categoria: 1,
    nombre: "Montura Urban",
    descripcion: "Diseño urbano y moderno",
    marca: "Nike",
    precio: 200000,
    imagen: path.join(__dirname, '../public/img/m.blanco2.jpg'),
    material: "Plástico TR90",
    color: "Blanco"
  },
  {
    id_categoria: 1,
    nombre: "Montura Executive",
    descripcion: "Diseño ejecutivo para oficina",
    marca: "Oakley",
    precio: 240000,
    imagen: path.join(__dirname, '../public/img/m.amarillo1.jpg'),
    material: "Titanio",
    color: "Amarillo"
  },
  // GAFAS DE SOL (id_categoria: 3) - 10 productos
  {
    id_categoria: 3,
    nombre: "Gafas Polarizadas",
    descripcion: "Protección UV400 con lentes polarizadas",
    marca: "Rayban",
    precio: 320000,
    imagen: path.join(__dirname, '../public/img/g.negro1.jpg'),
    material: "Policarbonato",
    color: "Negro"
  },
  {
    id_categoria: 3,
    nombre: "Gafas Deportivas",
    descripcion: "Diseño aerodinámico para deportes",
    marca: "Oakley",
    precio: 280000,
    imagen: path.join(__dirname, '../public/img/g.rojo1.jpg'),
    material: "Plástico TR90",
    color: "Rojo"
  },
  {
    id_categoria: 3,
    nombre: "Gafas Clásicas",
    descripcion: "Estilo clásico con protección UV",
    marca: "Rayban",
    precio: 350000,
    imagen: path.join(__dirname, '../public/img/g.marron1.jpg'),
    material: "Acetato",
    color: "Marrón"
  },
  {
    id_categoria: 3,
    nombre: "Gafas Espejo",
    descripcion: "Lentes espejo con protección total",
    marca: "Nike",
    precio: 290000,
    imagen: path.join(__dirname, '../public/img/g.plateado1.jpg'),
    material: "Policarbonato",
    color: "Plateado"
  },
  {
    id_categoria: 3,
    nombre: "Gafas Infantiles",
    descripcion: "Gafas de sol para niños",
    marca: "Generic",
    precio: 120000,
    imagen: path.join(__dirname, '../public/img/g.azul1.jpg'),
    material: "Plástico",
    color: "Azul"
  },
  {
    id_categoria: 3,
    nombre: "Gafas Wayfarer",
    descripcion: "Estilo Wayfarer con protección UV",
    marca: "Rayban",
    precio: 310000,
    imagen: path.join(__dirname, '../public/img/g.negro2.jpg'),
    material: "Acetato",
    color: "Negro"
  },
  {
    id_categoria: 3,
    nombre: "Gafas Cat Eye",
    descripcion: "Diseño cat eye para mujer",
    marca: "Oakley",
    precio: 260000,
    imagen: path.join(__dirname, '../public/img/g.rosa1.jpg'),
    material: "Acetato",
    color: "Rosa"
  },
  {
    id_categoria: 3,
    nombre: "Gafas Round",
    descripcion: "Diseño redondo estilo vintage",
    marca: "Rayban",
    precio: 270000,
    imagen: path.join(__dirname, '../public/img/g.dorado1.jpg'),
    material: "Metal",
    color: "Dorado"
  },
  {
    id_categoria: 3,
    nombre: "Gafas Futurist",
    descripcion: "Diseño futurista con lentes oscuras",
    marca: "Nike",
    precio: 300000,
    imagen: path.join(__dirname, '../public/img/g.plateado2.jpg'),
    material: "Plástico TR90",
    color: "Plateado"
  },
  {
    id_categoria: 3,
    nombre: "Gafas Eco",
    descripcion: "Gafas ecológicas con materiales reciclados",
    marca: "Generic",
    precio: 150000,
    imagen: path.join(__dirname, '../public/img/g.verde1.jpg'),
    material: "Plástico reciclado",
    color: "Verde"
  },
  // ACCESORIOS (id_categoria: 2) - 10 productos
  {
    id_categoria: 2,
    nombre: "Estuche para Lentes",
    descripcion: "Estuche rígido con interior de terciopelo",
    marca: "Generic",
    precio: 45000,
    imagen: path.join(__dirname, '../public/img/a.negro1.jpg'),
    material: "Cuero sintético",
    color: "Negro"
  },
  {
    id_categoria: 2,
    nombre: "Kit de Limpieza",
    descripcion: "Kit completo con líquido y microfibra",
    marca: "Generic",
    precio: 25000,
    imagen: path.join(__dirname, '../public/img/a.blanco1.jpg'),
    material: "Líquido + Microfibra",
    color: "Blanco"
  },
  {
    id_categoria: 2,
    nombre: "Cadena para Lentes",
    descripcion: "Cadena decorativa para lentes",
    marca: "Generic",
    precio: 18000,
    imagen: path.join(__dirname, '../public/img/a.dorado1.jpg'),
    material: "Metal",
    color: "Dorado"
  },
  {
    id_categoria: 2,
    nombre: "Fundas de Microfibra",
    descripcion: "Set de 3 fundas de microfibra para lentes",
    marca: "Generic",
    precio: 15000,
    imagen: path.join(__dirname, '../public/img/a.multicolor1.jpg'),
    material: "Microfibra",
    color: "Multicolor"
  },
  {
    id_categoria: 2,
    nombre: "Soporte para Lentes",
    descripcion: "Soporte de escritorio para lentes",
    marca: "Generic",
    precio: 20000,
    imagen: path.join(__dirname, '../public/img/a.transparente1.jpg'),
    material: "Madera",
    color: "Transparente"
  },
  {
    id_categoria: 2,
    nombre: "Aromatizante para Lentes",
    descripcion: "Aromatizante con aceites esenciales",
    marca: "Generic",
    precio: 12000,
    imagen: path.join(__dirname, '../public/img/a.transparente2.jpg'),
    material: "Líquido",
    color: "Transparente"
  },
  {
    id_categoria: 2,
    nombre: "Estuche para Lentes",
    descripcion: "Estuche rígido con interior de terciopelo",
    marca: "Generic",
    precio: 45000,
    imagen: path.join(__dirname, '../public/img/a.rosa1.jpg'),
    material: "Cuero sintético",
    color: "Rosa"
  },
  {
    id_categoria: 2,
    nombre: "Clip Solar para Lentes",
    descripcion: "Clip con filtro solar para lentes",
    marca: "Generic",
    precio: 40000,
    imagen: path.join(__dirname, '../public/img/a.negro2.jpg'),
    material: "Plástico",
    color: "Negro"
  },
  {
    id_categoria: 2,
    nombre: "Correa Deportiva",
    descripcion: "Correa elástica para sujetar lentes",
    marca: "Generic",
    precio: 22000,
    imagen: path.join(__dirname, '../public/img/a.negro3.jpg'),
    material: "Elástico",
    color: "Negro"
  },
  {
    id_categoria: 2,
    nombre: "Caja Organizadora",
    descripcion: "Caja para guardar lentes y accesorios",
    marca: "Generic",
    precio: 32000,
    imagen: path.join(__dirname, '../public/img/a.gris1.jpg'),
    material: "Plástico",
    color: "Gris"
  }
];
// 4. FÓRMULA
const formulasData = [
  {
    id_usuario: 2, // María
    condicion: "MIOPIA",
    imagen: path.join(__dirname, '../public/img/miopia1.jpg'),
    observaciones: "Paciente con miopía severa -5.00 en ambos ojos",
    estado: "Aprobado",
    costo: 150000
  },
  {
    id_usuario: 3, // Carlos
    condicion: "ASTIGMATISMO",
    imagen: path.join(__dirname, '../public/img/astigmatismo1.jpg'),
    observaciones: "Astigmatismo mixto con leve hipermetropía",
    estado: "Aprobado",
    costo: 120000
  },
  {
    id_usuario: 6, // Laura
    condicion: "DALTONISMO",
    imagen: path.join(__dirname, '../public/img/daltonismo1.jpg'),
    observaciones: "Daltonismo rojo-verde, necesita filtros especiales",
    estado: "Pendiente",
    costo: 0
  },
  {
    id_usuario: 7, // Juan
    condicion: "BAJA VISION",
    imagen: path.join(__dirname, '../public/img/bajavision1.jpg'),
    observaciones: "Paciente con baja visión severa, requiere aumentos especiales",
    estado: "Pendiente",
    costo: 0
  },
  {
    id_usuario: 8, // Patricia
    condicion: "MIOPIA",
    imagen: path.join(__dirname, '../public/img/miopia2.jpg'),
    observaciones: "Miopía moderada -3.00, con ligero astigmatismo",
    estado: "Aprobado",
    costo: 130000
  },
  {
    id_usuario: 9, // Diego
    condicion: "ASTIGMATISMO",
    imagen: path.join(__dirname, '../public/img/astigmatismo2.jpg'),
    observaciones: "Astigmatismo simple, corrección con lentes tóricos",
    estado: "Rechazado",
    costo: 0
  },
  {
    id_usuario: 10, // Carmen
    condicion: "DALTONISMO",
    imagen: path.join(__dirname, '../public/img/daltonismo2.jpg'),
    observaciones: "Daltonismo completo, necesita adaptación especial",
    estado: "Aprobado",
    costo: 140000
  }
];
// 5. VEHÍCULO
const vehiculosData = [
  { id_usuario: 8, tipo: "Moto", modelo: "Yamaha NMAX 2023", placa: "ABC123", color: "Negro" }, // Ana
  { id_usuario: 9, tipo: "Moto", modelo: "Honda Navi 2024", placa: "DEF456", color: "Rojo" } // Luis
];
// 6. PEDIDOS (12 PEDIDOS
const pedidosData = [
  // Pedido 1: María - Bogotá, CON fórmula, 100% pagado
  {
    id_usuario: 2,
    id_formula: 1,
    direccion_entrega: "Calle 123 #45-67",
    ciudad_envio: "Bogotá",  
    estado: "Pagado",
    costo_envio: 0,
    total: 720000,
    fecha_estimada: "2025-01-15"
  },
  // Pedido 2: Carlos - Medellín, CON fórmula, 50% (abono)
  {
    id_usuario: 3,
    id_formula: 2,
    direccion_entrega: "Carrera 45 #23-12",
    ciudad_envio: "Medellín",  
    estado: "Abonado",
    costo_envio: 10000,
    total: 310000,
    fecha_estimada: "2025-01-20"
  },
  // Pedido 3: Laura - Cali, SIN fórmula, 100% pagado
  {
    id_usuario: 6,
    id_formula: null,
    direccion_entrega: "Avenida 3 #78-90",
    ciudad_envio: "Cali",
    estado: "Pagado",
    costo_envio: 10000,
    total: 230000,
    fecha_estimada: "2025-01-25"
  },
  // Pedido 4: Patricia - Medellín, CON fórmula, 50% (esperando segundo pago)
  {
    id_usuario: 8,
    id_formula: 5,
    direccion_entrega: "Carrera 50 #10-20",
    ciudad_envio: "Medellín",  
    estado: "Listo",
    costo_envio: 10000,
    total: 420000,
    fecha_estimada: "2025-01-28"
  },
  // Pedido 5: Juan - Bogotá, SIN fórmula, 50% (en proceso)
  {
    id_usuario: 7,
    id_formula: null,
    direccion_entrega: "Calle 100 #20-30",
    ciudad_envio: "Bogotá",  
    estado: "Abonado",
    costo_envio: 0,
    total: 210000,
    fecha_estimada: "2025-02-01"
  },
  // Pedido 6: Carmen - Bogotá, SIN fórmula, SIN PAGOS (pendiente)
  {
    id_usuario: 10,
    id_formula: null,
    direccion_entrega: "Calle 45 #30-40",
    ciudad_envio: "Bogotá",
    estado: "Pendiente",
    costo_envio: 0,
    total: 45000,
    fecha_estimada: "2025-02-05"
  },
  // Pedido 7: María - Bogotá, SIN fórmula, 100% pagado y entregado
  {
    id_usuario: 2,
    id_formula: null,
    direccion_entrega: "Calle 123 #45-67",
    ciudad_envio: "Bogotá",  
    estado: "Entregado",
    costo_envio: 0,
    total: 250000,
    fecha_estimada: "2025-01-10"
  },
  //  Pedido 8: Patricia - Medellín, CON fórmula, DOS PAGOS 50%
  {
    id_usuario: 8,
    id_formula: 5,
    direccion_entrega: "Carrera 50 #10-20",
    ciudad_envio: "Medellín",  
    estado: "Pagado",
    costo_envio: 10000,
    total: 420000,
    fecha_estimada: "2025-02-10"
  },
  // Pedido 9: Carlos - Medellín, CON fórmula, 100% pagado, MÚLTIPLES PRODUCTOS
  {
    id_usuario: 3,
    id_formula: 2,
    direccion_entrega: "Carrera 45 #23-12",
    ciudad_envio: "Medellín",  
    estado: "Pagado",
    costo_envio: 10000,
    total: 660000,
    fecha_estimada: "2025-02-15"
  },
  // Pedido 10: Laura - Cali, SIN fórmula, 100% pagado, MÚLTIPLES PRODUCTOS
  {
    id_usuario: 6,
    id_formula: null,
    direccion_entrega: "Avenida 3 #78-90",
    ciudad_envio: "Cali",
    estado: "Pagado",
    costo_envio: 10000,
    total: 648000,
    fecha_estimada: "2025-02-20"
  },
  // Pedido 11: Juan - Bogotá, SIN fórmula, 100% pagado, MÚLTIPLES PRODUCTOS
  {
    id_usuario: 7,
    id_formula: null,
    direccion_entrega: "Calle 100 #20-30",
    ciudad_envio: "Bogotá",
    estado: "Pagado",
    costo_envio: 0,
    total: 595000,
    fecha_estimada: "2025-02-25"
  },
  // Pedido 12: Patricia - Medellín, CON fórmula, SIN PAGOS (pendiente)
  {
    id_usuario: 8,
    id_formula: 5,
    direccion_entrega: "Carrera 50 #10-20",
    ciudad_envio: "Medellín",
    estado: "Pendiente",
    costo_envio: 10000,
    total: 463000,
    fecha_estimada: "2025-03-01"
  }
];
// 7. PEDIDOS_PRODUCTO
const pedidosProductosData = [
  { id_pedido: 1, id_producto: 1, cant_productos: 1 },
  { id_pedido: 1, id_producto: 11, cant_productos: 1 },
  { id_pedido: 2, id_producto: 2, cant_productos: 1 },
  { id_pedido: 3, id_producto: 5, cant_productos: 1 },
  { id_pedido: 4, id_producto: 12, cant_productos: 1 },
  { id_pedido: 5, id_producto: 3, cant_productos: 1 },
  { id_pedido: 6, id_producto: 21, cant_productos: 1 },
  { id_pedido: 7, id_producto: 1, cant_productos: 1 },
  { id_pedido: 8, id_producto: 12, cant_productos: 1 },
  { id_pedido: 9, id_producto: 2, cant_productos: 1 },
  { id_pedido: 9, id_producto: 12, cant_productos: 1 },
  { id_pedido: 9, id_producto: 21, cant_productos: 1 },
  { id_pedido: 9, id_producto: 22, cant_productos: 1 },
  { id_pedido: 10, id_producto: 6, cant_productos: 1 },
  { id_pedido: 10, id_producto: 13, cant_productos: 1 },
  { id_pedido: 10, id_producto: 23, cant_productos: 1 },
  { id_pedido: 11, id_producto: 10, cant_productos: 1 },
  { id_pedido: 11, id_producto: 16, cant_productos: 1 },
  { id_pedido: 11, id_producto: 22, cant_productos: 1 },
  { id_pedido: 11, id_producto: 25, cant_productos: 1 },
  { id_pedido: 12, id_producto: 17, cant_productos: 1 },
  { id_pedido: 12, id_producto: 21, cant_productos: 1 },
  { id_pedido: 12, id_producto: 23, cant_productos: 1 }
];
// 8. PAGOS (Pedido 8 tiene DOS PAGOS
const pagosData = [
  // Pedido 1: 100%
  {
    id_pedido: 1,
    eleccion_pago: "100%",
    monto: 720000,
    estado: "Confirmado",
    fecha_pago: "2025-01-05 10:00:00"
  },
  // Pedido 2: 50%
  {
    id_pedido: 2,
    eleccion_pago: "50%",
    monto: 155000,
    estado: "Confirmado",
    fecha_pago: "2025-01-08 14:30:00"
  },
  // Pedido 3: 100%
  {
    id_pedido: 3,
    eleccion_pago: "100%",
    monto: 230000,
    estado: "Confirmado",
    fecha_pago: "2025-01-10 09:15:00"
  },
  // Pedido 4: 50%
  {
    id_pedido: 4,
    eleccion_pago: "50%",
    monto: 210000,
    estado: "Confirmado",
    fecha_pago: "2025-01-12 11:45:00"
  },
  // Pedido 5: 50%
  {
    id_pedido: 5,
    eleccion_pago: "50%",
    monto: 105000,
    estado: "Confirmado",
    fecha_pago: "2025-01-15 16:20:00"
  },
  // Pedido 7: 100%
  {
    id_pedido: 7,
    eleccion_pago: "100%",
    monto: 250000,
    estado: "Confirmado",
    fecha_pago: "2025-01-02 13:00:00"
  },
  //  Pedido 8: PRIMER PAGO 50%
  {
    id_pedido: 8,
    eleccion_pago: "50%",
    monto: 210000,
    estado: "Confirmado",
    fecha_pago: "2025-02-01 10:00:00"
  },
  //  Pedido 8: SEGUNDO PAGO 50% (mismo id_pedido)
  {
    id_pedido: 8,
    eleccion_pago: "50%",
    monto: 210000,
    estado: "Confirmado",
    fecha_pago: "2025-02-08 14:30:00"
  },
  // Pedido 9: 100%
  {
    id_pedido: 9,
    eleccion_pago: "100%",
    monto: 660000,
    estado: "Confirmado",
    fecha_pago: "2025-02-12 09:00:00"
  },
  // Pedido 10: 100%
  {
    id_pedido: 10,
    eleccion_pago: "100%",
    monto: 648000,
    estado: "Confirmado",
    fecha_pago: "2025-02-18 11:00:00"
  },
  // Pedido 11: 100%
  {
    id_pedido: 11,
    eleccion_pago: "100%",
    monto: 595000,
    estado: "Confirmado",
    fecha_pago: "2025-02-22 10:30:00"
  }
  // Pedido 6 y 12 NO tienen pagos (están en Pendiente)
];
// FUNCIÓN: CREAR ROLE
const crearRoles = async (transaction) => {
  console.log(" Creando roles...");
  const rolesData = [
    { nombre: "ADMIN" },
    { nombre: "CLIENTE" },
    { nombre: "REPARTIDOR" }
  ];

  const rolesCreados = {};
  for (const role of rolesData) {
    const [rol, created] = await Role.findOrCreate({
      where: { nombre: role.nombre },
      defaults: role,
      transaction
    });
    rolesCreados[rol.nombre] = rol;
    console.log(` Rol ${rol.nombre}: ${created ? "Creado" : "Ya existe"}`);
  }
  console.log("");
  return rolesCreados;
};
// FUNCIÓN: CREAR ADMI
const crearAdmin = async (transaction) => {
  console.log(" Creando administrador...");

  const adminExistente = await Usuario.findOne({
    where: { email: adminData.email },
    transaction
  });

  if (adminExistente) {
    console.log("El administrador ya existe, actualizando...");
    await adminExistente.update({
      contrasena: adminData.contrasena,
      estado: "ACTIVO",
      nombre_completo: adminData.nombre_completo,
      telefono: adminData.telefono,
      fecha_nacimiento: adminData.fecha_nacimiento,
      documento: adminData.documento,
      ciudad: adminData.ciudad,
      direccion: adminData.direccion,
      reset_token: null,
      reset_token_expiry: null
    }, { transaction });
    console.log(` Admin actualizado: ${adminData.email}`);
    return adminExistente;
  }

  const admin = await Usuario.create({
    nombre_completo: adminData.nombre_completo,
    telefono: adminData.telefono,
    fecha_nacimiento: adminData.fecha_nacimiento,
    documento: adminData.documento,
    ciudad: adminData.ciudad,
    direccion: adminData.direccion,
    email: adminData.email,
    contrasena: adminData.contrasena,
    estado: adminData.estado,
    reset_token: null,
    reset_token_expiry: null
  }, { transaction });

  console.log(` Admin creado: ${adminData.email}`);
  return admin;
};
// FUNCIÓN: ASIGNAR ROL A USUARI
const asignarRol = async (usuarioId, rolId, transaction) => {
  const [rolUsuario, created] = await RolUsuario.findOrCreate({
    where: {
      id_usuario: usuarioId,
      id_rol: rolId
    },
    defaults: {
      id_usuario: usuarioId,
      id_rol: rolId
    },
    transaction
  });
  return created;
};
// FUNCIÓN PRINCIPA
const seedAll = async () => {
  const transaction = await sequelize.transaction();

  try {
    console.log("\nIniciando inserción de datos...\n");

    await sequelize.authenticate();
    console.log("Conexión a la base de datos establecida\n");


    // 1. ROLES

    const roles = await crearRoles(transaction);


    // 2. ADMIN

    const admin = await crearAdmin(transaction);
    await asignarRol(admin.id_usuario, roles.ADMIN.id_rol, transaction);
    console.log(` Rol ADMIN asignado\n`);


    // 3. USUARIOS

    console.log(" Insertando usuarios...");
    const usuariosIds = {};

    // Insertar admin primero
    usuariosIds[adminData.email] = admin.id_usuario;

    for (const usuario of usuariosData) {
      const hashedPassword = await bcrypt.hash(usuario.contrasena, 10);

      // AGREGAR reset_token y reset_token_expiry (NULL por defecto)
      const [result] = await sequelize.query(
        `INSERT INTO USUARIOS 
         (nombre_completo, telefono, fecha_nacimiento, documento, ciudad, direccion, email, contrasena, estado, reset_token, reset_token_expiry)
         VALUES (:nombre_completo, :telefono, :fecha_nacimiento, :documento, :ciudad, :direccion, :email, :contrasena, :estado, NULL, NULL)`,
        {
          replacements: {
            nombre_completo: usuario.nombre_completo,
            telefono: usuario.telefono,
            fecha_nacimiento: usuario.fecha_nacimiento,
            documento: usuario.documento,
            ciudad: usuario.ciudad,
            direccion: usuario.direccion,
            email: usuario.email,
            contrasena: hashedPassword,
            estado: usuario.estado
          },
          type: sequelize.QueryTypes.INSERT,
          transaction
        }
      );

      usuariosIds[usuario.email] = result;
      console.log(` Usuario: ${usuario.nombre_completo} (${usuario.email}) - ID: ${result}`);
    }


    // 4. ASIGNAR ROLES A USUARIOS (TABLA INTERMEDIA ROL_USUARIO)

    console.log("Asignando roles a usuarios...");

    const rolesPorUsuario = {
      "admin@opticam.com": ["ADMIN"],
      "maria@email.com": ["CLIENTE"],
      "carlos@email.com": ["CLIENTE"],
      "laura@email.com": ["CLIENTE"],
      "juan@email.com": ["CLIENTE"],
      "patricia@email.com": ["CLIENTE"],
      "carmen@email.com": ["CLIENTE"],
      "ana@email.com": ["REPARTIDOR"],
      "luis@email.com": ["REPARTIDOR"],
      "diego@email.com": ["CLIENTE"],
      "roberto@email.com": ["CLIENTE"],
      "sofia@email.com": ["CLIENTE"]
    };

    for (const [email, rolesList] of Object.entries(rolesPorUsuario)) {
      const id_usuario = usuariosIds[email];
      if (!id_usuario) continue;

      for (const rolNombre of rolesList) {
        if (roles[rolNombre]) {
          await sequelize.query(
            `INSERT IGNORE INTO ROL_USUARIO (id_rol, id_usuario) VALUES (:id_rol, :id_usuario)`,
            {
              replacements: {
                id_rol: roles[rolNombre].id_rol,
                id_usuario
              },
              type: sequelize.QueryTypes.INSERT,
              transaction
            }
          );
          console.log(` ${email} → ${rolNombre}`);
        }
      }
    }
    console.log("");


    // 5. CATEGORÍAS

    console.log("Insertando categorías...");
    for (const categoria of categoriasData) {
      await sequelize.query(
        `INSERT INTO CATEGORIAS (tipo_categoria, descripcion) 
         VALUES (:tipo_categoria, :descripcion) 
         ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion)`,
        {
          replacements: {
            tipo_categoria: categoria.tipo_categoria,
            descripcion: categoria.descripcion
          },
          type: sequelize.QueryTypes.INSERT,
          transaction
        }
      );
      console.log(`Categoría: ${categoria.tipo_categoria}`);
    }
    console.log("");


    // 6. PRODUCTOS

    console.log("Insertando productos...");
    for (const producto of productosData) {
      console.log(` Subiendo imagen local para: ${producto.nombre}`);

      const resultado = await subirImagenLocal(producto.imagen, "opticam/productos");

      if (!resultado.success) {
        console.log(` Error: ${resultado.error}`);
        continue;
      }

      await sequelize.query(
        `INSERT INTO PRODUCTOS 
         (id_categoria, nombre, descripcion, marca, precio, imagen, material, color) 
         VALUES (:id_categoria, :nombre, :descripcion, :marca, :precio, :imagen, :material, :color)`,
        {
          replacements: {
            id_categoria: producto.id_categoria,
            nombre: producto.nombre,
            descripcion: producto.descripcion,
            marca: producto.marca,
            precio: producto.precio,
            imagen: resultado.url,
            material: producto.material,
            color: producto.color
          },
          type: sequelize.QueryTypes.INSERT,
          transaction
        }
      );
      console.log(`Producto: ${producto.nombre}`);
    }
    console.log("");


    // 7. FÓRMULAS

    console.log("Insertando fórmulas...");
    for (const formula of formulasData) {
      console.log(`Subiendo imagen local para fórmula (Usuario: ${formula.id_usuario})`);

      const resultado = await subirImagenLocal(formula.imagen, "opticam/formulas");
      if (!resultado.success) {
        console.log(` Error en fórmula ${formula.id_usuario}: ${resultado.error}`);
        continue;
      }

      await sequelize.query(
        `INSERT INTO FORMULAS 
         (id_usuario, condicion, imagen_formula, observaciones, estado, costo) 
         VALUES (:id_usuario, :condicion, :imagen_formula, :observaciones, :estado, :costo)`,
        {
          replacements: {
            id_usuario: formula.id_usuario,
            condicion: formula.condicion,
            imagen_formula: resultado.url,
            observaciones: formula.observaciones,
            estado: formula.estado,
            costo: formula.costo
          },
          type: sequelize.QueryTypes.INSERT,
          transaction
        }
      );
      console.log(`Fórmula creada para usuario ${formula.id_usuario}`);
    }
    console.log("");


    // 8. VEHÍCULOS

    console.log(" Insertando vehículos...");
    for (const vehiculo of vehiculosData) {
      // Verificar si la placa ya existe
      const [existing] = await sequelize.query(
        `SELECT id_vehiculo FROM VEHICULOS WHERE placa = :placa`,
        {
          replacements: { placa: vehiculo.placa },
          type: sequelize.QueryTypes.SELECT,
          transaction
        }
      );

      if (existing) {
        console.log(`Vehículo con placa ${vehiculo.placa} ya existe, saltando...`);
        continue;
      }

      await sequelize.query(
        `INSERT INTO VEHICULOS (id_usuario, tipo, modelo, placa, color) 
        VALUES (:id_usuario, :tipo, :modelo, :placa, :color)`,
        {
          replacements: vehiculo,
          type: sequelize.QueryTypes.INSERT,
          transaction
        }
      );
      console.log(`Vehículo: ${vehiculo.modelo} - ${vehiculo.placa}`);
    }
    console.log("");


    // 9. PEDIDOS

    console.log(" Insertando pedidos...");
    for (const pedido of pedidosData) {
      const [result] = await sequelize.query(
        `INSERT INTO PEDIDOS 
         (id_usuario, id_formula, direccion_entrega, ciudad_envio, estado, costo_envio, total, fecha_estimada) 
         VALUES (:id_usuario, :id_formula, :direccion_entrega, :ciudad_envio, :estado, :costo_envio, :total, :fecha_estimada)`,
        {
          replacements: pedido,
          type: sequelize.QueryTypes.INSERT,
          transaction
        }
      );
      console.log(`Pedido ID: ${result}`);
    }
    console.log("");


    // 10. PEDIDOS_PRODUCTOS

    console.log("Insertando productos en pedidos...");
    for (const pp of pedidosProductosData) {
      await sequelize.query(
        `INSERT INTO PEDIDOS_PRODUCTOS (id_pedido, id_producto, cant_productos) 
         VALUES (:id_pedido, :id_producto, :cant_productos)`,
        {
          replacements: pp,
          type: sequelize.QueryTypes.INSERT,
          transaction
        }
      );
    }
    console.log(` ${pedidosProductosData.length} relaciones agregadas\n`);


    // 11. PAGOS

    console.log("Insertando pagos...");
    for (const pago of pagosData) {
      await sequelize.query(
        `INSERT INTO PAGOS 
         (id_pedido, eleccion_pago, monto, estado, fecha_pago) 
         VALUES (:id_pedido, :eleccion_pago, :monto, :estado, :fecha_pago)`,
        {
          replacements: pago,
          type: sequelize.QueryTypes.INSERT,
          transaction
        }
      );
      console.log(`Pago - Pedido ${pago.id_pedido} - ${pago.eleccion_pago} - ${pago.estado}`);
    }
    console.log("");


    // COMMIT

    await transaction.commit();

    console.log("\n¡TODOS LOS DATOS FUERON INSERTADOS EXITOSAMENTE!");
    console.log("\n Resumen:");
    console.log(` Usuarios: ${usuariosData.length + 1} (incluyendo admin)`);
    console.log(` Categorías: ${categoriasData.length}`);
    console.log(` Productos: ${productosData.length}`);
    console.log(` Fórmulas: ${formulasData.length}`);
    console.log(` Vehículos: ${vehiculosData.length}`);
    console.log(` Pedidos: ${pedidosData.length}`);
    console.log(` Pagos: ${pagosData.length}`);

    console.log("\n CREDENCIALES DE ADMIN:");
    console.log(`  Email: ${adminData.email}`);
    console.log(`  Contraseña: ${adminData.contrasena}`);

    console.log("\n CREDENCIALES DE USUARIOS:");
    console.log(`  María: maria@email.com / Maria123*`);
    console.log(`  Carlos: carlos@email.com / Carlos456*`);
    console.log(`  Laura: laura@email.com / Laura202*`);
    console.log(`  Juan: juan@email.com / Juan303*`);
    console.log(`  Patricia: patricia@email.com / Patricia404*`);
    console.log(`  Carmen: carmen@email.com / Carmen606*`);
    console.log(`  Ana (Repartidor): ana@email.com / Ana789*`);
    console.log(`  Luis (Repartidor): luis@email.com / Luis101*`);

    console.log("\n FLUJO DE PEDIDOS:");
    console.log(` Pedido 1: ${pedidosData[0].estado} (100% pagado → Distribución)`);
    console.log(` Pedido 2: ${pedidosData[1].estado} (50% abonado, esperando segundo pago)`);
    console.log(` Pedido 3: ${pedidosData[2].estado} (100% pagado → Distribución)`);
    console.log(` Pedido 4: ${pedidosData[3].estado} (50% abonado, gafas listas para segundo pago)`);
    console.log(` Pedido 5: ${pedidosData[4].estado} (50% abonado, esperando segundo pago)`);
    console.log(` Pedido 6: ${pedidosData[5].estado} (pendiente de pago - SIN PAGOS)`);
    console.log(` Pedido 7: ${pedidosData[6].estado} (entregado)`);
    console.log(` Pedido 8: ${pedidosData[7].estado} (DOS pagos 50% completados → Distribución) `);
    console.log(` Pedido 9: ${pedidosData[8].estado} (100% pagado, múltiples productos)`);
    console.log(` Pedido 10: ${pedidosData[9].estado} (100% pagado, múltiples productos)`);
    console.log(` Pedido 11: ${pedidosData[10].estado} (100% pagado, múltiples productos)`);
    console.log(` Pedido 12: ${pedidosData[11].estado} (pendiente de pago - SIN PAGOS)`);

  } catch (error) {
    await transaction.rollback();
    console.error("\n Error al insertar datos:", error);
    console.error("Detalles:", error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log("\n Conexión a la base de datos cerrada");
    process.exit(0);
  }
};
// EJECUTA
seedAll();