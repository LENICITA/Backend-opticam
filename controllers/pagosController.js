// src/controllers/pagosController.js
import PagoModel from '../models/pagoModel.js';
import sequelize from '../config/database.js';
import { boldClient } from '../config/bold.js';

const esDesarrollo = process.env.NODE_ENV === 'development' || process.env.BOLD_MODO === 'TEST';

const BACKEND_PUBLIC_URL = process.env.BACKEND_PUBLIC_URL || 'https://TU-SUBDOMINIO.ngrok-free.app';

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

const validarId = (id) => {
  if (id === undefined || id === null || id === '') return false;
  const num = Number(id);
  return !isNaN(num) && num > 0 && Number.isInteger(num);
};

const validarEleccionPago = (eleccion) => {
  return ['50%', '100%'].includes(eleccion);
};

const validarMonto = (monto) => {
  if (monto === undefined || monto === null || monto === '') return false;
  const num = Number(monto);
  return !isNaN(num) && num > 0;
};

// ========== OBTENER PAGOS POR PEDIDO ==========
export const obtenerPagosPorPedido = async (req, res) => {
  try {
    const { pedidoId } = req.params;

    if (!validarId(pedidoId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de pedido inválido'
      });
    }

    const pagos = await PagoModel.obtenerPorPedido(pedidoId);
    const totalPagado = await PagoModel.obtenerTotalPagado(pedidoId);
    const tieneCompleto = await PagoModel.tienePagoCompletoPorSuma(pedidoId);

    res.json({
      success: true,
      count: pagos.length,
      total_pagado: totalPagado,
      pagado_completo: tieneCompleto,
      data: pagos
    });
  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// ========== CREAR PAGO (CLIENTE) ==========
export const crearPago = async (req, res) => {
  try {
    const { id_pedido, eleccion_pago, canal_pago = 'Bold', monto } = req.body;
    const usuario = req.user;

    // Validar campos requeridos
    if (!id_pedido || !eleccion_pago || !monto) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: id_pedido, eleccion_pago, monto'
      });
    }

    if (!validarId(id_pedido)) {
      return res.status(400).json({
        success: false,
        message: 'El ID del pedido debe ser un número válido'
      });
    }

    if (!validarEleccionPago(eleccion_pago)) {
      return res.status(400).json({
        success: false,
        message: 'eleccion_pago debe ser 50% o 100%'
      });
    }

    if (!validarMonto(monto)) {
      return res.status(400).json({
        success: false,
        message: 'El monto debe ser un número mayor a 0'
      });
    }

    // Verificar que el pedido existe
    const [pedido] = await sequelize.query(
      'SELECT * FROM PEDIDOS WHERE id_pedido = ?',
      { replacements: [id_pedido], type: sequelize.QueryTypes.SELECT }
    );

    if (!pedido) {
      return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
    }

    // VERIFICAR QUE EL PEDIDO PERTENEZCA AL USUARIO
    if (pedido.id_usuario !== usuario.id) {
      return res.status(403).json({
        success: false,
        message: 'No puedes pagar un pedido que no te pertenece'
      });
    }

    // Verificar que el monto no exceda el total del pedido
    if (monto > pedido.total) {
      return res.status(400).json({
        success: false,
        message: `El monto no puede exceder el total del pedido (${pedido.total})`
      });
    }

    // Verificar el estado del pedido
    if (pedido.estado === 'Pagado') {
      return res.status(400).json({
        success: false,
        message: 'Este pedido ya está pagado completamente'
      });
    }

    // ===== LÓGICA PARA 50% =====
    if (eleccion_pago === '50%') {
      const totalPagado = await PagoModel.obtenerTotalPagado(id_pedido);
      const saldoRestante = pedido.total - totalPagado;

      const tieneAbono = await PagoModel.tieneAbono50(id_pedido);

      if (tieneAbono) {
        if (pedido.estado !== 'Abonado') {
          return res.status(400).json({
            success: false,
            message: 'El pedido debe estar en estado ABONADO para pagar el saldo restante'
          });
        }

        if (monto < saldoRestante) {
          return res.status(400).json({
            success: false,
            message: `El saldo restante es ${saldoRestante}. Debes pagar esa cantidad para completar el pago`
          });
        }
      } else {
        const tieneCompleto = await PagoModel.tienePagoCompleto(id_pedido);
        if (tieneCompleto) {
          return res.status(400).json({
            success: false,
            message: 'Este pedido ya fue pagado completamente'
          });
        }

        const monto50Esperado = pedido.total / 2;
        const margenError = 100;
        if (Math.abs(monto - monto50Esperado) > margenError) {
          return res.status(400).json({
            success: false,
            message: `El monto debe ser aproximadamente el 50% del total (${monto50Esperado})`
          });
        }
      }
    }

    // ===== LÓGICA PARA 100% =====
    if (eleccion_pago === '100%') {
      const totalPagado = await PagoModel.obtenerTotalPagado(id_pedido);
      const saldoRestante = pedido.total - totalPagado;

      const tieneCompleto = await PagoModel.tienePagoCompleto(id_pedido);
      if (tieneCompleto) {
        return res.status(400).json({
          success: false,
          message: 'Este pedido ya fue pagado completamente'
        });
      }

      const tieneAbono = await PagoModel.tieneAbono50(id_pedido);
      if (tieneAbono) {
        if (monto < saldoRestante) {
          return res.status(400).json({
            success: false,
            message: `El saldo restante es ${saldoRestante}. Debes pagar esa cantidad para completar`
          });
        }
      } else {
        if (Math.abs(monto - pedido.total) > 100) {
          return res.status(400).json({
            success: false,
            message: `El monto debe ser el total del pedido (${pedido.total}) para pago completo`
          });
        }
      }
    }

    // ==========================================
    //  SIMULAR PAGO
    // ==========================================
    if (esDesarrollo) {

      const bold_link = `https://bold.co/demo/pago-${id_pedido}-${Date.now()}`;
      const payment_link = `LNK_DEMO_${Date.now()}`;

      const nuevoId = await PagoModel.crear({
        id_pedido,
        eleccion_pago,
        canal_pago,
        monto,
        bold_reference: payment_link,
        bold_link: bold_link
      });

      setTimeout(async () => {
        try {
          await PagoModel.confirmarPago(nuevoId);
          console.log(` Pago #${nuevoId} auto-confirmado (simulado)`);
        } catch (err) {
          console.error(' Error auto-confirmando pago:', err);
        }
      }, 2000);

      return res.status(201).json({
        success: true,
        message: 'Link de pago generado exitosamente (MODO SIMULADO)',
        data: {
          id_pago: nuevoId,
          bold_link: bold_link,
          bold_reference: payment_link,
          simulado: true
        }
      });
    }

    // ==========================================
    // CONEXIÓN REAL CON BOLD
    // ==========================================

    // Calcular IVA (19%)
    const valorIva = Math.round(monto * 0.19);
    const baseGravable = monto - valorIva;

    const callbackUrl = `${BACKEND_PUBLIC_URL}/api/pagos/callback`;

    const boldResponse = await boldClient.post('/online/link/v1', {
      amount_type: "CLOSE",
      amount: {
        currency: "COP",
        total_amount: monto,
        taxes: [
          {
            type: "VAT",
            base: baseGravable,
            value: valorIva
          }
        ],
        tip_amount: 0
      },
      reference: `PEDIDO${id_pedido}${eleccion_pago.replace('%', '')}${Date.now()}`,
      description: `Pago ${eleccion_pago} del pedido #${id_pedido}`,
      payer_email: usuario.email || 'cliente@email.com',
      callback_url: callbackUrl
    });


    const { payment_link, url: bold_link } = boldResponse.data.payload;

    const nuevoId = await PagoModel.crear({
      id_pedido,
      eleccion_pago,
      canal_pago,
      monto,
      bold_reference: payment_link,
      bold_link: bold_link
    });

    res.status(201).json({
      success: true,
      message: 'Link de pago generado exitosamente',
      data: {
        id_pago: nuevoId,
        bold_link: bold_link,
        bold_reference: payment_link
      }
    });

  } catch (error) {
    console.error('Error al crear pago:', error.response?.data || error.message);
    return manejarErrorValidacion(error, res);
  }
};

// ========== CALLBACK DE BOLD (RETORNO DEL USUARIO) ==========
export const callbackBold = async (req, res) => {
  try {

    const { bold_transaction_id, reference } = req.query;

    if (reference) {
      const [pago] = await sequelize.query(
        'SELECT id_pago FROM PAGOS WHERE bold_reference = ? LIMIT 1',
        { replacements: [reference], type: sequelize.QueryTypes.SELECT }
      );

      if (pago && pago.id_pago) {
        await PagoModel.confirmarPago(pago.id_pago);
      }
    }

    res.send(`
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8">
          <title>Pago procesado</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 50px; }
            h1 { color: #28a745; }
          </style>
        </head>
        <body>
          <h1>Pago procesado</h1>
          <p>Transacción: ${bold_transaction_id || 'N/A'}</p>
          <p>Referencia: ${reference || 'N/A'}</p>
          <p>Serás redirigido en unos segundos...</p>
          <script>
            setTimeout(() => {
              window.location.href = 'http://10.105.99.52:5173/mis-pedidos';
            }, 3000);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error en callback de Bold:', error);
    res.status(500).send('<h1>Error al procesar el callback</h1>');
  }
};

// ========== CONFIRMAR PAGO (WEBHOOK DE BOLD) ==========
export const confirmarPago = async (req, res) => {
  try {
    const { id } = req.params;

    if (!validarId(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de pago inválido'
      });
    }

    const pago = await PagoModel.obtenerPorId(id);
    if (!pago) {
      return res.status(404).json({ success: false, message: 'Pago no encontrado' });
    }

    if (pago.estado === 'Confirmado') {
      return res.status(400).json({ success: false, message: 'El pago ya está confirmado' });
    }

    await PagoModel.confirmarPago(id);

    const pagoActualizado = await PagoModel.obtenerPorId(id);

    const [pedido] = await sequelize.query(
      'SELECT estado FROM PEDIDOS WHERE id_pedido = ?',
      { replacements: [pago.id_pedido], type: sequelize.QueryTypes.SELECT }
    );

    let mensaje = '';
    if (pedido.estado === 'Pagado') {
      mensaje = 'El pedido ha sido pagado completamente';
    } else if (pedido.estado === 'Abonado') {
      mensaje = 'Abono del 50% confirmado. El pedido está en estado ABONADO';
    } else {
      mensaje = `Pago confirmado. Estado actual del pedido: ${pedido.estado}`;
    }

    res.json({
      success: true,
      message: mensaje,
      data: pagoActualizado
    });

  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// ========== RECHAZAR PAGO (WEBHOOK DE BOLD) ==========
export const rechazarPago = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    if (!validarId(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID de pago inválido'
      });
    }

    const pago = await PagoModel.obtenerPorId(id);
    if (!pago) {
      return res.status(404).json({ success: false, message: 'Pago no encontrado' });
    }

    if (pago.estado === 'Confirmado') {
      return res.status(400).json({
        success: false,
        message: 'No se puede rechazar un pago ya confirmado'
      });
    }

    await PagoModel.rechazarPago(id);

    const pagoActualizado = await PagoModel.obtenerPorId(id);
    res.json({
      success: true,
      message: 'Pago rechazado',
      motivo: motivo || 'No especificado',
      data: pagoActualizado
    });

  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// ========== VERIFICAR SALDO DE PEDIDO ==========
export const verificarSaldoPedido = async (req, res) => {
  try {
    const { pedidoId } = req.params;

    if (!validarId(pedidoId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de pedido inválido'
      });
    }

    const [pedido] = await sequelize.query(
      'SELECT * FROM PEDIDOS WHERE id_pedido = ?',
      { replacements: [pedidoId], type: sequelize.QueryTypes.SELECT }
    );

    if (!pedido) {
      return res.status(404).json({ success: false, message: 'Pedido no encontrado' });
    }

    const totalPagado = await PagoModel.obtenerTotalPagado(pedidoId);
    const tieneAbono = await PagoModel.tieneAbono50(pedidoId);
    const tieneCompleto = await PagoModel.tienePagoCompleto(pedidoId);
    const saldoPendiente = pedido.total - totalPagado;

    let estadoPago = 'SIN_PAGO';
    if (tieneCompleto || saldoPendiente <= 0) {
      estadoPago = 'PAGADO_COMPLETO';
    } else if (tieneAbono) {
      estadoPago = 'ABONADO_50';
    }

    res.json({
      success: true,
      data: {
        total_pedido: pedido.total,
        total_pagado: totalPagado,
        saldo_pendiente: saldoPendiente,
        estado_pago: estadoPago,
        tiene_abono_50: tieneAbono,
        tiene_pago_completo: tieneCompleto
      }
    });

  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};