// config/bold.js
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Configuración de Bold
const boldConfig = {
  apiKey: process.env.BOLD_API_KEY,
  secretKey: process.env.BOLD_SECRET_KEY,
  baseURL: process.env.BOLD_API_URL || 'https://integrations.api.bold.co',
  isTest: process.env.BOLD_MODO === 'TEST'
};

// Cliente de Axios para Bold
export const boldClient = axios.create({
  baseURL: boldConfig.baseURL,
  headers: {
    'Authorization': `x-api-key ${boldConfig.apiKey}`,
    'Content-Type': 'application/json'
  },
  timeout: 30000 // 30 segundos
});

// Interceptor para logging (opcional pero útil)
boldClient.interceptors.request.use(
  (config) => {
    console.log(`🚀 Bold Request: ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Bold Request Error:', error);
    return Promise.reject(error);
  }
);

boldClient.interceptors.response.use(
  (response) => {
    console.log(` Bold Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error(' Bold Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default boldConfig;