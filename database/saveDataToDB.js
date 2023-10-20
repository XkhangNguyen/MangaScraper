
// Function to save manga data to the database
async function saveMangasToDatabase(mangasData, mangaService) {
  try {
    console.log('Saving manga data to the database...');

    const mangaIdsCreated = await mangaService.createMangas(mangasData);

    await mangaService.updateMangas(mangaIdsCreated);

    console.log('Manga data saved to the database.');
  } catch (error) {
    console.error('Error saving manga data to the database:', error.message);
    process.exit(1);
  }
}

export { saveMangasToDatabase };
