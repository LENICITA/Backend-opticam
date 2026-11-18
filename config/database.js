import { Sequelize } from 'sequelize';


const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 4000,
    dialect: 'mysql',
    dialectOptions: {
      ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: false
      }
    },
    logging: false
  }
);

export default sequelize;
