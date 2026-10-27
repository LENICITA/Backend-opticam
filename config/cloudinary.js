// config/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// OBTENER LA RUTA CORRECTA DEL .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// FORZAR CARGA DE .env ANTES DE CONFIGURAR CLOUDINARY
dotenv.config({ path: path.join(__dirname, '../.env') });

// VERIFICAR QUE LAS VARIABLES EXISTEN
console.log(' Configurando Cloudinary...');
console.log('  Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('  API Key:', process.env.CLOUDINARY_API_KEY ? ' presente' : ' faltante');
console.log('  API Secret:', process.env.CLOUDINARY_API_SECRET ? ' presente' : ' faltante');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export default cloudinary;