import FormulaModelo from '../models/formula.js';
import { obtenerUrlImagen } from '../utils/imageUtils.js';
import cloudinary from '../config/cloudinary.js';

// HELPER: Manejo centralizado de errores
const manejarErrorValidacion = (error, res) => {
  // Errores de validación de Sequelize (msg personalizados en el modelo)
  if (error.name === 'SequelizeValidationError') {
    const mensajes = error.errors.map(e => e.message);
    return res.status(400).json({
      success: false,
      message: mensajes[0],
      errores: mensajes
    });
  }

  // Campos únicos duplicados
  if (error.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      success: false,
      message: 'El valor ya existe en la base de datos'
    });
  }

  // Error de FK
  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      success: false,
      message: 'Referencia inválida en la base de datos'
    });
  }

  // Error de BD (conexión, sintaxis SQL, etc.)
  if (error.name === 'SequelizeDatabaseError') {
    console.error('Error de base de datos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al procesar la solicitud en la base de datos'
    });
  }

  // Cualquier otro error → 500
  console.error('Error interno no controlado:', error);
  return res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

// CONSTANTES Y VALIDADORES
const CONDICIONES_VALIDAS = ['DALTONISMO', 'ASTIGMATISMO', 'MIOPIA', 'BAJA VISION'];
const ESTADOS_VALIDOS = ['Pendiente', 'Aprobado', 'Rechazado'];

const validarCondicion = (condicion) => {
  if (!condicion || typeof condicion !== 'string') return false;
  return CONDICIONES_VALIDAS.includes(condicion.toUpperCase());
};

const validarEstado = (estado) => {
  if (!estado || typeof estado !== 'string') return false;
  return ESTADOS_VALIDOS.includes(estado);
};

const validarCosto = (costo) => {
  if (costo === undefined || costo === null || costo === '') return false;
  const num = Number(costo);
  return !isNaN(num) && num > 0;
};

// ============================================
// CLIENTE - SUBIR FÓRMULA
// ============================================
export const subirFormula = async (req, res) => {
  try {
    const { condicion, observaciones } = req.body;
    const usuario = req.user;

    if (!condicion) {
      return res.status(400).json({
        success: false,
        message: 'El campo condicion es requerido'
      });
    }

    if (!validarCondicion(condicion)) {
      return res.status(400).json({
        success: false,
        message: 'Condición inválida. Debe ser: DALTONISMO, ASTIGMATISMO, MIOPIA o BAJA VISION'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'La imagen de la fórmula es requerida'
      });
    }

    if (observaciones && observaciones.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Las observaciones no pueden superar los 200 caracteres'
      });
    }

    const nuevoId = await FormulaModelo.crear({
      id_usuario: usuario.id,
      condicion: condicion.toUpperCase(),
      imagen_formula: req.file.path,
      observaciones: observaciones || null
    });

    const nuevaFormula = await FormulaModelo.obtenerPorId(nuevoId);

    const formulaConImagen = {
      ...nuevaFormula.toJSON ? nuevaFormula.toJSON() : nuevaFormula,
      imagen_url: obtenerUrlImagen(nuevaFormula.imagen_formula, 400, 400)
    };

    res.status(201).json({
      success: true,
      message: 'Fórmula subida exitosamente. Esperando revisión del administrador',
      data: formulaConImagen
    });

  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// NUEVO: CLIENTE - ELIMINAR SU FÓRMULA

export const eliminarFormula = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = req.user;

    const formula = await FormulaModelo.obtenerPorId(id);
    
    if (!formula) {
      return res.status(404).json({
        success: false,
        message: 'Fórmula no encontrada'
      });
    }

    // Verificar que sea de este usuario
    if (formula.id_usuario !== usuario.id) {
      return res.status(403).json({
        success: false,
        message: 'No puedes eliminar una fórmula que no te pertenece'
      });
    }

    // Solo puede eliminar si está Pendiente
    if (formula.estado !== 'Pendiente') {
      return res.status(400).json({
        success: false,
        message: 'Solo puedes eliminar fórmulas en estado Pendiente'
      });
    }

    // ELIMINAR IMAGEN DE CLOUDINARY
  
    if (formula.imagen_formula) {
      try {
        const urlParts = formula.imagen_formula.split('/');
        const publicIdWithExt = urlParts[urlParts.length - 1];
        const publicId = publicIdWithExt.split('.')[0];
        await cloudinary.uploader.destroy(`opticam/formulas/${publicId}`);
      } catch (error) {
        console.log('Error al eliminar imagen:', error);
      }
    }

    await FormulaModelo.eliminar(id);

    res.json({
      success: true,
      message: 'Fórmula eliminada exitosamente'
    });

  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// ============================================
// CLIENTE - VER MIS FÓRMULAS
// ============================================
export const obtenerMisFormulas = async (req, res) => {
  try {
    const usuario = req.user;

    const formulas = await FormulaModelo.obtenerPorCliente(usuario.id);

    const formulasConImagen = formulas.map(f => {
      const plain = f.toJSON ? f.toJSON() : f;
      return {
        ...plain,
        imagen_url: obtenerUrlImagen(plain.imagen_formula, 400, 400)
      };
    });

    res.json({
      success: true,
      count: formulasConImagen.length,
      data: formulasConImagen
    });

  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// ============================================
// CLIENTE/ADMIN - VER FÓRMULA POR ID
// ============================================
export const obtenerFormulaPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = req.user;

    const formula = await FormulaModelo.obtenerPorId(id);

    if (!formula) {
      return res.status(404).json({
        success: false,
        message: 'Fórmula no encontrada'
      });
    }

    const esAdmin = usuario.roles?.includes('ADMIN') || false;
        
        if (!esAdmin && formula.id_usuario !== usuario.id) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permiso para ver esta fórmula'
            });
        }

    const formulaConImagen = {
      ...(formula.toJSON ? formula.toJSON() : formula),
      imagen_url: obtenerUrlImagen(formula.imagen_formula, 400, 400)
    };

    res.json({
      success: true,
      data: formulaConImagen
    });

  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// ============================================
// ADMIN - VER TODAS LAS FÓRMULAS
// ============================================
export const obtenerTodasLasFormulas = async (req, res) => {
  try {
    const formulas = await FormulaModelo.obtenerTodas();

    const formulasConImagen = formulas.map(f => ({
      ...f,
      imagen_url: obtenerUrlImagen(f.imagen_formula, 400, 400)
    }));

    res.json({
      success: true,
      count: formulasConImagen.length,
      data: formulasConImagen
    });

  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// ============================================
// ADMIN - VER FÓRMULAS PENDIENTES
// ============================================
export const obtenerFormulasPendientes = async (req, res) => {
  try {
    const formulas = await FormulaModelo.obtenerPendientes();

    const formulasConImagen = formulas.map(f => ({
      ...f,
      imagen_url: obtenerUrlImagen(f.imagen_formula, 400, 400)
    }));

    res.json({
      success: true,
      count: formulasConImagen.length,
      data: formulasConImagen
    });

  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// ============================================
// ADMIN - ASIGNAR PRECIO A FÓRMULA
// ============================================
export const asignarPrecioFormula = async (req, res) => {
  try {
    const { id } = req.params;
    const { costo, estado } = req.body;

    if (costo === undefined || costo === null || costo === '') {
      return res.status(400).json({
        success: false,
        message: 'El campo costo es requerido'
      });
    }

    if (isNaN(Number(costo))) {
      return res.status(400).json({
        success: false,
        message: 'El costo debe ser un número válido'
      });
    }

    if (Number(costo) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El costo debe ser mayor a 0'
      });
    }

    if (estado && !validarEstado(estado)) {
      return res.status(400).json({
        success: false,
        message: 'Estado inválido. Debe ser: Pendiente, Aprobado o Rechazado'
      });
    }

    const formula = await FormulaModelo.obtenerPorId(id);
    if (!formula) {
      return res.status(404).json({
        success: false,
        message: 'Fórmula no encontrada'
      });
    }

    if (formula.estado === 'Rechazado') {
      return res.status(400).json({
        success: false,
        message: 'No se puede asignar precio a una fórmula rechazada'
      });
    }

    const estadoFinal = estado || 'Aprobado';
    await FormulaModelo.asignarPrecio(id, Number(costo), estadoFinal);

    const formulaActualizada = await FormulaModelo.obtenerPorId(id);

    const formulaConImagen = {
      ...(formulaActualizada.toJSON ? formulaActualizada.toJSON() : formulaActualizada),
      imagen_url: obtenerUrlImagen(formulaActualizada.imagen_formula, 400, 400)
    };

    res.json({
      success: true,
      message: `Precio asignado exitosamente. Estado: ${estadoFinal}`,
      data: formulaConImagen
    });

  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// ============================================
// ADMIN - CAMBIAR ESTADO DE FÓRMULA
// ============================================
export const cambiarEstadoFormula = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!estado) {
      return res.status(400).json({
        success: false,
        message: 'El estado es requerido'
      });
    }

    if (!validarEstado(estado)) {
      return res.status(400).json({
        success: false,
        message: 'Estado inválido. Debe ser: Pendiente, Aprobado o Rechazado'
      });
    }

    const formula = await FormulaModelo.obtenerPorId(id);
    if (!formula) {
      return res.status(404).json({
        success: false,
        message: 'Fórmula no encontrada'
      });
    }

    await FormulaModelo.cambiarEstado(id, estado);

    const formulaActualizada = await FormulaModelo.obtenerPorId(id);

    const formulaConImagen = {
      ...(formulaActualizada.toJSON ? formulaActualizada.toJSON() : formulaActualizada),
      imagen_url: obtenerUrlImagen(formulaActualizada.imagen_formula, 400, 400)
    };

    res.json({
      success: true,
      message: `Estado actualizado a: ${estado}`,
      data: formulaConImagen
    });

  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// ============================================
// CLIENTE - VER SI UNA FÓRMULA ESTÁ APROBADA
// ============================================
export const verificarFormulaAprobada = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = req.user;

    const formula = await FormulaModelo.obtenerPorId(id);

    if (!formula) {
      return res.status(404).json({
        success: false,
        message: 'Fórmula no encontrada'
      });
    }

    if (formula.id_usuario !== usuario.id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para verificar esta fórmula'
      });
    }

    const aprobada = formula.estado === 'Aprobado';

    res.json({
      success: true,
      data: {
        id_formula: formula.id_formula,
        aprobada: aprobada,
        estado: formula.estado,
        costo: formula.costo,
        imagen_url: obtenerUrlImagen(formula.imagen_formula, 400, 400)
      }
    });

  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};