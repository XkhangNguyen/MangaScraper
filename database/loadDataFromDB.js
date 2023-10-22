
// Function to save manga data to the database
async function loadMangasFromDatabase(mangaService) {
  try {
    console.log('Loading manga data from the database...');

    const mangasJSON = await mangaService.getAllMangaAsJSONObject();

    console.log('Manga data loaded from the database.');

    return mangasJSON;
  } catch (error) {
    console.error('Error loading manga data from the database:', error.message);
    process.exit(1);
  }
}

export { loadMangasFromDatabase };
