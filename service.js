import sequelize from "./database/dbConfig";
import MangaService from "./database/services/mangaService";

function startService() {
    let service;
    try {
        console.log('Starting service...');
        service = new MangaService(sequelize);
    } catch (err) {
        console.log('Error starting service: ', err);
    }

    return service;
}

function endService() {
    sequelize.close();
}

export { startService, endService };