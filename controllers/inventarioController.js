import Inventario from '../models/inventario.js';
import manejarErrorValidacion from '../utils/manejarErrores.js';
import { obtenerUrlImagen, obtenerThumbnail } from '../utils/imageUtils.js';
import cloudinary from '../config/cloudinary.js';

const REGEX_COLOR = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
const CATEGORIAS_VALIDAS = [1, 2, 3];

const validarColor = (color) => REGEX_COLOR.test(String(color).trim());
const validarCategoria = (id) => CATEGORIAS_VALIDAS.includes(Number(id));
const validarPrecio = (precio) => {
  if (precio === undefined || precio === null || precio === '') return false;
  const num = Number(precio);
  return !isNaN(num) && num > 0;
};

// Helper para añadir URLs de imagen a un producto
const enriquecerProducto = (p) => ({
  ...p,
  imagen_url: obtenerUrlImagen(p.imagen, 400, 400),
  imagen_thumbnail: obtenerThumbnail(p.imagen)
});

const LONGITUD_MIN = 2;
const LONGITUD_MAX = 45;

const validarLongitud = (texto) => {
  const len = String(texto).trim().length;
  return len >= LONGITUD_MIN && len <= LONGITUD_MAX;
};

const esIdValido = (id) => {
  const num = Number(id);
  return !isNaN(num) && num > 0;
};

const enriquecerProductos = (productos) => productos.map(enriquecerProducto);

const extraerPublicId = (url) => {
  const urlParts = url.split('/');
  const publicIdWithExt = urlParts[urlParts.length - 1];
  return publicIdWithExt.split('.')[0];
};

const eliminarImagenCloudinary = async (urlImagen) => {
  if (!urlImagen) return;
  try {
    const publicId = extraerPublicId(urlImagen);
    await cloudinary.uploader.destroy(`opticam/productos/${publicId}`);
  } catch (error) {
    console.log('Error al eliminar imagen de Cloudinary:', error);
  }
};

// ========== PRODUCTOS ==========

// Obtener todos los productos
export const getProductos = async (_req, res) => {
  try {
    const results = await Inventario.getAll();

    const productosConImagen = enriquecerProductos(results);

    res.json({
      success: true,
      count: productosConImagen.length,
      productos: productosConImagen
    });
  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// Obtener productos destacados (últimos 6)
export const getProductosDestacados = async (_req, res) => {
  try {
    const results = await Inventario.getDestacados();

    const productosConImagen = enriquecerProductos(results);

    res.json({
      success: true,
      count: productosConImagen.length,
      productos: productosConImagen
    });
  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// Obtener producto por ID
export const getProductoById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!esIdValido(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de producto inválido'
      });
    }

    const result = await Inventario.findById(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado"
      });
    }

    const productoConImagen = enriquecerProducto(result);

    res.json({
      success: true,
      producto: productoConImagen
    });
  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// Filtrar productos
export const filtrarProductos = async (req, res) => {
  try {
    const filtros = {
      precio_min: req.query.precio_min ? parseFloat(req.query.precio_min) : undefined,
      precio_max: req.query.precio_max ? parseFloat(req.query.precio_max) : undefined,
      marca: req.query.marca,
      color: req.query.color,
      material: req.query.material,
      id_categoria: req.query.id_categoria,
      busqueda: req.query.q
    };

    if (filtros.precio_min !== undefined && (isNaN(filtros.precio_min) || filtros.precio_min < 0)) {
      return res.status(400).json({
        success: false,
        message: 'El precio mínimo debe ser un número mayor o igual a 0'
      });
    }
    if (filtros.precio_max !== undefined && (isNaN(filtros.precio_max) || filtros.precio_max < 0)) {
      return res.status(400).json({
        success: false,
        message: 'El precio máximo debe ser un número mayor o igual a 0'
      });
    }

    const results = await Inventario.filtrar(filtros);

    const productosConImagen = enriquecerProductos(results);

    res.json({
      success: true,
      count: productosConImagen.length,
      filtros: filtros,
      productos: productosConImagen
    });
  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// Buscar productos por texto
export const buscarProductos = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Debes proporcionar un término de búsqueda"
      });
    }

    const results = await Inventario.buscar(q);

    const productosConImagen = enriquecerProductos(results);

    res.json({
      success: true,
      query: q,
      count: productosConImagen.length,
      productos: productosConImagen
    });
  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// Obtener productos por categoría
export const getProductosByCategoria = async (req, res) => {
  try {
    const { id_categoria } = req.params;

    if (!id_categoria || isNaN(Number(id_categoria))) {
      return res.status(400).json({
        success: false,
        message: 'ID de categoría inválido'
      });
    }

    const results = await Inventario.getByCategoria(id_categoria);

    const productosConImagen = enriquecerProductos(results);

    res.json({
      success: true,
      id_categoria: id_categoria,
      count: productosConImagen.length,
      productos: productosConImagen
    });
  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// Obtener productos por marca
export const getProductosByMarca = async (req, res) => {
  try {
    const { marca } = req.params;

    if (!marca || marca.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'La marca es requerida'
      });
    }

    const results = await Inventario.getByMarca(marca);

    const productosConImagen = enriquecerProductos(results);

    res.json({
      success: true,
      marca: marca,
      count: productosConImagen.length,
      productos: productosConImagen
    });
  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// Obtener todas las marcas
export const getMarcas = async (_req, res) => {
  try {
    const results = await Inventario.getMarcas();
    res.json({
      success: true,
      count: results.length,
      marcas: results
    });
  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// Obtener todos los colores
export const getColores = async (_req, res) => {
  try {
    const results = await Inventario.getColores();
    res.json({
      success: true,
      count: results.length,
      colores: results
    });
  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// Crear producto (solo admin)
export const createProducto = async (req, res) => {
  try {
    const { id_categoria, nombre, descripcion, marca, precio, material, color } = req.body;

    if (!id_categoria) {
      return res.status(400).json({
        success: false,
        message: "El campo id_categoria es obligatorio"
      });
    }

    if (!validarCategoria(id_categoria)) {
      return res.status(400).json({
        success: false,
        message: "Categoría inválida. Debe ser 1 (MONTURAS), 2 (ACCESORIOS) o 3 (GAFAS DE SOL)"
      });
    }

    if (!nombre) {
      return res.status(400).json({
        success: false,
        message: "El campo nombre es obligatorio"
      });
    }

    if (!validarLongitud(nombre)) {
      return res.status(400).json({
        success: false,
        message: "El nombre debe tener entre 2 y 45 caracteres"
      });
    }

    if (!descripcion || !descripcion.trim()) {
      return res.status(400).json({
        success: false,
        message: "El campo descripción es obligatorio"
      });
    }

    if (!validarLongitud(descripcion)) {
      return res.status(400).json({
        success: false,
        message: "La descripción debe tener entre 2 y 45 caracteres"
      });
    }

    if (!marca || !marca.trim()) {
      return res.status(400).json({
        success: false,
        message: "El campo marca es obligatorio"
      });
    }

    if (!validarLongitud(marca)) {
      return res.status(400).json({
        success: false,
        message: "La marca debe tener entre 2 y 45 caracteres"
      });
    }

    if (!validarPrecio(precio)) {
      return res.status(400).json({
        success: false,
        message: "El precio debe ser un número mayor a 0"
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "La imagen es requerida"
      });
    }

    if (!material || !material.trim()) {
      return res.status(400).json({
        success: false,
        message: "El campo material es obligatorio"
      });
    }

    if (!validarLongitud(material)) {
      return res.status(400).json({
        success: false,
        message: "El material debe tener entre 2 y 45 caracteres"
      });
    }

    if (!color || !color.trim()) {
      return res.status(400).json({
        success: false,
        message: "El campo color es obligatorio"
      });
    }

    if (!validarColor(color)) {
      return res.status(400).json({
        success: false,
        message: "El color solo puede contener letras y espacios"
      });
    }

    const result = await Inventario.create({
      id_categoria,
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      marca: marca.trim(),
      precio: Number(precio),
      imagen: req.file.path,
      material: material.trim(),
      color: color.trim()
    });

    res.status(201).json({
      success: true,
      message: "Producto creado exitosamente",
      id_producto: result.insertId,
      imagen_cloudinary: req.file.path
    });
  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// Actualizar producto (solo admin)
export const updateProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_categoria, nombre, descripcion, marca, precio, material, color } = req.body;

    if (!esIdValido(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de producto inválido'
      });
    }

    const productoActual = await Inventario.findById(id);

    if (!productoActual) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado"
      });
    }

    if (id_categoria && !validarCategoria(id_categoria)) {
      return res.status(400).json({
        success: false,
        message: "Categoría inválida. Debe ser 1 (MONTURAS), 2 (ACCESORIOS) o 3 (GAFAS DE SOL)"
      });
    }

    if (nombre && !validarLongitud(nombre)) {
      return res.status(400).json({
        success: false,
        message: "El nombre debe tener entre 2 y 45 caracteres"
      });
    }

    if (descripcion && !validarLongitud(descripcion)) {
      return res.status(400).json({
        success: false,
        message: "La descripción debe tener entre 2 y 45 caracteres"
      });
    }

    if (marca && !validarLongitud(marca)) {
      return res.status(400).json({
        success: false,
        message: "La marca debe tener entre 2 y 45 caracteres"
      });
    }

    if (precio !== undefined && !validarPrecio(precio)) {
      return res.status(400).json({
        success: false,
        message: "El precio debe ser un número mayor a 0"
      });
    }

    if (material && !validarLongitud(material)) {
      return res.status(400).json({
        success: false,
        message: "El material debe tener entre 2 y 45 caracteres"
      });
    }

    if (color && !validarColor(color)) {
      return res.status(400).json({
        success: false,
        message: "El color solo puede contener letras y espacios"
      });
    }

    // SI HAY NUEVA IMAGEN, SUBIR AUTOMÁTICAMENTE

    let imagenFinal = productoActual.imagen;

    if (req.file) {
      imagenFinal = req.file.path;

      await eliminarImagenCloudinary(productoActual.imagen);
    }

    await Inventario.update(id, {
      id_categoria: id_categoria || productoActual.id_categoria,
      nombre: nombre ? nombre.trim() : productoActual.nombre,
      descripcion: descripcion !== undefined ? descripcion.trim() : productoActual.descripcion,
      marca: marca !== undefined ? marca.trim() : productoActual.marca,
      precio: precio !== undefined ? Number(precio) : productoActual.precio,
      imagen: imagenFinal,
      material: material !== undefined ? material.trim() : productoActual.material,
      color: color !== undefined ? color.trim() : productoActual.color
    });

    const updatedProduct = await Inventario.findById(id);

    const productoConImagen = enriquecerProducto(updatedProduct);

    res.json({
      success: true,
      message: "Producto actualizado exitosamente",
      producto: productoConImagen
    });
  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// Eliminar producto (solo admin)
export const deleteProducto = async (req, res) => {
  try {
    const { id } = req.params;

    if (!esIdValido(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de producto inválido'
      });
    }

    const producto = await Inventario.findById(id);

    if (!producto) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado"
      });
    }

    // ELIMINAR IMAGEN DE CLOUDINARY
    await eliminarImagenCloudinary(producto.imagen);

    await Inventario.delete(id);

    res.json({
      success: true,
      message: "Producto eliminado exitosamente"
    });
  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// ========== CATEGORIAS ==========

// Obtener todas las categorías
export const getCategorias = async (_req, res) => {
  try {
    const results = await Inventario.getCategorias();
    res.json({
      success: true,
      count: results.length,
      categorias: results
    });
  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};
