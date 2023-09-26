import sequelize from "./database/dbConfig.js";
import MangaService from "./database/services/mangaService.js";

function startService(){
    let service;
    try {
        console.log('Starting service...');
        service = new MangaService(sequelize);
    } catch(err){
        console.log('Error starting service: ', err);
    }

    return service;
}

export {startService};