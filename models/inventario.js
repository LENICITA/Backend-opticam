import { DataTypes, Op } from 'sequelize';
import sequelize from '../config/database.js';

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

  // Obtener todos los productos con JOIN a categorías
  getAll: async () => {
    try {
      const productos = await Producto.findAll({
        include: [{
          model: Categoria,
          as: 'categoria'
        }],
        order: [['id_producto', 'DESC']]
      });

      // Formatear para mantener la misma estructura que antes
      return productos.map(p => ({
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
      }));
    } catch (error) {
      throw error;
    }
  },

  // Obtener productos destacados (últimos 6)
  getDestacados: async () => {
    try {
      const productos = await Producto.findAll({
        include: [{
          model: Categoria,
          as: 'categoria'
        }],
        order: [['id_producto', 'DESC']],
        limit: 6
      });

      return productos.map(p => ({
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
      }));
    } catch (error) {
      throw error;
    }
  },

  // Obtener producto por ID
  findById: async (id) => {
    try {
      const producto = await Producto.findByPk(id, {
        include: [{
          model: Categoria,
          as: 'categoria'
        }]
      });

      if (!producto) return null;

      return {
        id_producto: producto.id_producto,
        id_categoria: producto.id_categoria,
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        marca: producto.marca,
        precio: producto.precio,
        imagen: producto.imagen,
        material: producto.material,
        color: producto.color,
        tipo_categoria: producto.categoria?.tipo_categoria,
        categoria_descripcion: producto.categoria?.descripcion
      };
    } catch (error) {
      throw error;
    }
  },

  // Filtrar productos por precio, marca, color, material
  filtrar: async (filtros) => {
    try {
      const where = {};

      if (filtros.precio_min !== undefined && filtros.precio_min !== null) {
      where.precio = { 
        [Op.gte]: sequelize.literal(Number(filtros.precio_min)) 
      };
    }
    if (filtros.precio_max !== undefined && filtros.precio_max !== null) {
      where.precio = { 
        ...where.precio, 
        [Op.lte]: sequelize.literal(Number(filtros.precio_max)) 
      };
    }
      if (filtros.marca) {
        where.marca = filtros.marca;
      }
      if (filtros.color) {
        where.color = filtros.color;
      }
      if (filtros.material) {
        where.material = filtros.material;
      }
      if (filtros.id_categoria) {
        where.id_categoria = parseInt(filtros.id_categoria);
      }
      if (filtros.busqueda) {
        where[Op.or] = [
          { nombre: { [Op.like]: `%${filtros.busqueda}%` } },
          { marca: { [Op.like]: `%${filtros.busqueda}%` } },
          { descripcion: { [Op.like]: `%${filtros.busqueda}%` } }
        ];
      }

      const productos = await Producto.findAll({
        where,
        include: [{
          model: Categoria,
          as: 'categoria'
        }],
        order: [['id_producto', 'DESC']]
      });

      return productos.map(p => ({
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
      }));
    } catch (error) {
      throw error;
    }
  },

  // Buscar productos por nombre o marca (búsqueda rápida)
  buscar: async (termino) => {
    try {
      const search = `%${termino}%`;
      const productos = await Producto.findAll({
        where: {
          [Op.or]: [
            { nombre: { [Op.like]: search } },
            { marca: { [Op.like]: search } },
            { descripcion: { [Op.like]: search } }
          ]
        },
        include: [{
          model: Categoria,
          as: 'categoria'
        }],
        order: [['id_producto', 'DESC']]
      });

      return productos.map(p => ({
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
      }));
    } catch (error) {
      throw error;
    }
  },

  // Obtener productos por categoría
  getByCategoria: async (id_categoria) => {
    try {
      const productos = await Producto.findAll({
        where: { id_categoria: parseInt(id_categoria) },
        include: [{
          model: Categoria,
          as: 'categoria'
        }],
        order: [['id_producto', 'DESC']]
      });

      return productos.map(p => ({
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
      }));
    } catch (error) {
      throw error;
    }
  },

  // Obtener productos por marca
  getByMarca: async (marca) => {
    try {
      const productos = await Producto.findAll({
        where: { marca },
        include: [{
          model: Categoria,
          as: 'categoria'
        }],
        order: [['id_producto', 'DESC']]
      });

      return productos.map(p => ({
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
      }));
    } catch (error) {
      throw error;
    }
  },

  // Obtener todas las marcas únicas
  getMarcas: async () => {
  try {
    const marcas = await sequelize.query(
      `SELECT DISTINCT marca FROM PRODUCTOS WHERE marca IS NOT NULL AND marca != '' ORDER BY marca ASC`,
      { type: sequelize.QueryTypes.SELECT }
    );
    return marcas.map(item => item.marca);
  } catch (error) {
    throw error;
  }
},

  // Obtener todos los colores únicos
  getColores: async () => {
  try {
    const colores = await sequelize.query(
      `SELECT DISTINCT color FROM PRODUCTOS WHERE color IS NOT NULL AND color != '' ORDER BY color ASC`,
      { type: sequelize.QueryTypes.SELECT }
    );
    return colores.map(item => item.color);
  } catch (error) {
    throw error;
  }
},

  // Crear producto
  create: async (data) => {
    try {
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
    } catch (error) {
      throw error;
    }
  },

  // Actualizar producto
  update: async (id, data) => {
    try {
      const { id_categoria, nombre, descripcion, marca, precio, imagen, material, color } = data;
      
      const producto = await Producto.findByPk(id);
      
      if (!producto) {
        throw new Error('Producto no encontrado');
      }

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
    } catch (error) {
      throw error;
    }
  },

  // Eliminar producto
  delete: async (id) => {
    try {
      const producto = await Producto.findByPk(id);
      
      if (!producto) {
        throw new Error('Producto no encontrado');
      }

      await producto.destroy();
      return { affectedRows: 1 };
    } catch (error) {
      throw error;
    }
  },

  // ========== CATEGORIAS ==========

  // Obtener todas las categorías
  getCategorias: async () => {
    try {
      const categorias = await Categoria.findAll({
        order: [['tipo_categoria', 'ASC']],
        attributes: ['tipo_categoria']
      });

      return categorias.map(c => c.tipo_categoria);
  } catch (error) {
    throw error;
    }
  }
};

export default Inventario;