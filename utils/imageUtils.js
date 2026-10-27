// utils/imageUtils.js
import cloudinary from '../config/cloudinary.js';

/**
 * Obtener URL de una imagen desde Cloudinary
 * @param {string} public_id - ID público de la imagen
 * @param {number} width - Ancho deseado
 * @param {number} height - Alto deseado
 * @returns {string|null} URL de la imagen
 */
export const obtenerUrlImagen = (public_id, width = 800, height = 800) => {
  if (!public_id) return null;
  
  return cloudinary.url(public_id, {
    width: width,
    height: height,
    crop: 'limit',
    secure: true,
    fetch_format: 'auto',
    quality: 'auto'
  });
};

/**
 * Obtener URL de miniatura
 */
export const obtenerThumbnail = (public_id) => {
  return obtenerUrlImagen(public_id, 200, 200);
};

/**
 * Subir imagen a Cloudinary desde una URL
 */
export const subirImagenDesdeUrl = async (url, folder = 'opticam') => {
  try {
    const result = await cloudinary.uploader.upload(url, {
      folder: folder,
      transformation: [
        { width: 800, height: 800, crop: 'limit' },
        { fetch_format: 'auto', quality: 'auto' }
      ]
    });
    return {
      success: true,
      public_id: result.public_id,
      url: result.secure_url
    };
  } catch (error) {
    console.error('Error al subir imagen a Cloudinary:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Subir imagen desde archivo (base64 o buffer)
 */
export const subirImagenDesdeArchivo = async (file, folder = 'opticam') => {
  try {
    const result = await cloudinary.uploader.upload(file, {
      folder: folder,
      transformation: [
        { width: 800, height: 800, crop: 'limit' },
        { fetch_format: 'auto', quality: 'auto' }
      ]
    });
    return {
      success: true,
      public_id: result.public_id,
      url: result.secure_url
    };
  } catch (error) {
    console.error('Error al subir imagen a Cloudinary:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Eliminar imagen de Cloudinary
 */
export const eliminarImagen = async (public_id) => {
  try {
    const result = await cloudinary.uploader.destroy(public_id);
    return result.result === 'ok';
  } catch (error) {
    console.error('Error al eliminar imagen:', error);
    return false;
  }
};