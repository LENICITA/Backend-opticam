import { DataTypes, Op } from 'sequelize';
import sequelize from '../config/database.js';

// ========== HELPERS (eliminan duplicación) ==========

/**
 * Formatea un producto de Sequelize a objeto plano.
 * Centraliza el mapeo que antes se repetía 7 veces.
 */
const formatearProducto = (p) => ({
  id_producto: p.id_producto,
  id_categoria: p.id_categoria,
  nombre: p.nombre,
  descripcion: p.descripcion,
  marca: p.marca,
  precio: p.precio,
  imagen: p.imagen,
  material: p.material,
  color: p.color,
  tipo_categoria: p.categoria?.tipo_categoria,
  categoria_descripcion: p.categoria?.descripcion
});

/**
 * Formatea un producto sin el campo categoria_descripcion
 * (variante usada por getDestacados, filtrar, buscar, getByCategoria, getByMarca).
 */
const formatearProductoSimple = (p) => ({
  id_producto: p.id_producto,
  id_categoria: p.id_categoria,
  nombre: p.nombre,
  descripcion: p.descripcion,
  marca: p.marca,
  precio: p.precio,
  imagen: p.imagen,
  material: p.material,
  color: p.color,
  tipo_categoria: p.categoria?.tipo_categoria
});

// ========== MODELO PRODUCTOS ==========
const Producto = sequelize.define('Producto', {
  id_producto: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  id_categoria: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      notNull: { msg: 'La categoría es requerida' },
      isInt:   { msg: 'El ID de la categoría debe ser un número' }
    }
  },
  nombre: {
    type: DataTypes.STRING(45),
    allowNull: false,
    validate: {
      notNull: { msg: 'El nombre es requerido' },
      notEmpty: { msg: 'El nombre es requerido' },
      len: { args: [2, 45], msg: 'El nombre debe tener entre 2 y 45 caracteres' }
    }
  },
  descripcion: {
    type: DataTypes.STRING(45),
    allowNull: false,
    validate: {
      notNull: { msg: 'La descripción es requerida' },
      notEmpty: { msg: 'La descripción es requerida' },
      len: { args: [2, 45], msg: 'La descripción debe tener entre 2 y 45 caracteres' }
    }
  },
  marca: {
    type: DataTypes.STRING(45),
    allowNull: false,
    validate: {
      notNull: { msg: 'La marca es requerida' },
      notEmpty: { msg: 'La marca es requerida' },
      len: { args: [2, 45], msg: 'La marca debe tener entre 2 y 45 caracteres' }
    }
  },
  precio: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      notNull: { msg: 'El precio es requerido' },
      isFloat: { msg: 'El precio debe ser un número válido' },
      min: { args: [0.01], msg: 'El precio debe ser mayor a 0' }
    }
  },
  imagen: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notNull: { msg: 'La imagen es requerida' },
      notEmpty: { msg: 'La imagen es requerida' }
    }
  },
  material: {
    type: DataTypes.STRING(45),
    allowNull: false,
    validate: {
      notNull: { msg: 'El material es requerido' },
      notEmpty: { msg: 'El material es requerido' },
      len: { args: [2, 45], msg: 'El material debe tener entre 2 y 45 caracteres' }
    }
  },
  color: {
    type: DataTypes.STRING(45),
    allowNull: false,
    validate: {
      notNull: { msg: 'El color es requerido' },
      notEmpty: { msg: 'El color es requerido' },
      is: {
        args: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
        msg: 'El color solo puede contener letras y espacios'
      }
    }
  }
}, {
  tableName: 'PRODUCTOS',
  timestamps: false
});

// ========== MODELO CATEGORIAS ==========
const Categoria = sequelize.define('Categoria', {
  id_categoria: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tipo_categoria: {
    type: DataTypes.ENUM('MONTURAS', 'ACCESORIOS', 'GAFAS DE SOL'),
    allowNull: false,
    validate: {
      notNull: { msg: 'El tipo de categoría es requerido' },
      isIn: {
        args: [['MONTURAS', 'ACCESORIOS', 'GAFAS DE SOL']],
        msg: 'Tipo de categoría inválido. Debe ser: MONTURAS, ACCESORIOS o GAFAS DE SOL'
      }
    }
  },
  descripcion: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notNull: { msg: 'La descripción es requerida' },
      notEmpty: { msg: 'La descripción es requerida' },
      len: { args: [2, 200], msg: 'La descripción debe tener entre 2 y 200 caracteres' }
    }
  }
}, {
  tableName: 'CATEGORIAS',
  timestamps: false
});

const INCLUDE_CATEGORIA = [{ model: Categoria, as: 'categoria' }];

// ========== RELACIONES ==========
Producto.belongsTo(Categoria, {
  foreignKey: 'id_categoria',
  as: 'categoria'
});

Categoria.hasMany(Producto, {
  foreignKey: 'id_categoria',
  as: 'productos'
});

// ========== MÉTODOS DEL INVENTARIO ==========
const Inventario = {
  // ========== PRODUCTOS ==========

  getAll: async () => {
    const productos = await Producto.findAll({
      include: INCLUDE_CATEGORIA,
      order: [['id_producto', 'DESC']]
    });
    return productos.map(formatearProducto);
  },

  getDestacados: async () => {
    const productos = await Producto.findAll({
      include: INCLUDE_CATEGORIA,
      order: [['id_producto', 'DESC']],
      limit: 6
    });
    return productos.map(formatearProductoSimple);
  },

  findById: async (id) => {
    const producto = await Producto.findByPk(id, {
      include: INCLUDE_CATEGORIA
    });
    if (!producto) return null;
    return formatearProducto(producto);
  },

  filtrar: async (filtros) => {
    const where = {};

    // Precio min/max (sin duplicar la asignación)
    const precioRange = {};
    if (filtros.precio_min !== undefined && filtros.precio_min !== null) {
      precioRange[Op.gte] = Number(filtros.precio_min);
    }
    if (filtros.precio_max !== undefined && filtros.precio_max !== null) {
      precioRange[Op.lte] = Number(filtros.precio_max);
    }
    if (Object.keys(precioRange).length > 0) {
      where.precio = precioRange;
    }

    if (filtros.marca)        where.marca = filtros.marca;
    if (filtros.color)        where.color = filtros.color;
    if (filtros.material)     where.material = filtros.material;
    if (filtros.id_categoria) where.id_categoria = parseInt(filtros.id_categoria);

    if (filtros.busqueda) {
      where[Op.or] = [
        { nombre:      { [Op.like]: `%${filtros.busqueda}%` } },
        { marca:       { [Op.like]: `%${filtros.busqueda}%` } },
        { descripcion: { [Op.like]: `%${filtros.busqueda}%` } }
      ];
    }

    const productos = await Producto.findAll({
      where,
      include: INCLUDE_CATEGORIA,
      order: [['id_producto', 'DESC']]
    });
    return productos.map(formatearProductoSimple);
  },

  buscar: async (termino) => {
    const search = `%${termino}%`;
    const productos = await Producto.findAll({
      where: {
        [Op.or]: [
          { nombre:      { [Op.like]: search } },
          { marca:       { [Op.like]: search } },
          { descripcion: { [Op.like]: search } }
        ]
      },
      include: INCLUDE_CATEGORIA,
      order: [['id_producto', 'DESC']]
    });
    return productos.map(formatearProductoSimple);
  },

  getByCategoria: async (id_categoria) => {
    const productos = await Producto.findAll({
      where: { id_categoria: parseInt(id_categoria) },
      include: INCLUDE_CATEGORIA,
      order: [['id_producto', 'DESC']]
    });
    return productos.map(formatearProductoSimple);
  },

  getByMarca: async (marca) => {
    const productos = await Producto.findAll({
      where: { marca },
      include: INCLUDE_CATEGORIA,
      order: [['id_producto', 'DESC']]
    });
    return productos.map(formatearProductoSimple);
  },

  getMarcas: async () => {
    const marcas = await sequelize.query(
      `SELECT DISTINCT marca FROM PRODUCTOS WHERE marca IS NOT NULL AND marca != '' ORDER BY marca ASC`,
      { type: sequelize.QueryTypes.SELECT }
    );
    return marcas.map(item => item.marca);
  },

  getColores: async () => {
    const colores = await sequelize.query(
      `SELECT DISTINCT color FROM PRODUCTOS WHERE color IS NOT NULL AND color != '' ORDER BY color ASC`,
      { type: sequelize.QueryTypes.SELECT }
    );
    return colores.map(item => item.color);
  },

  create: async (data) => {
    const { id_categoria, nombre, descripcion, marca, precio, imagen, material, color } = data;

    const producto = await Producto.create({
      id_categoria,
      nombre,
      descripcion: descripcion || '',
      marca: marca || '',
      precio,
      imagen: imagen || '',
      material: material || '',
      color: color || ''
    });

    return { insertId: producto.id_producto };
  },

  update: async (id, data) => {
    const { id_categoria, nombre, descripcion, marca, precio, imagen, material, color } = data;

    const producto = await Producto.findByPk(id);
    if (!producto) throw new Error('Producto no encontrado');

    await producto.update({
      id_categoria: id_categoria || producto.id_categoria,
      nombre: nombre || producto.nombre,
      descripcion: descripcion !== undefined ? descripcion : producto.descripcion,
      marca: marca !== undefined ? marca : producto.marca,
      precio: precio !== undefined ? precio : producto.precio,
      imagen: imagen !== undefined ? imagen : producto.imagen,
      material: material !== undefined ? material : producto.material,
      color: color !== undefined ? color : producto.color
    });

    return { affectedRows: 1 };
  },

  delete: async (id) => {
    const producto = await Producto.findByPk(id);
    if (!producto) throw new Error('Producto no encontrado');

    await producto.destroy();
    return { affectedRows: 1 };
  },

  // ========== CATEGORIAS ==========

  getCategorias: async () => {
    const categorias = await Categoria.findAll({
      order: [['tipo_categoria', 'ASC']],
      attributes: ['tipo_categoria']
    });
    return categorias.map(c => c.tipo_categoria);
  }
};

export default Inventario;
