import FormulaModelo from '../models/formula.js';
import manejarErrorValidacion from '../utils/manejarErrores.js';
import { obtenerUrlImagen } from '../utils/imageUtils.js';
import cloudinary from '../config/cloudinary.js';

const error400 = (res, message) => res.status(400).json({ success: false, message });
const error403 = (res, message) => res.status(403).json({ success: false, message });
const error404 = (res, message) => res.status(404).json({ success: false, message });

const enriquecerFormula = (formula) => {
  const plain = formula.toJSON ? formula.toJSON() : formula;
  return {
    ...plain,
    imagen_url: obtenerUrlImagen(plain.imagen_formula, 400, 400)
  };
};

const enriquecerFormulas = (formulas) => formulas.map(enriquecerFormula);

const extraerPublicId = (url) => {
  const urlParts = url.split('/');
  const publicIdWithExt = urlParts[urlParts.length - 1];
  return publicIdWithExt.split('.')[0];
};

const eliminarImagenCloudinary = async (urlImagen) => {
  if (!urlImagen) return;
  try {
    const publicId = extraerPublicId(urlImagen);
    await cloudinary.uploader.destroy(`opticam/formulas/${publicId}`);
  } catch (error) {
    console.error('Error al eliminar imagen de Cloudinary:', error.message);
  }
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
      return error400(res, 'El campo condicion es requerido');
    }

    if (!validarCondicion(condicion)) {
      return error400(res, 'Condición inválida. Debe ser: DALTONISMO, ASTIGMATISMO, MIOPIA o BAJA VISION');
    }

    if (!req.file) {
      return error400(res, 'La imagen de la fórmula es requerida');
    }

    if (observaciones && observaciones.length > 200) {
      return error400(res, 'Las observaciones no pueden superar los 200 caracteres');
    }

    const nuevoId = await FormulaModelo.crear({
      id_usuario: usuario.id,
      condicion: condicion.toUpperCase(),
      imagen_formula: req.file.path,
      observaciones: observaciones || null
    });

    const nuevaFormula = await FormulaModelo.obtenerPorId(nuevoId);

    res.status(201).json({
      success: true,
      message: 'Fórmula subida exitosamente. Esperando revisión del administrador',
      data: enriquecerFormula(nuevaFormula)
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
      return error404(res, 'Fórmula no encontrada');
    }

    // Verificar que sea de este usuario
    if (formula.id_usuario !== usuario.id) {
      return error403(res, 'No puedes eliminar una fórmula que no te pertenece');
    }

    // Solo puede eliminar si está Pendiente
    if (formula.estado !== 'Pendiente') {
      return error400(res, 'Solo puedes eliminar fórmulas en estado Pendiente');
    }

    // ELIMINAR IMAGEN DE CLOUDINARY
    await eliminarImagenCloudinary(formula.imagen_formula);

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

    const formulasConImagen = enriquecerFormulas(formulas);

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
      return error404(res, 'Fórmula no encontrada');
    }

    const esAdmin = usuario.roles?.includes('ADMIN') || false;
        
        if (!esAdmin && formula.id_usuario !== usuario.id) {
            return error403(res, 'No tienes permiso para ver esta fórmula');
        }

    res.json({
      success: true,
      data: enriquecerFormula(formula)
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

    const formulasConImagen = enriquecerFormulas(formulas);

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

    const formulasConImagen = enriquecerFormulas(formulas);

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
      return error400(res, 'El campo costo es requerido');
    }

    if (isNaN(Number(costo))) {
      return error400(res, 'El costo debe ser un número válido');
    }

    if (Number(costo) <= 0) {
      return error400(res, 'El costo debe ser mayor a 0');
    }

    if (estado && !validarEstado(estado)) {
      return error400(res, 'Estado inválido. Debe ser: Pendiente, Aprobado o Rechazado');
    }

    const formula = await FormulaModelo.obtenerPorId(id);
    if (!formula) {
      return error404(res, 'Fórmula no encontrada');
    }

    if (formula.estado === 'Rechazado') {
      return error400(res, 'No se puede asignar precio a una fórmula rechazada');
    }

    const estadoFinal = estado || 'Aprobado';
    await FormulaModelo.asignarPrecio(id, Number(costo), estadoFinal);

    const formulaActualizada = await FormulaModelo.obtenerPorId(id);

    res.json({
      success: true,
      message: `Precio asignado exitosamente. Estado: ${estadoFinal}`,
      data: enriquecerFormula(formulaActualizada)
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
      return error400(res, 'El estado es requerido');
    }

    if (!validarEstado(estado)) {
      return error400(res, 'Estado inválido. Debe ser: Pendiente, Aprobado o Rechazado');
    }

    const formula = await FormulaModelo.obtenerPorId(id);
    if (!formula) {
      return error404(res, 'Fórmula no encontrada');
    }

    await FormulaModelo.cambiarEstado(id, estado);

    const formulaActualizada = await FormulaModelo.obtenerPorId(id);

    res.json({
      success: true,
      message: `Estado actualizado a: ${estado}`,
      data: enriquecerFormula(formulaActualizada)
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
      return error404(res, 'Fórmula no encontrada');
    }

    if (formula.id_usuario !== usuario.id) {
      return error403(res, 'No tienes permiso para verificar esta fórmula');
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
