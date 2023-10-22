import dotenv from 'dotenv';
import Sequelize from 'sequelize';
import Models from './models/index';

dotenv.config();


let sequelize;

const environment = {
  local: 'Local',
  dev: 'Dev',
}

console.log("Connecting to database...")

if (process.env.NODE_ENV === environment.local) {
  sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST_LOCAL,
    port: process.env.DB_PORT_LOCAL,
    username: process.env.DB_USER_LOCAL,
    password: process.env.DB_PASSWORD_LOCAL,
    database: process.env.DB_NAME_LOCAL,
    logging: false,
  });
}
else if (process.env.NODE_ENV === environment.dev) {
  sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST_DEV,
    port: process.env.DB_PORT_DEV,
    username: process.env.DB_USER_DEV,
    password: process.env.DB_PASSWORD_DEV,
    database: process.env.DB_NAME_DEV,
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
  });
}

Models(sequelize);

await sequelize.authenticate()
  .then(() => {
    console.log(process.env.NODE_ENV + ' database connection has been established successfully.');
  })
  .catch((error) => {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  });

await sequelize.sync()
  .then(() => {
    console.log('Database tables are synchronized.');
  })
  .catch((error) => {
    console.error('Error synchronizing database tables:', error);
    process.exit(1);
  });

export default sequelize;
