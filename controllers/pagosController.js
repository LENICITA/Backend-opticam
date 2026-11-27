// src/controllers/pagosController.js
import crypto from 'crypto';
import PagoModel from '../models/pagoModel.js';
import manejarErrorValidacion from '../utils/manejarErrores.js';
import { escaparHTML } from '../utils/sanitizar.js';
import sequelize from '../config/database.js';
import { boldClient } from '../config/bold.js';

const esDesarrollo = process.env.NODE_ENV === 'development' || process.env.BOLD_MODO === 'TEST';

const BACKEND_PUBLIC_URL = process.env.BACKEND_PUBLIC_URL || 'https://tu_backend_vercel.app';

// ✅ URL del frontend a la que Bold redirige al usuario tras pagar
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://frontend-opticam.vercel.app';

const error400 = (res, message) => res.status(400).json({ success: false, message });
const error403 = (res, message) => res.status(403).json({ success: false, message });
const error404 = (res, message) => res.status(404).json({ success: false, message });

const validarId = (id) => {
  if (id === undefined || id === null || id === '') return false;
  const num = Number(id);
  return !Number.isNaN(num) && num > 0 && Number.isInteger(num);
};

const validarIdOError = (id, res, mensaje = 'ID inválido') => {
  if (!validarId(id)) {
    error400(res, mensaje);
    return false;
  }
  return true;
};

const validarEleccionPago = (eleccion) => ['50%', '100%'].includes(eleccion);

const validarMonto = (monto) => {
  if (monto === undefined || monto === null || monto === '') return false;
  const num = Number(monto);
  return !Number.isNaN(num) && num > 0;
};

/**
 * Genera una referencia única para enviar a Bold
 * Ej: PEDIDO12_50_1700000000000
 */
const generarExternalReference = (id_pedido, eleccion_pago) => {
  const limpio = String(eleccion_pago).replace('%', '');
  return `PEDIDO${id_pedido}_${limpio}_${Date.now()}`;
};

/**
 * Verifica la firma del Webhook de Bold
 * Bold envía x-bold-signature = HMAC-SHA256(secretKey, base64(rawBody))
 */
const verificarFirmaBold = (rawBody, signature, secretKey) => {
  if (!signature || !secretKey) return false;
  try {
    const encoded = Buffer.from(rawBody).toString('base64');
    const hashed = crypto.createHmac('sha256', secretKey).update(encoded).digest('hex');
    const a = Buffer.from(hashed);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (e) {
    return false;
  }
};

// ========== OBTENER PAGOS POR PEDIDO ==========
export const obtenerPagosPorPedido = async (req, res) => {
  try {
    const { pedidoId } = req.params;

    if (!validarIdOError(pedidoId, res, 'ID de pedido inválido')) return;

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

    if (!id_pedido || !eleccion_pago || !monto) {
      return error400(res, 'Faltan campos requeridos: id_pedido, eleccion_pago, monto');
    }
    if (!validarId(id_pedido)) {
      return error400(res, 'El ID del pedido debe ser un número válido');
    }
    if (!validarEleccionPago(eleccion_pago)) {
      return error400(res, 'eleccion_pago debe ser 50% o 100%');
    }
    if (!validarMonto(monto)) {
      return error400(res, 'El monto debe ser un número mayor a 0');
    }

    const [pedido] = await sequelize.query(
      'SELECT * FROM PEDIDOS WHERE id_pedido = ?',
      { replacements: [id_pedido], type: sequelize.QueryTypes.SELECT }
    );

    if (!pedido) return error404(res, 'Pedido no encontrado');

    if (pedido.id_usuario !== usuario.id) {
      return error403(res, 'No puedes pagar un pedido que no te pertenece');
    }
    if (monto > pedido.total) {
      return error400(res, `El monto no puede exceder el total del pedido (${pedido.total})`);
    }
    if (pedido.estado === 'Pagado') {
      return error400(res, 'Este pedido ya está pagado completamente');
    }

    // ===== LÓGICA PARA 50% =====
    if (eleccion_pago === '50%') {
      const totalPagado = await PagoModel.obtenerTotalPagado(id_pedido);
      const saldoRestante = pedido.total - totalPagado;
      const tieneAbono = await PagoModel.tieneAbono50(id_pedido);

      if (tieneAbono) {
        if (pedido.estado !== 'Abonado') {
          return error400(res, 'El pedido debe estar en estado ABONADO para pagar el saldo restante');
        }
        if (monto < saldoRestante) {
          return error400(res, `El saldo restante es ${saldoRestante}. Debes pagar esa cantidad para completar el pago`);
        }
      } else {
        const tieneCompleto = await PagoModel.tienePagoCompleto(id_pedido);
        if (tieneCompleto) {
          return error400(res, 'Este pedido ya fue pagado completamente');
        }
        const monto50Esperado = pedido.total / 2;
        const margenError = 100;
        if (Math.abs(monto - monto50Esperado) > margenError) {
          return error400(res, `El monto debe ser aproximadamente el 50% del total (${monto50Esperado})`);
        }
      }
    }

    // ===== LÓGICA PARA 100% =====
    if (eleccion_pago === '100%') {
      const totalPagado = await PagoModel.obtenerTotalPagado(id_pedido);
      const saldoRestante = pedido.total - totalPagado;
      const tieneCompleto = await PagoModel.tienePagoCompleto(id_pedido);
      if (tieneCompleto) {
        return error400(res, 'Este pedido ya fue pagado completamente');
      }
      const tieneAbono = await PagoModel.tieneAbono50(id_pedido);
      if (tieneAbono) {
        if (monto < saldoRestante) {
          return error400(res, `El saldo restante es ${saldoRestante}. Debes pagar esa cantidad para completar`);
        }
      } else {
        if (Math.abs(monto - pedido.total) > 100) {
          return error400(res, `El monto debe ser el total del pedido (${pedido.total}) para pago completo`);
        }
      }
    }

    const externalReference = generarExternalReference(id_pedido, eleccion_pago);

    // ==========================================
    //  SIMULAR PAGO (solo desarrollo)
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
        external_reference: externalReference,
        bold_link: bold_link
      });

      setTimeout(async () => {
        try {
          await PagoModel.confirmarPago(nuevoId);
        } catch (err) {
          console.error('Error auto-confirmando pago:', err);
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
    const valorIva = Math.round(monto * 0.19);
    const baseGravable = monto - valorIva;

    // ✅ Redirigir al usuario al FRONTEND (no al backend)
    // La confirmación real la hace el Webhook en /api/pagos/webhook
    const callbackUrl = `${FRONTEND_URL}/mis-pedidos`;

    const boldResponse = await boldClient.post('/online/link/v1', {
      amount_type: 'CLOSE',
      amount: {
        currency: 'COP',
        total_amount: monto,
        taxes: [
          { type: 'VAT', base: baseGravable, value: valorIva }
        ],
        tip_amount: 0
      },
      reference: externalReference,
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
      external_reference: externalReference,
      bold_link: bold_link
    });

    return res.status(201).json({
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

// ========== CALLBACK DE BOLD (RESPALDO / REDIRECCIÓN ANTIGUA) ==========
// Ya no se usa como redirección del usuario (ahora va al frontend).
// Se mantiene por si Bold decide llamarlo o si quieres usarlo como respaldo.
export const callbackBold = async (req, res) => {
  try {
    const { bold_transaction_id, reference } = req.query;

    const transaccionSegura = escaparHTML(bold_transaction_id || 'N/A');
    const referenciaSegura = escaparHTML(reference || 'N/A');

    if (reference) {
      const pago = await PagoModel.obtenerPorExternalReference(reference);
      if (pago && pago.estado !== 'Confirmado') {
        if (bold_transaction_id && !pago.bold_payment_id) {
          await pago.update({ bold_payment_id: bold_transaction_id });
        }
        await PagoModel.confirmarPago(pago.id_pago);
      }
    }

    // Redirigir al frontend en lugar de mostrar HTML del backend
    return res.redirect(`${FRONTEND_URL}/mis-pedidos`);
  } catch (error) {
    console.error('Error en callback de Bold:', error);
    return res.redirect(`${FRONTEND_URL}/`);
  }
};

// ========== WEBHOOK DE BOLD (NOTIFICACIÓN SERVIDOR-SERVIDOR) ==========
export const webhookBold = async (req, res) => {
  try {
    console.log('Webhook payload:', JSON.stringify(req.body));

    // (Opcional) Verificación de firma — descomenta cuando estés en producción
    // const signature = req.headers['x-bold-signature'];
    // const secretKey = process.env.BOLD_SECRET_KEY;
    // if (signature && secretKey) {
    //   const rawBody = JSON.stringify(req.body);
    //   if (!verificarFirmaBold(rawBody, signature, secretKey)) {
    //     console.error('Webhook: firma inválida');
    //     return res.status(200).json({ received: true });
    //   }
    // }

    const { type, data } = req.body || {};

    if (type !== 'SALE_APPROVED') {
      return res.status(200).json({ received: true });
    }

    const reference = data?.reference;
    const paymentId = data?.payment_id || data?.id;

    if (!reference) {
      console.error('Webhook: sin reference en payload');
      return res.status(200).json({ received: true });
    }

    let pago = await PagoModel.obtenerPorExternalReference(reference);
    if (!pago) pago = await PagoModel.obtenerPorBoldReference(reference);

    if (!pago) {
      console.error(`Webhook: no se encontró pago para reference=${reference}`);
      return res.status(200).json({ received: true });
    }

    if (pago.estado === 'Confirmado') {
      return res.status(200).json({ received: true });
    }

    if (paymentId && !pago.bold_payment_id) {
      await pago.update({ bold_payment_id: paymentId });
    }

    await PagoModel.confirmarPago(pago.id_pago);
    console.log(`Webhook: pago ${pago.id_pago} confirmado (reference=${reference})`);

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error en webhook Bold:', error);
    return res.status(200).json({ received: true });
  }
};

// ========== CONFIRMAR PAGO (MANUAL) ==========
export const confirmarPago = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validarIdOError(id, res, 'ID de pago inválido')) return;

    const pago = await PagoModel.obtenerPorId(id);
    if (!pago) return error404(res, 'Pago no encontrado');
    if (pago.estado === 'Confirmado') {
      return error400(res, 'El pago ya está confirmado');
    }

    await PagoModel.confirmarPago(id);
    const pagoActualizado = await PagoModel.obtenerPorId(id);

    const [pedido] = await sequelize.query(
      'SELECT estado FROM PEDIDOS WHERE id_pedido = ?',
      { replacements: [pago.id_pedido], type: sequelize.QueryTypes.SELECT }
    );

    let mensaje = '';
    if (pedido.estado === 'Pagado') mensaje = 'El pedido ha sido pagado completamente';
    else if (pedido.estado === 'Abonado') mensaje = 'Abono del 50% confirmado. El pedido está en estado ABONADO';
    else mensaje = `Pago confirmado. Estado actual del pedido: ${pedido.estado}`;

    res.json({ success: true, message: mensaje, data: pagoActualizado });
  } catch (error) {
    return manejarErrorValidacion(error, res);
  }
};

// ========== RECHAZAR PAGO ==========
export const rechazarPago = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    if (!validarIdOError(id, res, 'ID de pago inválido')) return;

    const pago = await PagoModel.obtenerPorId(id);
    if (!pago) return error404(res, 'Pago no encontrado');
    if (pago.estado === 'Confirmado') {
      return error400(res, 'No se puede rechazar un pago ya confirmado');
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
    if (!validarIdOError(pedidoId, res, 'ID de pedido inválido')) return;

    const [pedido] = await sequelize.query(
      'SELECT * FROM PEDIDOS WHERE id_pedido = ?',
      { replacements: [pedidoId], type: sequelize.QueryTypes.SELECT }
    );
    if (!pedido) return error404(res, 'Pedido no encontrado');

    const totalPagado = await PagoModel.obtenerTotalPagado(pedidoId);
    const tieneAbono = await PagoModel.tieneAbono50(pedidoId);
    const tieneCompleto = await PagoModel.tienePagoCompleto(pedidoId);
    const saldoPendiente = pedido.total - totalPagado;

    let estadoPago = 'SIN_PAGO';
    if (tieneCompleto || saldoPendiente <= 0) estadoPago = 'PAGADO_COMPLETO';
    else if (tieneAbono) estadoPago = 'ABONADO_50';

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
