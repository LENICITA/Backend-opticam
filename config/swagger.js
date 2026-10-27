// config/swagger.js
import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Óptica Balamb API',
      version: '1.0.0',
      description:
        'Documentación de la API del sistema Óptica Balamb. Incluye autenticación, usuarios, inventario, fórmulas, pedidos, pagos, reportes y chatbot.',
      contact: {
        name: 'Equipo Balamb',
        email: 'opticavirtualbalamb@gmail.com'
      }
    },
    servers: [
      { url: 'http://localhost:5000', description: 'Servidor local' },
      { url: 'http://192.168.0.4:5000', description: 'Servidor red local' }
    ],
    tags: [
      { name: 'Auth', description: 'Autenticación y recuperación de contraseña' },
      { name: 'Usuarios', description: 'Perfil y registro de clientes' },
      { name: 'Repartidores', description: 'Gestión de repartidores (admin)' },
      { name: 'ChatBot', description: 'Chatbot de atención al cliente' },
      { name: 'Contacto', description: 'Formulario de contacto' },
      { name: 'Inventario', description: 'Consulta pública de productos' },
      { name: 'Inventario (Admin)', description: 'CRUD de productos (admin)' },
      { name: 'Fórmulas', description: 'Fórmulas médicas del cliente' },
      { name: 'Fórmulas (Admin)', description: 'Gestión de fórmulas (admin)' },
      { name: 'Pedidos', description: 'Pedidos del cliente' },
      { name: 'Pedidos (Admin)', description: 'Gestión de pedidos (admin)' },
      { name: 'Pagos', description: 'Pagos con Bold' },
      { name: 'Pagos (Webhook)', description: 'Webhooks de Bold' },
      { name: 'Reportes', description: 'Reportes y estadísticas (admin)' },
      { name: 'Distribuciones', description: 'Distribuciones y entregas (repartidor)' },
      { name: 'Distribuciones (Admin)', description: 'Gestión de distribuciones (admin)' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtenido en POST /api/auth/login'
        }
      },
      schemas: {
        // ============ GENÉRICOS ============
        MensajeExito: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operación exitosa' }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Error en la solicitud' },
            errores: {
              type: 'array',
              items: { type: 'string' },
              nullable: true
            }
          }
        },

        // ============ AUTH / USUARIOS ============
        LoginRequest: {
          type: 'object',
          required: ['email', 'contrasena'],
          properties: {
            email: { type: 'string', format: 'email', example: 'usuario@correo.com' },
            contrasena: { type: 'string', minLength: 8, example: 'MiClave123' }
          }
        },
        UsuarioBasico: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            nombre_completo: { type: 'string', example: 'Juan Pérez' },
            email: { type: 'string', format: 'email', example: 'juan@correo.com' },
            telefono: { type: 'string', example: '3001234567' },
            ciudad: { type: 'string', example: 'Bogotá' },
            roles: {
              type: 'array',
              items: { type: 'string' },
              example: ['CLIENTE']
            }
          }
        },
        UsuarioConEstado: {
          allOf: [
            { $ref: '#/components/schemas/UsuarioBasico' },
            {
              type: 'object',
              properties: {
                estado: {
                  type: 'string',
                  enum: ['ACTIVO', 'INACTIVO', 'SUSPENDIDO'],
                  example: 'ACTIVO'
                }
              }
            }
          ]
        },
        UsuarioPerfil: {
          type: 'object',
          properties: {
            id_usuario: { type: 'integer', example: 1 },
            nombre_completo: { type: 'string', example: 'Juan Pérez' },
            email: { type: 'string', format: 'email', example: 'juan@correo.com' },
            telefono: { type: 'string', example: '3001234567' },
            direccion: { type: 'string', example: 'Cra 10 #20-30' },
            ciudad: { type: 'string', example: 'Bogotá' },
            documento: { type: 'integer', example: 1234567890 },
            fecha_nacimiento: { type: 'string', format: 'date', example: '1990-05-14' },
            estado: {
              type: 'string',
              enum: ['ACTIVO', 'INACTIVO', 'SUSPENDIDO'],
              example: 'ACTIVO'
            },
            roles: {
              type: 'array',
              items: { type: 'string' },
              example: ['CLIENTE']
            },
            vehiculo: { $ref: '#/components/schemas/Vehiculo' }
          }
        },
        Vehiculo: {
          type: 'object',
          nullable: true,
          properties: {
            id_vehiculo: { type: 'integer', example: 1 },
            tipo: { type: 'string', enum: ['CARRO', 'MOTO'], example: 'MOTO' },
            modelo: { type: 'string', example: 'AKT 125' },
            placa: { type: 'string', example: 'ABC12D' },
            color: { type: 'string', example: 'Rojo' }
          }
        },
        UsuarioConVehiculo: {
          allOf: [{ $ref: '#/components/schemas/UsuarioPerfil' }]
        },
        RegistroClienteRequest: {
          type: 'object',
          required: [
            'nombre_completo', 'telefono', 'fecha_nacimiento', 'documento',
            'ciudad', 'direccion', 'email', 'contrasena'
          ],
          properties: {
            nombre_completo: { type: 'string', example: 'Juan Pérez' },
            telefono: { type: 'string', pattern: '^3\\d{9}$', example: '3001234567' },
            fecha_nacimiento: { type: 'string', format: 'date', example: '1990-05-14' },
            documento: { type: 'integer', example: 1234567890 },
            ciudad: { type: 'string', example: 'Bogotá' },
            direccion: { type: 'string', example: 'Cra 10 #20-30' },
            email: { type: 'string', format: 'email', example: 'juan@correo.com' },
            contrasena: { type: 'string', minLength: 8, example: 'MiClave123' }
          }
        },
        ActualizarPerfilRequest: {
          type: 'object',
          properties: {
            nombre_completo: { type: 'string' },
            telefono: { type: 'string', pattern: '^3\\d{9}$' },
            direccion: { type: 'string' },
            ciudad: { type: 'string' },
            email: { type: 'string', format: 'email' },
            fecha_nacimiento: { type: 'string', format: 'date' },
            documento: { type: 'integer' }
          }
        },
        RegistroRepartidorRequest: {
          allOf: [
            { $ref: '#/components/schemas/RegistroClienteRequest' },
            {
              type: 'object',
              required: ['vehiculo'],
              properties: {
                vehiculo: {
                  type: 'object',
                  required: ['tipo', 'modelo', 'placa', 'color'],
                  properties: {
                    tipo: { type: 'string', enum: ['CARRO', 'MOTO'] },
                    modelo: { type: 'string' },
                    placa: { type: 'string' },
                    color: { type: 'string' }
                  }
                }
              }
            }
          ]
        },
        ActualizarRepartidorRequest: {
          type: 'object',
          properties: {
            nombre_completo: { type: 'string' },
            telefono: { type: 'string' },
            fecha_nacimiento: { type: 'string', format: 'date' },
            documento: { type: 'integer' },
            ciudad: { type: 'string' },
            direccion: { type: 'string' },
            email: { type: 'string', format: 'email' },
            estado: { type: 'string', enum: ['ACTIVO', 'INACTIVO', 'SUSPENDIDO'] },
            vehiculo: {
              type: 'object',
              properties: {
                tipo: { type: 'string', enum: ['CARRO', 'MOTO'] },
                modelo: { type: 'string' },
                placa: { type: 'string' },
                color: { type: 'string' }
              }
            }
          }
        },

        // ============ PRODUCTOS / INVENTARIO ============
        Producto: {
          type: 'object',
          properties: {
            id_producto: { type: 'integer', example: 1 },
            id_categoria: { type: 'integer', example: 1 },
            nombre: { type: 'string', example: 'Montura Elegance' },
            descripcion: { type: 'string', example: 'Montura moderna de alta calidad' },
            marca: { type: 'string', example: 'Rayban' },
            precio: { type: 'number', example: 250000 },
            imagen: { type: 'string', example: 'https://res.cloudinary.com/...' },
            imagen_url: { type: 'string', example: 'https://res.cloudinary.com/.../w_400,h_400/...' },
            imagen_thumbnail: { type: 'string', example: 'https://res.cloudinary.com/.../w_100,h_100/...' },
            material: { type: 'string', example: 'Policarbonato' },
            color: { type: 'string', example: 'Negro' },
            tipo_categoria: {
              type: 'string',
              enum: ['MONTURAS', 'ACCESORIOS', 'GAFAS DE SOL'],
              example: 'MONTURAS'
            },
            categoria_descripcion: { type: 'string', example: 'Monturas de sol y vista' }
          }
        },

        // ============ FÓRMULAS ============
        Formula: {
          type: 'object',
          properties: {
            id_formula: { type: 'integer', example: 1 },
            id_usuario: { type: 'integer', example: 3 },
            condicion: {
              type: 'string',
              enum: ['DALTONISMO', 'ASTIGMATISMO', 'MIOPIA', 'BAJA VISION'],
              example: 'MIOPIA'
            },
            imagen_formula: { type: 'string', example: 'https://res.cloudinary.com/...' },
            imagen_url: { type: 'string', example: 'https://res.cloudinary.com/.../w_400,h_400/...' },
            observaciones: { type: 'string', example: 'Fórmula actualizada' },
            fecha_creacion: { type: 'string', format: 'date-time' },
            costo: { type: 'number', example: 150000 },
            estado: {
              type: 'string',
              enum: ['Pendiente', 'Aprobado', 'Rechazado'],
              example: 'Pendiente'
            }
          }
        },
        FormulaConCliente: {
          allOf: [
            { $ref: '#/components/schemas/Formula' },
            {
              type: 'object',
              properties: {
                nombre_completo: { type: 'string', example: 'Juan Pérez' },
                email: { type: 'string', format: 'email' },
                telefono: { type: 'string' }
              }
            }
          ]
        },

        // ============ PEDIDOS ============
        Pedido: {
          type: 'object',
          properties: {
            id_pedido: { type: 'integer', example: 1 },
            id_usuario: { type: 'integer', example: 3 },
            id_formula: { type: 'integer', nullable: true, example: 5 },
            fecha_pedido: { type: 'string', format: 'date-time' },
            fecha_estimada: { type: 'string', format: 'date', example: '2026-09-25' },
            direccion_entrega: { type: 'string', example: 'Cra 10 #20-30' },
            ciudad_envio: { type: 'string', example: 'Bogotá' },
            estado: {
              type: 'string',
              enum: [
                'Pendiente', 'Abonado', 'Listo', 'Pagado',
                'En Proceso', 'Enviado', 'Entregado', 'Cancelado'
              ],
              example: 'Pendiente'
            },
            costo_envio: { type: 'number', example: 10000 },
            total: { type: 'number', example: 350000 }
          }
        },
        CrearPedidoRequest: {
          type: 'object',
          required: ['direccion_entrega', 'ciudad_envio', 'productos'],
          properties: {
            id_formula: { type: 'integer', nullable: true, example: 5 },
            direccion_entrega: {
              type: 'string', minLength: 5, maxLength: 45,
              example: 'Cra 10 #20-30'
            },
            ciudad_envio: { type: 'string', example: 'Bogotá' },
            productos: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                required: ['id_producto', 'cantidad'],
                properties: {
                  id_producto: { type: 'integer', example: 1 },
                  cantidad: { type: 'integer', minimum: 1, example: 2 }
                }
              }
            }
          }
        },
        PedidoCreado: {
          type: 'object',
          properties: {
            id_pedido: { type: 'integer', example: 1 },
            fecha_pedido: { type: 'string', format: 'date-time' },
            fecha_estimada: { type: 'string', format: 'date' },
            subtotal: { type: 'number', example: 200000 },
            costo_formula: { type: 'number', example: 100000 },
            costo_envio: { type: 'number', example: 0 },
            total: { type: 'number', example: 300000 },
            estado: { type: 'string', example: 'Pendiente' },
            direccion_entrega: { type: 'string' },
            ciudad_envio: { type: 'string' },
            formula: {
              type: 'object',
              nullable: true,
              properties: {
                id_formula: { type: 'integer' },
                condicion: { type: 'string' },
                imagen_formula: { type: 'string' },
                observaciones: { type: 'string' },
                costo: { type: 'number' }
              }
            }
          }
        },
        PedidoDetalle: {
          type: 'object',
          properties: {
            id_pedido: { type: 'integer' },
            fecha_pedido: { type: 'string', format: 'date-time' },
            fecha_estimada: { type: 'string', format: 'date' },
            estado: { type: 'string' },
            direccion_entrega: { type: 'string' },
            ciudad_envio: { type: 'string' },
            costo_envio: { type: 'number' },
            total: { type: 'number' },
            cliente: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                nombre: { type: 'string' },
                email: { type: 'string', format: 'email' },
                telefono: { type: 'string' },
                direccion: { type: 'string' },
                ciudad: { type: 'string' }
              }
            },
            formula: {
              type: 'object',
              nullable: true,
              properties: {
                id_formula: { type: 'integer' },
                condicion: { type: 'string' },
                imagen_formula: { type: 'string' },
                observaciones: { type: 'string' },
                costo: { type: 'number' }
              }
            }
          }
        },
        ProductoEnPedido: {
          type: 'object',
          properties: {
            id_producto: { type: 'integer' },
            nombre: { type: 'string' },
            marca: { type: 'string' },
            precio: { type: 'number' },
            imagen: { type: 'string' },
            color: { type: 'string' },
            material: { type: 'string' },
            cant_productos: { type: 'integer', example: 2 },
            tipo_categoria: { type: 'string' }
          }
        },
        PedidoConProductos: {
          allOf: [
            { $ref: '#/components/schemas/Pedido' },
            {
              type: 'object',
              properties: {
                total_productos: { type: 'integer', example: 3 },
                productos: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/ProductoEnPedido' }
                }
              }
            }
          ]
        },
        PedidoConCliente: {
          allOf: [
            { $ref: '#/components/schemas/Pedido' },
            {
              type: 'object',
              properties: {
                cliente: { type: 'string', example: 'Juan Pérez' },
                email: { type: 'string', format: 'email' },
                telefono: { type: 'string' },
                ciudad: { type: 'string' },
                condicion: { type: 'string', nullable: true },
                imagen_formula: { type: 'string', nullable: true },
                costo_formula: { type: 'number', nullable: true },
                repartidor_nombre: { type: 'string', nullable: true }
              }
            }
          ]
        },

        // ============ PAGOS ============
        Pago: {
          type: 'object',
          properties: {
            id_pago: { type: 'integer', example: 12 },
            id_pedido: { type: 'integer', example: 1 },
            fecha_pago: { type: 'string', format: 'date-time' },
            eleccion_pago: { type: 'string', enum: ['50%', '100%'], example: '50%' },
            canal_pago: { type: 'string', enum: ['Bold'], example: 'Bold' },
            monto: { type: 'number', example: 175000 },
            estado: {
              type: 'string',
              enum: ['Pendiente', 'Confirmado', 'Rechazado'],
              example: 'Confirmado'
            },
            bold_reference: { type: 'string', nullable: true, example: 'LNK_1234567890' },
            bold_payment_id: { type: 'string', nullable: true, example: 'PAY_0987654321' },
            bold_link: { type: 'string', nullable: true, example: 'https://checkout.bold.co/...' }
          }
        },
        CrearPagoRequest: {
          type: 'object',
          required: ['id_pedido', 'eleccion_pago', 'monto'],
          properties: {
            id_pedido: { type: 'integer', example: 1 },
            eleccion_pago: { type: 'string', enum: ['50%', '100%'], example: '50%' },
            canal_pago: { type: 'string', enum: ['Bold'], default: 'Bold' },
            monto: { type: 'number', minimum: 0.01, example: 175000 }
          }
        },

        // ============ DISTRIBUCIONES ============
        Distribucion: {
          type: 'object',
          properties: {
            id_distribucion: { type: 'integer', example: 1 },
            id_pedido: { type: 'integer', example: 10 },
            id_usuario: { type: 'integer', example: 5 },
            estado: {
              type: 'string',
              enum: ['PENDIENTE', 'EN_ENTREGA', 'ENTREGADO', 'CANCELADO'],
              example: 'PENDIENTE'
            },
            fecha_asignacion: { type: 'string', format: 'date-time' },
            fecha_entrega: { type: 'string', format: 'date-time', nullable: true },
            observaciones: { type: 'string', nullable: true, example: 'ENTREGA EN BOGOTÁ - REPARTIDOR' }
          }
        },
        DistribucionConCliente: {
          type: 'object',
          properties: {
            id_distribucion: { type: 'integer', example: 1 },
            estado: {
              type: 'string',
              enum: ['PENDIENTE', 'EN_ENTREGA', 'ENTREGADO', 'CANCELADO']
            },
            fecha_asignacion: { type: 'string', format: 'date-time' },
            pedido: {
              type: 'object',
              nullable: true,
              properties: {
                id_pedido: { type: 'integer' },
                direccion_entrega: { type: 'string' },
                ciudad_envio: { type: 'string' },
                total: { type: 'number' },
                fecha_estimada: { type: 'string', format: 'date', nullable: true },
                cliente: {
                  type: 'object',
                  nullable: true,
                  properties: {
                    nombre: { type: 'string' },
                    telefono: { type: 'string' },
                    ciudad: { type: 'string' }
                  }
                }
              }
            }
          }
        },
        DistribucionConDetalles: {
          type: 'object',
          properties: {
            id_distribucion: { type: 'integer' },
            estado: { type: 'string', enum: ['PENDIENTE', 'EN_ENTREGA', 'ENTREGADO', 'CANCELADO'] },
            fecha_asignacion: { type: 'string', format: 'date-time' },
            fecha_entrega: { type: 'string', format: 'date-time', nullable: true },
            observaciones: { type: 'string', nullable: true },
            pedido: {
              type: 'object',
              properties: {
                id_pedido: { type: 'integer' },
                direccion_entrega: { type: 'string' },
                ciudad_envio: { type: 'string' },
                total: { type: 'number' },
                fecha_estimada: { type: 'string', format: 'date', nullable: true },
                cliente: {
                  type: 'object',
                  nullable: true,
                  properties: {
                    nombre: { type: 'string' },
                    telefono: { type: 'string' },
                    email: { type: 'string', format: 'email' },
                    ciudad: { type: 'string' }
                  }
                }
              }
            },
            repartidor: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'integer' },
                nombre: { type: 'string' },
                email: { type: 'string', format: 'email' },
                telefono: { type: 'string' },
                vehiculo: { type: 'string', example: 'MOTO AKT 125 - Placa: ABC12D' }
              }
            },
            cliente: {
              type: 'object',
              nullable: true,
              description: 'Presente en /mis-distribuciones',
              properties: {
                id: { type: 'integer' },
                nombre: { type: 'string' },
                email: { type: 'string', format: 'email' },
                telefono: { type: 'string' },
                ciudad: { type: 'string' }
              }
            },
            repartidor_asignado: {
              type: 'object',
              description: 'Presente en /mis-distribuciones',
              properties: {
                id: { type: 'integer' },
                nombre: { type: 'string' },
                email: { type: 'string', format: 'email' },
                telefono: { type: 'string' },
                rol: { type: 'string', example: 'REPARTIDOR' },
                vehiculo: { $ref: '#/components/schemas/Vehiculo' }
              }
            },
            tipo_asignacion: {
              type: 'string',
              enum: ['BOGOTÁ', 'EXTERNA', 'DESCONOCIDA'],
              description: 'Presente en /mis-distribuciones'
            }
          }
        },
        DistribucionDetalle: {
          type: 'object',
          properties: {
            id_distribucion: { type: 'integer' },
            estado: { type: 'string', enum: ['PENDIENTE', 'EN_ENTREGA', 'ENTREGADO', 'CANCELADO'] },
            fecha_asignacion: { type: 'string', format: 'date-time' },
            fecha_entrega: { type: 'string', format: 'date-time', nullable: true },
            observaciones: { type: 'string', nullable: true },
            pedido: {
              type: 'object',
              nullable: true,
              properties: {
                id_pedido: { type: 'integer' },
                direccion_entrega: { type: 'string' },
                ciudad_envio: { type: 'string' },
                total: { type: 'number' },
                fecha_estimada: { type: 'string', format: 'date' },
                cliente: {
                  type: 'object',
                  nullable: true,
                  properties: {
                    nombre: { type: 'string' },
                    telefono: { type: 'string' },
                    email: { type: 'string', format: 'email' },
                    ciudad: { type: 'string' }
                  }
                }
              }
            },
            repartidor: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'integer' },
                nombre: { type: 'string' },
                email: { type: 'string', format: 'email' },
                telefono: { type: 'string' },
                vehiculo: { type: 'string', example: 'MOTO AKT 125 - Placa: ABC12D' }
              }
            }
          }
        }

      }
    }
  },
  apis: ['./routes/*.js']
};

export default swaggerJsdoc(options);