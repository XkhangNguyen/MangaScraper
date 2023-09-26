import dotenv from 'dotenv';
import Sequelize from 'sequelize';

dotenv.config();

const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  logging: false,
});

await sequelize.authenticate()
  .then(() => {
    console.log('Database connection has been established successfully.');
  })
  .catch((error) => {
    console.error('Unable to connect to the database:', error);
  });

await sequelize.sync()
  .then(() => {
    console.log('Database tables are synchronized.');
  })
  .catch((error) => {
    console.error('Error synchronizing database tables:', error);
  });

export default sequelize;
