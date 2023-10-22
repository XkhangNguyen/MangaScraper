import sequelize from './database/dbConfig';

async function resetTablesAndAutoIncrement() {
  try {
    const models = sequelize.models;

    // Delete all records from the tables
    await sequelize.query('TRUNCATE "manga_genre"');
    await models.genre.destroy({ where: {} });
    await models.manga.destroy({ where: {} });
    await models.chapter_image.destroy({ where: {} });
    await models.chapter.destroy({ where: {} });

    // Reset the auto-increment counters
    await sequelize.query('ALTER SEQUENCE "mangas_id_seq" RESTART 1'); // Replace "mangas_id_seq" with your actual sequence name for the manga table
    await sequelize.query('ALTER SEQUENCE "genres_id_seq" RESTART 1'); // Replace "genres_id_seq" with your actual sequence name for the genre table
    await sequelize.query('ALTER SEQUENCE "chapters_id_seq" RESTART 1'); // Replace "chapters_id_seq" with your actual sequence name for the chapter table
    await sequelize.query('ALTER SEQUENCE "chapter_images_id_seq" RESTART 1'); // Replace "chapter_images_id_seq" with your actual sequence name for the chapter_image table

    console.log('Tables reset successfully.');

    // Close the database connection
    await sequelize.close();
  } catch (error) {
    console.error('Error resetting the tables and auto-increment counters:', error);
  }
}

resetTablesAndAutoIncrement();