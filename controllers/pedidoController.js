import PedidoModelo from '../models/pedidos.js';
import PedidoProductoModelo from '../models/pedidoprodutos.js';
import sequelize from '../config/database.js';

const manejarErrorValidacion = (error, res) => {
  if (error.name === 'SequelizeValidationError') {
    const mensajes = error.errors.map(e => e.message);
    return res.status(400).json({
      success: false,
      message: mensajes[0],
      errores: mensajes
    });
  }

  if (error.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      success: false,
      message: 'El valor ya existe en la base de datos'
    });
  }

  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      success: false,
      message: 'Referencia inválida en la base de datos'
    });
  }

  if (error.name === 'SequelizeDatabaseError') {
    console.error('Error de base de datos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al procesar la solicitud en la base de datos'
    });
  }

  console.error('Error interno no controlado:', error);
  return res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

// VALIDADORES REUTILIZABLES
const REGEX_CIUDAD = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
const ESTADOS_VALIDOS = ['Pendiente', 'Abonado', 'Listo', 'Pagado', 'En Proceso', 'Enviado', 'Entregado', 'Cancelado'];
const ESTADOS_ACTIVOS_ADMIN = ['Abonado', 'Listo', 'Pagado', 'En Proceso', 'Enviado', 'Entregado'];

const validarCiudad = (ciudad) => {
  if (!ciudad || typeof ciudad !== 'string') return false;
  return REGEX_CIUDAD.test(ciudad.trim());
};

const validarDireccion = (direccion) => {
  if (!direccion || typeof direccion !== 'string') return false;
  const limpio = direccion.trim();
  return limpio.length >= 5 && limpio.length <= 45;
};

const validarProductos = (productos) => {
  if (!Array.isArray(productos) || productos.length === 0) return false;
  for (const item of productos) {
    if (!item.id_producto || typeof item.id_producto !== 'number' || item.id_producto <= 0) return false;
    if (!item.cantidad || typeof item.cantidad !== 'number' || item.cantidad < 1 || !Number.isInteger(item.cantidad)) return false;
  }
  return true;
};

const validarId = (id) => {
  if (id === undefined || id === null || id === '') return false;
  const num = Number(id);
  return !isNaN(num) && num > 0 && Number.isInteger(num);
};

const TRANSICIONES_PERMITIDAS = {
  'Pendiente':  ['Abonado', 'Cancelado'],
  'Abonado':    ['Listo', 'Cancelado'],
  'Listo':      ['Pagado'],
  'Pagado':     ['En Proceso'],
  'En Proceso': ['Enviado'],
  'Enviado':    ['Entregado'],
  'Entregado':  [],
  'Cancelado':  []
};

const esTransicionValida = (estadoActual, estadoNuevo) => {
  if (!TRANSICIONES_PERMITIDAS[estadoActual]) return false;
  return TRANSICIONES_PERMITIDAS[estadoActual].includes(estadoNuevo);
};

// UTILIDAD - CALCULAR COSTO DE ENVÍO
const calcularCostoEnvio = (ciudad) => {
  if (!ciudad) return 10000;
  const ciudadLower = ciudad.toLowerCase().trim();
  if (ciudadLower === 'bogotá' || ciudadLower === 'bogota') {
    return 0;
  }
  return 10000;
};

// CLIENTE - CREAR PEDIDO (CON FÓRMULA)
export const crearPedido = async (req, res) => {
  try {
    const { id_formula, direccion_entrega, ciudad_envio, productos } = req.body;
    const usuario = req.user;

    console.log('Usuario autenticado:', usuario);

    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    if (!direccion_entrega) {
      return res.status(400).json({
        success: false,
        message: 'La dirección de entrega es obligatoria'
      });
    }

    if (!validarDireccion(direccion_entrega)) {
      return res.status(400).json({
        success: false,
        message: 'La dirección de entrega debe tener entre 5 y 45 caracteres'
      });
    }

    if (!ciudad_envio) {
      return res.status(400).json({
        success: false,
        message: 'La ciudad de envío es obligatoria'
      });
    }

    if (!validarCiudad(ciudad_envio)) {
      return res.status(400).json({
        success: false,
        message: 'La ciudad solo puede contener letras y espacios'
      });
    }

    if (!productos || productos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debes agregar al menos un producto'
      });
    }

    if (!validarProductos(productos)) {
      return res.status(400).json({
        success: false,
        message: 'Cada producto debe tener un id válido y una cantidad mayor o igual a 1'
      });
    }

    console.log('Productos recibidos:', productos);

    // Verificar que cada producto tenga id_producto
    for (const item of productos) {
      if (!item.id_producto) {
        console.error('Producto sin id_producto:', item);
        return res.status(400).json({
          success: false,
          message: `Producto sin ID: ${JSON.stringify(item)}`
        });
      }
    }

    // Obtener ciudad del usuario
    let ciudad = usuario.ciudad || '';
    
    if (!ciudad) {
      const [usuarioData] = await sequelize.query(
        'SELECT ciudad FROM USUARIOS WHERE id_usuario = ?',
        { replacements: [usuario.id], type: sequelize.QueryTypes.SELECT }
      );
      ciudad = usuarioData?.ciudad || '';
    }

    const costo_envio = calcularCostoEnvio(ciudad_envio);
    console.log('Ciudad:', ciudad);
    console.log('Costo envío:', costo_envio);

    // Calcular subtotal de productos
    let subtotal = 0;
    for (const item of productos) {
      console.log(`Buscando producto ID: ${item.id_producto}`);
      
      const [producto] = await sequelize.query(
        'SELECT precio FROM PRODUCTOS WHERE id_producto = ?',
        { replacements: [item.id_producto], type: sequelize.QueryTypes.SELECT }
      );
      
      if (!producto) {
        console.error(`Producto ${item.id_producto} no encontrado`);
        return res.status(404).json({
          success: false,
          message: `Producto con ID ${item.id_producto} no encontrado`
        });
      }
      
      console.log(`Producto ${item.id_producto} encontrado, precio: ${producto.precio}`);
      subtotal += producto.precio * (item.cantidad || 1);
    }

    // ===== OBTENER COSTO DE LA FÓRMULA SI SE SELECCIONÓ =====
    let costo_formula = 0;
    let formulaData = null;

    if (id_formula) {
      const [formula] = await sequelize.query(
        `SELECT f.*, u.nombre_completo, u.email, u.telefono
         FROM FORMULAS f
         JOIN USUARIOS u ON f.id_usuario = u.id_usuario
         WHERE f.id_formula = ? AND f.estado = 'Aprobado'`,
        { replacements: [id_formula], type: sequelize.QueryTypes.SELECT }
      );

      if (!formula) {
        return res.status(404).json({
          success: false,
          message: 'Fórmula no encontrada o no está aprobada'
        });
      }

      // Verificar que la fórmula pertenece al usuario
      if (formula.id_usuario !== usuario.id) {
        return res.status(403).json({
          success: false,
          message: 'Esta fórmula no te pertenece'
        });
      }

      costo_formula = formula.costo || 0;
      formulaData = formula;
    }

    // Calcular total
    const total = subtotal + costo_formula + costo_envio;

    // CALCULAR FECHA ESTIMADA (8-10 días hábiles)
    const fechaPedido = new Date();
    const dias = 8 + Math.floor(Math.random() * 3); // 8, 9 o 10 días
    const fechaEstimada = new Date(fechaPedido);
    fechaEstimada.setDate(fechaPedido.getDate() + dias);
    
    // Si cae en fin de semana, mover al lunes siguiente
    while (fechaEstimada.getDay() === 0 || fechaEstimada.getDay() === 6) {
      fechaEstimada.setDate(fechaEstimada.getDate() + 1);
    }
    
    const fechaEstimadaStr = fechaEstimada.toISOString().split('T')[0];
    console.log('Fecha estimada calculada:', fechaEstimadaStr);

    // Crear el pedido CON fecha_estimada
    const id_pedido = await PedidoModelo.crear({
      id_usuario: usuario.id,
      id_formula: id_formula || null,
      direccion_entrega: direccion_entrega.trim(),   
      ciudad_envio: ciudad_envio.trim(),  
      total: total,
      costo_envio: costo_envio,
      fecha_estimada: fechaEstimadaStr
    });

    // Agregar productos al pedido
    await PedidoProductoModelo.agregarMultiples(id_pedido, productos);

    const pedido = await PedidoModelo.obtenerPorId(id_pedido);

    res.status(201).json({
      success: true,
      message: 'Pedido creado exitosamente',
      data: {
        id_pedido: pedido.id_pedido,
        fecha_pedido: pedido.fecha_pedido,
        fecha_estimada: pedido.fecha_estimada,
        subtotal: subtotal,
        costo_formula: costo_formula,
        costo_envio: costo_envio,
        total: total,
        estado: pedido.estado,
        direccion_entrega: pedido.direccion_entrega,
        ciudad_envio: pedido.ciudad_envio,
        formula: formulaData ? {
          id_formula: formulaData.id_formula,
          condicion: formulaData.condicion,
          imagen_formula: formulaData.imagen_formula,
          observaciones: formulaData.observaciones,
          costo: formulaData.costo
        } : null
      }
    });

  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// CLIENTE - VER MIS PEDIDOS
export const obtenerMisPedidos = async (req, res) => {
  try {
    const usuario = req.user;

    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    // Obtener pedidos del cliente
    const pedidos = await PedidoModelo.obtenerPorCliente(usuario.id);

    // Para cada pedido, obtener sus productos
    const pedidosConProductos = [];
    for (const pedido of pedidos) {
      const productos = await PedidoProductoModelo.obtenerPorPedido(pedido.id_pedido);
      pedidosConProductos.push({
        ...pedido,
        productos: productos
      });
    }

    res.json({
      success: true,
      count: pedidosConProductos.length,
      data: pedidosConProductos
    });

  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// CLIENTE - VER DETALLE DE PEDIDO (CON FÓRMULA)
export const obtenerPedidoPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = req.user;

    if (!validarId(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de pedido inválido'
      });
    }

    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const pedido = await PedidoModelo.obtenerPorId(id);

    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido no encontrado'
      });
    }

    // Verificar permisos
    const esAdmin = usuario.roles?.includes('ADMIN') || false;
    if (esAdmin && (pedido.estado === 'Pendiente' || pedido.estado === 'Cancelado')) {
  return res.status(403).json({
    success: false,
    message: 'No tienes permiso para ver este pedido'
  });
}

    const productos = await PedidoProductoModelo.obtenerPorPedido(id);

    const productosData = productos || [];

    res.json({
      success: true,
      data: {
        pedido: {
          id_pedido: pedido.id_pedido,
          fecha_pedido: pedido.fecha_pedido,
          fecha_estimada: pedido.fecha_estimada,
          estado: pedido.estado,
          direccion_entrega: pedido.direccion_entrega,
          ciudad_envio: pedido.ciudad_envio,
          costo_envio: pedido.costo_envio,
          total: pedido.total,
          cliente: {
            id: pedido.id_usuario,
            nombre: pedido.nombre_completo,
            email: pedido.email,
            telefono: pedido.telefono,
            direccion: pedido.direccion,
            ciudad: pedido.ciudad
          },
          formula: pedido.id_formula ? {
            id_formula: pedido.id_formula,
            condicion: pedido.condicion,
            imagen_formula: pedido.imagen_formula,
            observaciones: pedido.observaciones,
            costo: pedido.costo_formula
          } : null
        },
        productos: productosData
      }
    });

  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// CLIENTE - CANCELAR PEDIDO
export const cancelarPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = req.user;

    if (!validarId(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de pedido inválido'
      });
    }

    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const pedido = await PedidoModelo.obtenerPorId(id);
    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido no encontrado'
      });
    }

    // Verificar si el pedido pertenece al usuario
    if (pedido.id_usuario !== usuario.id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para cancelar este pedido'
      });
    }

    if (pedido.estado !== 'Pendiente') {
      return res.status(400).json({
        success: false,
        message: `Solo puedes cancelar pedidos en estado "Pendiente". Estado actual: ${pedido.estado}`
      });
    }

    if (!esTransicionValida(pedido.estado, 'Cancelado')) {
      return res.status(400).json({
        success: false,
        message: `No se puede pasar de "${pedido.estado}" a "Cancelado"`
      });
    }

    await PedidoModelo.actualizarEstado(id, 'Cancelado');

    const pedidoActualizado = await PedidoModelo.obtenerPorId(id);

    res.json({
      success: true,
      message: 'Pedido cancelado exitosamente',
      data: pedidoActualizado
    });

  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// ADMIN - MARCAR PEDIDO COMO LISTO (50% + 50%)
export const marcarPedidoComoListo = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validarId(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de pedido inválido'
      });
    }

    const pedido = await PedidoModelo.obtenerPorId(id);
    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido no encontrado'
      });
    }

    // Solo se puede marcar como listo si está en estado ABONADO
    if (pedido.estado !== 'Abonado') {
      return res.status(400).json({
        success: false,
        message: `El pedido debe estar en estado "Abonado". Estado actual: ${pedido.estado}`
      });
    }

    if (!esTransicionValida(pedido.estado, 'Listo')) {
      return res.status(400).json({
        success: false,
        message: `No se puede pasar de "${pedido.estado}" a "Listo"`
      });
    }

    // Verificar que tenga un abono del 50%
    const pagos = await sequelize.query(
      `SELECT eleccion_pago FROM PAGOS 
       WHERE id_pedido = ? AND estado = 'Confirmado'`,
      { replacements: [id], type: sequelize.QueryTypes.SELECT }
    );

    const tieneAbono50 = pagos.some(p => p.eleccion_pago === '50%');
    if (!tieneAbono50) {
      return res.status(400).json({
        success: false,
        message: 'Este pedido no tiene un abono del 50%. No se puede marcar como LISTO.'
      });
    }

    // Verificar que no tenga pago completo ya
    const tienePago100 = pagos.some(p => p.eleccion_pago === '100%');
    if (tienePago100) {
      return res.status(400).json({
        success: false,
        message: 'Este pedido ya fue pagado completamente (100%). No necesita marcar como LISTO.'
      });
    }

    await PedidoModelo.actualizarEstado(id, 'Listo');

    const pedidoActualizado = await PedidoModelo.obtenerPorId(id);

    res.json({
      success: true,
      message: 'Pedido marcado como LISTO. El cliente puede pagar el 50% restante.',
      data: pedidoActualizado
    });

  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// ADMIN - OBTENER TODOS LOS PEDIDOS (CON FÓRMULA)
export const obtenerTodosLosPedidos = async (req, res) => {
  try {
    const pedidos = await PedidoModelo.obtenerTodos();

    res.json({
      success: true,
      count: pedidos.length,
      data: pedidos
    });

  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// ADMIN - OBTENER PEDIDOS POR ESTADO
export const obtenerPedidosPorEstado = async (req, res) => {
  try {
    const { estado } = req.params;

    if (!ESTADOS_ACTIVOS_ADMIN.includes(estado)) {
      return res.status(400).json({
        success: false,
        message: `Estado inválido. Debe ser uno de: ${ESTADOS_ACTIVOS_ADMIN.join(', ')}`
      });
    }

    const pedidos = await PedidoModelo.obtenerPorEstado(estado);

    res.json({
      success: true,
      count: pedidos.length,
      data: pedidos
    });

  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// ADMIN - ACTUALIZAR ESTADO DEL PEDIDO
export const actualizarEstadoPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!validarId(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de pedido inválido'
      });
    }

    if (!estado || typeof estado !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'El estado es requerido'
      });
    }

    if (!ESTADOS_ACTIVOS_ADMIN.includes(estado)) {
      return res.status(400).json({
        success: false,
        message: `Estado inválido. Debe ser uno de: ${ESTADOS_ACTIVOS_ADMIN.join(', ')}`
      });
    }

    const pedido = await PedidoModelo.obtenerPorId(id);
    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido no encontrado'
      });
    }

    if (!esTransicionValida(pedido.estado, estado)) {
      return res.status(400).json({
        success: false,
        message: `No se puede pasar de "${pedido.estado}" a "${estado}". Transiciones permitidas: ${TRANSICIONES_PERMITIDAS[pedido.estado]?.join(', ') || 'ninguna'}`
      });
    }

    await PedidoModelo.actualizarEstado(id, estado);

    const pedidoActualizado = await PedidoModelo.obtenerPorId(id);

    res.json({
      success: true,
      message: `Estado actualizado a: ${estado}`,
      data: pedidoActualizado
    });

  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// ADMIN - ACTUALIZAR FECHA ESTIMADA
export const actualizarFechaEstimada = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha_estimada } = req.body;

    if (!validarId(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de pedido inválido'
      });
    }

    if (!fecha_estimada) {
      return res.status(400).json({
        success: false,
        message: 'La fecha estimada es requerida'
      });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha_estimada)) {
      return res.status(400).json({
        success: false,
        message: 'La fecha debe tener formato YYYY-MM-DD'
      });
    }

    const fechaComparar = new Date(`${fecha_estimada}T00:00:00`);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (isNaN(fechaComparar.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'La fecha estimada no es válida'
      });
    }

    if (fechaComparar < hoy) {
      return res.status(400).json({
        success: false,
        message: 'La fecha estimada no puede ser anterior a hoy'
      });
    }

    const pedido = await PedidoModelo.obtenerPorId(id);
    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido no encontrado'
      });
    }

    const estadosEditablesFecha = ['Abonado', 'Listo', 'Pagado', 'En Proceso'];
    if (!estadosEditablesFecha.includes(pedido.estado)) {
      return res.status(400).json({
        success: false,
        message: `No se puede editar la fecha estimada en estado "${pedido.estado}". Estados permitidos: ${estadosEditablesFecha.join(', ')}`
      });
    }

    await PedidoModelo.actualizarFechaEstimada(id, fecha_estimada);

    const pedidoActualizado = await PedidoModelo.obtenerPorId(id);

    res.json({
      success: true,
      message: 'Fecha estimada de entrega actualizada',
      data: pedidoActualizado
    });

  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// ADMIN - ESTADÍSTICAS DE PEDIDOS
export const obtenerEstadisticasPedidos = async (req, res) => {
  try {
    const estadisticas = await PedidoModelo.obtenerEstadisticas();

    res.json({
      success: true,
      data: estadisticas
    });

  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};