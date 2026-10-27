import DistribucionModelo from '../models/Distribucion.js';
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
    const campo = error.errors[0]?.path || 'campo';
    return res.status(400).json({
      success: false,
      message: `El ${campo} ya está registrado`
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
  // Errores de transición lanzados desde el modelo
  if (error.message && (
    error.message.includes('No se puede') ||
    error.message.includes('Solo se pueden')
  )) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  console.error('Error interno no controlado:', error);
  return res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

// ============================================
// VALIDADORES REUTILIZABLES
// ============================================

const validarId = (id) => {
  if (id === undefined || id === null || id === '') return false;
  const num = Number(id);
  return !isNaN(num) && num > 0 && Number.isInteger(num);
};

const validarObservacion = (obs) => {
  if (obs === undefined || obs === null) return true;
  if (typeof obs !== 'string') return false;
  return obs.length <= 5000;
};

// TRANSICIONES DE ESTADO PERMITIDAS

const TRANSICIONES_PERMITIDAS = {
  'PENDIENTE': ['EN_ENTREGA', 'CANCELADO'],
  'EN_ENTREGA': ['ENTREGADO'],      
  'ENTREGADO': [],
  'CANCELADO': []
};

const esTransicionValida = (actual, nueva) => {
  if (!TRANSICIONES_PERMITIDAS[actual]) return false;
  return TRANSICIONES_PERMITIDAS[actual].includes(nueva);
};

// ADMIN - ASIGNAR PEDIDO A REPARTIDOR
export const asignarPedido = async (req, res) => {
  try {
    const { id_pedido, id_usuario, observaciones } = req.body;

    if (!validarId(id_pedido)) {
      return res.status(400).json({
        success: false,
        message: 'ID de pedido inválido'
      });
    }
    if (!validarId(id_usuario)) {
      return res.status(400).json({
        success: false,
        message: 'ID de repartidor inválido'
      });
    }
    if (!validarObservacion(observaciones)) {
      return res.status(400).json({
        success: false,
        message: 'Las observaciones no pueden superar los 5000 caracteres'
      });
    }

    // Verificar que el pedido existe
    const [pedido] = await sequelize.query(
      'SELECT * FROM PEDIDOS WHERE id_pedido = ?',
      { replacements: [id_pedido], type: sequelize.QueryTypes.SELECT }
    );

    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido no encontrado'
      });
    }

    // Verificar que el pedido esté en estado Pagado
    if (pedido.estado !== 'Pagado') {
      return res.status(400).json({
        success: false,
        message: `El pedido debe estar en estado "Pagado". Estado actual: ${pedido.estado}`
      });
    }

    const ciudad = pedido.ciudad_envio?.toLowerCase().trim() || '';
    const esBogota = ciudad === 'bogotá' || ciudad === 'bogota';

    // DETERMINAR A QUIEN ASIGNAR SEGÚN CIUDAD
    let usuarioAsignado = id_usuario;
    let tipoAsignacion = '';
    let usuarioInfo = null;

    if (esBogota) {
      // Verificar que el repartidor existe y tiene rol REPARTIDOR
      const [repartidor] = await sequelize.query(
        `SELECT u.id_usuario, u.nombre_completo, u.email, u.telefono
         FROM USUARIOS u
         JOIN ROL_USUARIO ru ON u.id_usuario = ru.id_usuario
         JOIN ROLES r ON ru.id_rol = r.id_rol
         WHERE u.id_usuario = ? AND r.nombre = 'REPARTIDOR' AND u.estado = 'ACTIVO'`,
        { replacements: [id_usuario], type: sequelize.QueryTypes.SELECT }
      );

      if (!repartidor) {
        return res.status(404).json({
          success: false,
          message: 'Repartidor no encontrado o no tiene rol REPARTIDOR'
        });
      }
      usuarioAsignado = id_usuario;
      tipoAsignacion = 'REPARTIDOR';
      usuarioInfo = repartidor;
    } else {
      // FUERA DE BOGOTÁ → ADMIN (distribuidora externa)
      const [admin] = await sequelize.query(
        `SELECT u.id_usuario 
         FROM USUARIOS u
         JOIN ROL_USUARIO ru ON u.id_usuario = ru.id_usuario
         JOIN ROLES r ON ru.id_rol = r.id_rol
         WHERE r.nombre = 'ADMIN' AND u.estado = 'ACTIVO'
         LIMIT 1`,
        { type: sequelize.QueryTypes.SELECT }
      );

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'No se encontró un administrador para asignar la distribución externa'
        });
      }

      // Verificar que el admin existe
      const [adminExistente] = await sequelize.query(
        'SELECT id_usuario FROM USUARIOS WHERE id_usuario = ? AND estado = "ACTIVO"',
        { replacements: [admin.id_usuario], type: sequelize.QueryTypes.SELECT }
      );

      if (!adminExistente) {
        return res.status(404).json({
          success: false,
          message: 'El administrador asignado no existe o está inactivo'
        });
      }

      usuarioAsignado = admin.id_usuario;
      tipoAsignacion = 'DISTRIBUIDORA_EXTERNA';
      usuarioInfo = admin;
    }

    // Verificar que el pedido no tenga una distribución activa
    const [distribucionExistente] = await sequelize.query(
      `SELECT * FROM DISTRIBUCIONES 
       WHERE id_pedido = ? AND estado IN ('PENDIENTE', 'EN_ENTREGA')`,
      { replacements: [id_pedido], type: sequelize.QueryTypes.SELECT }
    );

    if (distribucionExistente) {
      return res.status(400).json({
        success: false,
        message: 'Este pedido ya tiene una distribución activa'
      });
    }

    // CREAR OBSERVACIONES PERSONALIZADAS
    let observacionesFinal = observaciones || null;
    
    if (!esBogota) {
      observacionesFinal = `ENVÍO FUERA DE BOGOTÁ - DISTRIBUIDORA EXTERNA
Ciudad del cliente: ${ciudad}
${observaciones ? 'Observaciones adicionales: ' + observaciones : ''}`;
    } else {
      observacionesFinal = `ENTREGA EN BOGOTÁ - REPARTIDOR
${observaciones ? 'Observaciones: ' + observaciones : ''}`;
    }

    // Crear la distribución
    const distribucion = await DistribucionModelo.crear({
      id_pedido,
      id_usuario: usuarioAsignado,
      observaciones: observacionesFinal || null
    });

    // Actualizar estado del pedido a 'En Proceso'
    await sequelize.query(
      'UPDATE PEDIDOS SET estado = "En Proceso" WHERE id_pedido = ?',
      { replacements: [id_pedido] }
    );

    // Obtener la distribución con detalles del pedido
    const distribucionCreada = await DistribucionModelo.obtenerPorId(distribucion.id_distribucion);

    let mensaje = '';
    if (esBogota) {
      mensaje = `Pedido asignado exitosamente al repartidor ${usuarioInfo.nombre_completo}`;
    } else {
      mensaje = `Pedido asignado a distribuidora externa (Ciudad: ${ciudad})`;
    }

    res.status(201).json({
      success: true,
      message: mensaje,
      data: {
        distribucion: distribucionCreada,
        tipo_asignacion: tipoAsignacion,
        ciudad_cliente: ciudad,
        es_bogota: esBogota,
        usuario_asignado: {
          id: usuarioAsignado,
          nombre_completo: usuarioInfo.nombre_completo,
          email: usuarioInfo.email,
          telefono: usuarioInfo.telefono
        },
        pedido: {
          id_pedido: pedido.id_pedido,
          direccion_entrega: pedido.direccion_entrega,
          ciudad_envio: pedido.ciudad_envio,
          total: pedido.total,
          fecha_estimada: pedido.fecha_estimada
        }
      }
    });

  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// REPARTIDOR - VER MIS PEDIDOS PENDIENTES (CON DIRECCIÓN)
export const obtenerPendientes = async (req, res) => {
  try {
    const usuario = req.user;

    console.log('Usuario autenticado:', usuario);
    console.log('usuario.id:', usuario?.id);

    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const esAdmin = usuario.roles?.includes('ADMIN') || false;
    let distribuciones = [];

    if (esAdmin) {
      // ADMIN: ve solo distribuciones externas
      const [admin] = await sequelize.query(
        `SELECT u.id_usuario 
         FROM USUARIOS u
         JOIN ROL_USUARIO ru ON u.id_usuario = ru.id_usuario
         JOIN ROLES r ON ru.id_rol = r.id_rol
         WHERE r.nombre = 'ADMIN' AND u.estado = 'ACTIVO'
         LIMIT 1`,
        { type: sequelize.QueryTypes.SELECT }
      );

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'No se encontró un administrador'
        });
      }

      // Obtener todas las distribuciones pendientes del admin
      const todas = await DistribucionModelo.obtenerPendientes(admin.id_usuario);
      
      // Filtrar solo las externas (ciudad_envio != Bogotá)
      for (const dist of todas) {
        if (dist.pedido && dist.pedido.ciudad_envio) {
          const ciudad = dist.pedido.ciudad_envio.toLowerCase().trim();
          if (ciudad !== 'bogotá' && ciudad !== 'bogota') {
            distribuciones.push(dist);
          }
        }
      }
    } else {
      // REPARTIDOR: ve solo sus pedidos
      distribuciones = await DistribucionModelo.obtenerPendientes(usuario.id);
    }

    // Obtener datos del cliente para cada distribución
    const distribucionesConCliente = [];
    for (const d of distribuciones) {
      let clienteData = null;
      if (d.pedido) {
        const [cliente] = await sequelize.query(
          `SELECT nombre_completo, telefono, ciudad 
           FROM USUARIOS 
           WHERE id_usuario = ?`,
          { replacements: [d.pedido.id_usuario], type: sequelize.QueryTypes.SELECT }
        );
        clienteData = cliente;
      }
      distribucionesConCliente.push({
        id_distribucion: d.id_distribucion,
        estado: d.estado,
        fecha_asignacion: d.fecha_asignacion,
        pedido: d.pedido ? {
          id_pedido: d.pedido.id_pedido,
          direccion_entrega: d.pedido.direccion_entrega || 'Sin dirección',
          ciudad_envio: d.pedido.ciudad_envio || 'Sin ciudad', 
          total: d.pedido.total || 0,
          fecha_estimada: d.pedido.fecha_estimada || null,
          cliente: clienteData ? {
            nombre: clienteData.nombre_completo,
            telefono: clienteData.telefono,
            ciudad: clienteData.ciudad
          } : null
        } : null
      });
    }

    console.log(`${distribucionesConCliente.length} pedidos pendientes encontrados`);

    res.json({
      success: true,
      count: distribucionesConCliente.length,
      data: distribucionesConCliente
    });

  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// REPARTIDOR - VER MIS PEDIDOS EN ENTREGA (CON DIRECCIÓN)
export const obtenerEnEntrega = async (req, res) => {
  try {
    const usuario = req.user;

    console.log('Usuario autenticado:', usuario);
    console.log('usuario.id:', usuario?.id);

    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const esAdmin = usuario.roles?.includes('ADMIN') || false;
    let distribuciones = [];

    if (esAdmin) {
      //  ADMIN: ve solo distribuciones externas
      const [admin] = await sequelize.query(
        `SELECT u.id_usuario 
         FROM USUARIOS u
         JOIN ROL_USUARIO ru ON u.id_usuario = ru.id_usuario
         JOIN ROLES r ON ru.id_rol = r.id_rol
         WHERE r.nombre = 'ADMIN' AND u.estado = 'ACTIVO'
         LIMIT 1`,
        { type: sequelize.QueryTypes.SELECT }
      );

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'No se encontró un administrador'
        });
      }

      const todas = await DistribucionModelo.obtenerEnEntrega(admin.id_usuario);
      
      for (const dist of todas) {
        if (dist.pedido && dist.pedido.ciudad_envio) {
          const ciudad = dist.pedido.ciudad_envio.toLowerCase().trim();
          if (ciudad !== 'bogotá' && ciudad !== 'bogota') {
            distribuciones.push(dist);
          }
        }
      }
    } else {
      distribuciones = await DistribucionModelo.obtenerEnEntrega(usuario.id);
    }

    const distribucionesConCliente = [];
    for (const d of distribuciones) {
      let clienteData = null;
      if (d.pedido) {
        const [cliente] = await sequelize.query(
          `SELECT nombre_completo, telefono, ciudad 
           FROM USUARIOS 
           WHERE id_usuario = ?`,
          { replacements: [d.pedido.id_usuario], type: sequelize.QueryTypes.SELECT }
        );
        clienteData = cliente;
      }
      distribucionesConCliente.push({
        id_distribucion: d.id_distribucion,
        estado: d.estado,
        fecha_asignacion: d.fecha_asignacion,
        pedido: d.pedido ? {
          id_pedido: d.pedido.id_pedido,
          direccion_entrega: d.pedido.direccion_entrega || 'Sin dirección',
          ciudad_envio: d.pedido.ciudad_envio || 'Sin ciudad',
          total: d.pedido.total || 0,
          fecha_estimada: d.pedido.fecha_estimada || null,
          cliente: clienteData ? {
            nombre: clienteData.nombre_completo,
            telefono: clienteData.telefono,
            ciudad: clienteData.ciudad
          } : null
        } : null
      });
    }

    console.log(`${distribucionesConCliente.length} pedidos en entrega encontrados`);

    res.json({
      success: true,
      count: distribucionesConCliente.length,
      data: distribucionesConCliente
    });

  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// REPARTIDOR - VER DETALLE DE UNA DISTRIBUCIÓN (CON DIRECCIÓN)
export const obtenerDistribucionPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = req.user;

     if (!validarId(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de distribución inválido'
      });
    }

    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const distribucion = await DistribucionModelo.obtenerPorId(id);

    if (!distribucion) {
      return res.status(404).json({
        success: false,
        message: 'Distribución no encontrada'
      });
    }

    const esAdmin = usuario.roles?.includes('ADMIN') || false;
    if (!esAdmin && distribucion.id_usuario !== usuario.id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para ver esta distribución'
      });
    }

    //  Si es admin, puede ver cualquier distribución

    // Obtener datos del cliente del pedido
    let clienteData = null;
    if (distribucion.pedido) {
      const [cliente] = await sequelize.query(
        `SELECT nombre_completo, telefono, email, ciudad 
         FROM USUARIOS 
         WHERE id_usuario = ?`,
        { replacements: [distribucion.pedido.id_usuario], type: sequelize.QueryTypes.SELECT }
      );
      clienteData = cliente;
    }

    let vehiculoInfo = null;
    if (distribucion.repartidor) {
      const [rol] = await sequelize.query(
        `SELECT r.nombre as rol
         FROM USUARIOS u
         JOIN ROL_USUARIO ru ON u.id_usuario = ru.id_usuario
         JOIN ROLES r ON ru.id_rol = r.id_rol
         WHERE u.id_usuario = ?
           AND r.nombre IN ('ADMIN', 'REPARTIDOR')
         ORDER BY CASE r.nombre
           WHEN 'ADMIN' THEN 1
           WHEN 'REPARTIDOR' THEN 2
         END
         LIMIT 1`,
        { replacements: [distribucion.id_usuario], type: sequelize.QueryTypes.SELECT }
      );

      if (rol?.rol === 'ADMIN') {
        vehiculoInfo = 'N/A';
      } else if (rol?.rol === 'REPARTIDOR') {
        const [vehiculo] = await sequelize.query(
          `SELECT tipo, modelo, placa, color FROM VEHICULOS WHERE id_usuario = ?`,
          { replacements: [distribucion.id_usuario], type: sequelize.QueryTypes.SELECT }
        );
        if (vehiculo) {
          vehiculoInfo = `${vehiculo.tipo} ${vehiculo.modelo} - Placa: ${vehiculo.placa}`;
        } else {
          vehiculoInfo = 'Sin vehículo asignado';
        }
      }
    }

    res.json({
      success: true,
      data: {
        id_distribucion: distribucion.id_distribucion,
        estado: distribucion.estado,
        fecha_asignacion: distribucion.fecha_asignacion,
        fecha_entrega: distribucion.fecha_entrega,
        observaciones: distribucion.observaciones,
        pedido: distribucion.pedido ? {
          id_pedido: distribucion.pedido.id_pedido,
          direccion_entrega: distribucion.pedido.direccion_entrega,
          ciudad_envio: distribucion.pedido.ciudad_envio || 'Sin ciudad', 
          total: distribucion.pedido.total,
          fecha_estimada: distribucion.pedido.fecha_estimada,
          cliente: clienteData ? {
            nombre: clienteData.nombre_completo,
            telefono: clienteData.telefono,
            email: clienteData.email,
            ciudad: clienteData.ciudad
          } : null
        } : null,
        repartidor: distribucion.repartidor ? {
          id: distribucion.repartidor.id_usuario,
          nombre: distribucion.repartidor.nombre_completo,
          email: distribucion.repartidor.email,
          telefono: distribucion.repartidor.telefono,
          vehiculo: vehiculoInfo
        } : null
      }
    });

  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// REPARTIDOR - INICIAR ENTREGA
export const iniciarEntrega = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = req.user;

    if (!validarId(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de distribución inválido'
      });
    }

    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const distribucion = await DistribucionModelo.obtenerPorId(id);

    if (!distribucion) {
      return res.status(404).json({
        success: false,
        message: 'Distribución no encontrada'
      });
    }

    // Verificar permisos
    const esAdmin = usuario.roles?.includes('ADMIN') || false;
    const esRepartidor = usuario.roles?.includes('REPARTIDOR') || false;

    //  Si es repartidor, solo puede iniciar sus propias distribuciones
    if (esRepartidor && distribucion.id_usuario !== usuario.id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para iniciar esta entrega'
      });
    }

    //  Si es admin, solo puede iniciar distribuciones externas
    if (esAdmin) {
      const [pedido] = await sequelize.query(
        `SELECT ciudad_envio FROM PEDIDOS WHERE id_pedido = ?`,
        { replacements: [distribucion.id_pedido], type: sequelize.QueryTypes.SELECT }
      );

      if (!pedido) {
        return res.status(404).json({
          success: false,
          message: 'Pedido no encontrado'
        });
      }

      const ciudad = pedido.ciudad_envio?.toLowerCase().trim() || '';
      const esBogota = ciudad === 'bogotá' || ciudad === 'bogota';

      if (esBogota) {
        return res.status(403).json({
          success: false,
          message: 'Solo el repartidor asignado puede iniciar entregas en Bogotá'
        });
      }
    }

    if (!esTransicionValida(distribucion.estado, 'EN_ENTREGA')) {
  return res.status(400).json({
    success: false,
    message: `No puedes iniciar una entrega en estado ${distribucion.estado}`
  });
}

    const distribucionActualizada = await DistribucionModelo.iniciarEntrega(id);

    //  Actualizar pedido a ENVIADO
    await sequelize.query(
      'UPDATE PEDIDOS SET estado = "Enviado" WHERE id_pedido = ?',
      { replacements: [distribucion.id_pedido] }
    );

    res.json({
      success: true,
      message: 'Entrega iniciada exitosamente. Pedido enviado.',
      data: distribucionActualizada
    });

  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// REPARTIDOR - MARCAR COMO ENTREGADO
export const marcarEntregado = async (req, res) => {
  try {
    const { id } = req.params;
    const { observacion } = req.body;
    const usuario = req.user;

    if (!validarId(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de distribución inválido'
      });
    }

    if (!validarObservacion(observacion)) {
      return res.status(400).json({
        success: false,
        message: 'La observación no puede superar los 5000 caracteres'
      });
    }

    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const distribucion = await DistribucionModelo.obtenerPorId(id);

    if (!distribucion) {
      return res.status(404).json({
        success: false,
        message: 'Distribución no encontrada'
      });
    }

    // Verificar permisos
    const esAdmin = usuario.roles?.includes('ADMIN') || false;
    const esRepartidor = usuario.roles?.includes('REPARTIDOR') || false;

    // Si es repartidor, solo puede marcar sus propias distribuciones
    if (esRepartidor && distribucion.id_usuario !== usuario.id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para marcar esta entrega'
      });
    }

    // Si es admin, solo puede marcar distribuciones externas
    if (esAdmin) {
      const [pedido] = await sequelize.query(
        `SELECT ciudad_envio FROM PEDIDOS WHERE id_pedido = ?`,
        { replacements: [distribucion.id_pedido], type: sequelize.QueryTypes.SELECT }
      );

      if (!pedido) {
        return res.status(404).json({
          success: false,
          message: 'Pedido no encontrado'
        });
      }

      const ciudad = pedido.ciudad_envio?.toLowerCase().trim() || '';
      const esBogota = ciudad === 'bogotá' || ciudad === 'bogota';

      if (esBogota) {
        return res.status(403).json({
          success: false,
          message: 'Solo el repartidor asignado puede marcar entregas en Bogotá'
        });
      }
    }

    if (!esTransicionValida(distribucion.estado, 'ENTREGADO')) {
  return res.status(400).json({
    success: false,
    message: `No puedes marcar como entregado en estado ${distribucion.estado}`
  });
}

    // Agregar observación si se proporcionó
    if (observacion) {
      const obsActual = distribucion.observaciones || '';
      await sequelize.query(
        `UPDATE DISTRIBUCIONES 
         SET observaciones = CONCAT(?, '\\n', ?) 
         WHERE id_distribucion = ?`,
        { 
          replacements: [obsActual, ` ENTREGADO: ${observacion}`, id],
          type: sequelize.QueryTypes.UPDATE
        }
      );
    }

    const distribucionActualizada = await DistribucionModelo.marcarEntregado(id);

    res.json({
      success: true,
      message: 'Pedido marcado como entregado exitosamente',
      data: distribucionActualizada
    });

  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// REPARTIDOR - VER HISTORIAL DE ENTREGAS (CON DIRECCIÓN)
export const obtenerHistorial = async (req, res) => {
  try {
    const usuario = req.user;

    console.log('Usuario autenticado:', usuario);

    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const esAdmin = usuario.roles?.includes('ADMIN') || false;
    let historial = [];

    if (esAdmin) {
      //  ADMIN: ve historial de distribuciones externas
      const [admin] = await sequelize.query(
        `SELECT u.id_usuario 
         FROM USUARIOS u
         JOIN ROL_USUARIO ru ON u.id_usuario = ru.id_usuario
         JOIN ROLES r ON ru.id_rol = r.id_rol
         WHERE r.nombre = 'ADMIN' AND u.estado = 'ACTIVO'
         LIMIT 1`,
        { type: sequelize.QueryTypes.SELECT }
      );

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'No se encontró un administrador'
        });
      }

      const todas = await DistribucionModelo.obtenerHistorial(admin.id_usuario);
      
      for (const d of todas) {
        if (d.pedido && d.pedido.ciudad_envio) {
          const ciudad = d.pedido.ciudad_envio.toLowerCase().trim();
          if (ciudad !== 'bogotá' && ciudad !== 'bogota') {
            historial.push(d);
          }
        }
      }
    } else {
      //  REPARTIDOR: ve su historial
      historial = await DistribucionModelo.obtenerHistorial(usuario.id);
    }

    console.log(`${historial.length} entregas completadas encontradas`);

    const historialConCliente = await Promise.all(
      historial.map(async d => {
        if (!d.pedido?.id_usuario) {
          return { distribucion: d, cliente: null };
        }

        const [cliente] = await sequelize.query(
          `SELECT nombre_completo, telefono, ciudad
           FROM USUARIOS
           WHERE id_usuario = ?`,
          {
            replacements: [d.pedido.id_usuario],
            type: sequelize.QueryTypes.SELECT
          }
        );

        return { distribucion: d, cliente };
      })
    );

    res.json({
      success: true,
      count: historial.length,
      data: historialConCliente.map(({ distribucion: d, cliente }) => ({
        id_distribucion: d.id_distribucion,
        estado: d.estado,
        fecha_asignacion: d.fecha_asignacion,
        fecha_entrega: d.fecha_entrega,
        observaciones: d.observaciones,
        pedido: d.pedido ? {
          id_pedido: d.pedido.id_pedido,
          direccion_entrega: d.pedido.direccion_entrega || 'Sin dirección',
          ciudad_envio: d.pedido.ciudad_envio || 'Sin ciudad', 
          total: d.pedido.total || 0,
          fecha_estimada: d.pedido.fecha_estimada || null,
          cliente: cliente ? {
            nombre: cliente.nombre_completo,
            telefono: cliente.telefono,
            ciudad: cliente.ciudad
          } : null
        } : null
      }))
    });

  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// ADMIN - OBTENER TODAS LAS DISTRIBUCIONES
export const obtenerTodas = async (req, res) => {
  try {
    const distribuciones = await DistribucionModelo.obtenerTodas();

    const distribucionesFormateadas = distribuciones.map((d) => ({
      id_distribucion: d.id_distribucion,
      estado: d.estado,
      fecha_asignacion: d.fecha_asignacion,
      fecha_entrega: d.fecha_entrega,
      observaciones: d.observaciones,
      pedido: {
        id_pedido: d.id_pedido || 0,
        direccion_entrega: d.direccion_entrega || 'Sin dirección',
        ciudad_envio: d.ciudad_envio || 'Sin ciudad',
        total: d.total || 0,
        fecha_estimada: d.fecha_estimada || null,
        cliente: {
          nombre: d.cliente_nombre || 'Sin cliente',
          telefono: d.cliente_telefono || '',
          email: d.cliente_email || '',
          ciudad: d.cliente_ciudad || '',
        }
      },
      repartidor: {
        id: d.id_usuario || 0,
        nombre: d.repartidor_nombre || 'No asignado',
        email: d.repartidor_email || '',
        telefono: d.repartidor_telefono || '',
        vehiculo: d.vehiculo_tipo ? `${d.vehiculo_tipo} - ${d.vehiculo_placa || 'N/A'}` : 'N/A',
      }
    }));

    res.json({
      success: true,
      count: distribucionesFormateadas.length,
      data: distribucionesFormateadas
    });

  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// ADMIN - CANCELAR ENTREGA
export const cancelarEntrega = async (req, res) => {
  try {
    const { id } = req.params;
    const { observacion } = req.body;

    if (!validarId(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de distribución inválido'
      });
    }

    if (!validarObservacion(observacion)) {
      return res.status(400).json({
        success: false,
        message: 'La observación no puede superar los 5000 caracteres'
      });
    }

    const distribucion = await DistribucionModelo.obtenerPorId(id);

    if (!distribucion) {
      return res.status(404).json({
        success: false,
        message: 'Distribución no encontrada'
      });
    }

    if (!esTransicionValida(distribucion.estado, 'CANCELADO')) {
      let mensaje = '';
      if (distribucion.estado === 'EN_ENTREGA') {
        mensaje = 'No se puede cancelar una entrega que ya está en camino. El repartidor debe completarla o contactar al administrador.';
      } else if (distribucion.estado === 'ENTREGADO') {
        mensaje = 'No se puede cancelar una entrega ya entregada';
      } else if (distribucion.estado === 'CANCELADO') {
        mensaje = 'Esta distribución ya está cancelada';
      } else {
        mensaje = `No se puede cancelar en estado ${distribucion.estado}`;
      }
      return res.status(400).json({
        success: false,
        message: mensaje
      });
    }

    const distribucionActualizada = await DistribucionModelo.cancelarEntrega(id, observacion);

    await sequelize.query(
      'UPDATE PEDIDOS SET estado = "Pagado" WHERE id_pedido = ?',
      { replacements: [distribucion.id_pedido] }
    );

    res.json({
      success: true,
      message: 'Entrega cancelada exitosamente. El pedido vuelve a estado PAGADO.',
      data: distribucionActualizada
    });

  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// ADMIN - OBTENER DISTRIBUCIONES EXTERNAS (FUERA DE BOGOTÁ)
export const obtenerDistribucionesExternas = async (req, res) => {
  try {
    // Buscar el ADMIN (distribuidora externa)
    const [admin] = await sequelize.query(
      `SELECT u.id_usuario, u.nombre_completo, u.email, u.telefono
       FROM USUARIOS u
       JOIN ROL_USUARIO ru ON u.id_usuario = ru.id_usuario
       JOIN ROLES r ON ru.id_rol = r.id_rol
       WHERE r.nombre = 'ADMIN' AND u.estado = 'ACTIVO'
       LIMIT 1`,
      { type: sequelize.QueryTypes.SELECT }
    );

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró un administrador'
      });
    }

    // Obtener todas las distribuciones del admin
    const distribuciones = await DistribucionModelo.obtenerPorUsuario(admin.id_usuario);

    // Enriquecer con ciudad del cliente
    const distribucionesExternas = [];
    for (const dist of distribuciones) {
      if (dist.pedido) {
        // Obtener ciudad del usuario del pedido
        const [usuario] = await sequelize.query(
          'SELECT id_usuario, nombre_completo, ciudad, email, telefono FROM USUARIOS WHERE id_usuario = ?',
          { replacements: [dist.pedido.id_usuario], type: sequelize.QueryTypes.SELECT }
        );
        
        const ciudad = dist.pedido.ciudad_envio || 'Desconocida';
        const esBogota = ciudad.toLowerCase().trim() === 'bogotá' || ciudad.toLowerCase().trim() === 'bogota';
        
        if (!esBogota) {
          distribucionesExternas.push({
            id_distribucion: dist.id_distribucion,
            estado: dist.estado,
            fecha_asignacion: dist.fecha_asignacion,
            fecha_entrega: dist.fecha_entrega,
            observaciones: dist.observaciones,
            admin_asignado: {
              id: admin.id_usuario,
              nombre_completo: admin.nombre_completo,
              email: admin.email,
              telefono: admin.telefono,
              vehiculo: 'N/A' 
            },
            cliente: {
              id: usuario?.id_usuario || null,
              nombre_completo: usuario?.nombre_completo || 'Desconocido',
              email: usuario?.email || 'Desconocido',
              telefono: usuario?.telefono || 'Desconocido',
              ciudad: ciudad
            },
            pedido: {
              id_pedido: dist.pedido.id_pedido,
              direccion_entrega: dist.pedido.direccion_entrega,
              total: dist.pedido.total,
              fecha_estimada: dist.pedido.fecha_estimada
            }
          });
        }
      }
    }

    res.json({
      success: true,
      count: distribucionesExternas.length,
      data: distribucionesExternas
    });

  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};
// REPARTIDOR - VER TODAS MIS DISTRIBUCIONES (TODOS LOS ESTADOS)
export const obtenerMisDistribuciones = async (req, res) => {
  try {
    const usuario = req.user;

    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    // Verificar que sea repartidor
    const esRepartidor = usuario.roles?.includes('REPARTIDOR') || false;
    if (!esRepartidor) {
      return res.status(403).json({
        success: false,
        message: 'Solo los repartidores pueden ver sus distribuciones'
      });
    }

    // Obtener TODAS las distribuciones del repartidor
    const distribuciones = await DistribucionModelo.obtenerPorUsuario(usuario.id);

    // Enriquecer con datos del cliente y vehículo
    const distribucionesConDetalles = [];
    for (const d of distribuciones) {
      // Obtener datos del cliente
      let clienteData = null;
      if (d.pedido) {
        const [cliente] = await sequelize.query(
          `SELECT nombre_completo, telefono, ciudad, email
           FROM USUARIOS 
           WHERE id_usuario = ?`,
          { replacements: [d.pedido.id_usuario], type: sequelize.QueryTypes.SELECT }
        );
        clienteData = cliente;
      }

      // Obtener vehículo del repartidor
      let vehiculoData = null;
      const [vehiculo] = await sequelize.query(
        `SELECT tipo, modelo, placa, color 
         FROM VEHICULOS 
         WHERE id_usuario = ?`,
        { replacements: [usuario.id], type: sequelize.QueryTypes.SELECT }
      );
      if (vehiculo) {
        vehiculoData = {
          tipo: vehiculo.tipo,
          modelo: vehiculo.modelo,
          placa: vehiculo.placa,
          color: vehiculo.color,
          descripcion: `${vehiculo.tipo} ${vehiculo.modelo} - ${vehiculo.color} - Placa: ${vehiculo.placa}`
        };
      }

      // Obtener el rol del usuario asignado
      const [rolAsignado] = await sequelize.query(
        `SELECT r.nombre as rol
         FROM USUARIOS u
         JOIN ROL_USUARIO ru ON u.id_usuario = ru.id_usuario
         JOIN ROLES r ON ru.id_rol = r.id_rol
         WHERE u.id_usuario = ?`,
        { replacements: [d.id_usuario], type: sequelize.QueryTypes.SELECT }
      );

      distribucionesConDetalles.push({
        id_distribucion: d.id_distribucion,
        estado: d.estado,
        fecha_asignacion: d.fecha_asignacion,
        fecha_entrega: d.fecha_entrega || null,
        observaciones: d.observaciones,
        
        // Datos del cliente
        cliente: clienteData ? {
          id: d.pedido.id_usuario,
          nombre: clienteData.nombre_completo,
          email: clienteData.email,
          telefono: clienteData.telefono,
          ciudad: clienteData.ciudad
        } : null,

        // Datos del pedido
        pedido: d.pedido ? {
          id_pedido: d.pedido.id_pedido,
          direccion_entrega: d.pedido.direccion_entrega || 'Sin dirección',
          ciudad_envio: d.pedido.ciudad_envio || 'Sin ciudad',
          total: d.pedido.total || 0,
          fecha_estimada: d.pedido.fecha_estimada || null
        } : null,

        // Datos del repartidor asignado
        repartidor_asignado: {
          id: usuario.id,
          nombre: usuario.nombre_completo,
          email: usuario.email,
          telefono: usuario.telefono,
          rol: rolAsignado?.rol || 'REPARTIDOR',
          vehiculo: vehiculoData
        },

        // Tipo de asignación (Bogotá o externa)
        tipo_asignacion: d.pedido?.ciudad_envio ? 
          (d.pedido.ciudad_envio.toLowerCase().trim() === 'bogotá' || 
           d.pedido.ciudad_envio.toLowerCase().trim() === 'bogota' ? 
            'BOGOTÁ' : 'EXTERNA') 
          : 'DESCONOCIDA'
      });
    }

    res.json({
      success: true,
      count: distribucionesConDetalles.length,
      data: distribucionesConDetalles
    });

  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};