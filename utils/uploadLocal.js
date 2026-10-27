// utils/uploadLocal.js
import cloudinary from '../config/cloudinary.js';
import fs from 'fs';
import path from 'path';

export const subirImagenLocal = async (filePath, folder = 'opticam') => {
  try {
    console.log('📂 Archivo:', filePath);
    
    const resolvedPath = path.resolve(filePath);
    console.log('📂 Ruta absoluta:', resolvedPath);
    
    const exists = fs.existsSync(resolvedPath);
    console.log('📁 ¿Existe?', exists);
    
    if (!exists) {
      return { success: false, error: `Archivo no encontrado: ${resolvedPath}` };
    }

    console.log('☁️ Subiendo a Cloudinary...');
    
    // 🔥 INTENTAR CON UN ARCHIVO DE PRUEBA (UNO SOLO)
    const result = await cloudinary.uploader.upload(resolvedPath, {
      folder: folder,
      transformation: [
        { width: 800, height: 800, crop: 'limit' },
        { fetch_format: 'auto', quality: 'auto' }
      ]
    });

    console.log('✅ Subida exitosa:', result.secure_url);
    return {
      success: true,
      public_id: result.public_id,
      url: result.secure_url
    };
  } catch (error) {
    // 🔥 CAPTURAR TODO
    console.error('❌ ERROR COMPLETO:');
    console.error('  Mensaje:', error.message);
    console.error('  Código:', error.code);
    console.error('  HTTP Status:', error.http_code);
    console.error('  Error completo:', error);
    return { success: false, error: error.message || 'Error desconocido' };
  }
};