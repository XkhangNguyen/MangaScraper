
// Function to save manga data to the database
async function saveMangasToDatabase(mangasData, mangaService) {
  try {
    // Loop through the scraped manga data and insert it into the database
    for (const mangaTitle in mangasData) {
      if (mangasData.hasOwnProperty(mangaTitle)) {
        const manga = mangasData[mangaTitle];

        if(!await mangaService.getMangaByTitle(manga.MangaTitle)){
          await mangaService.createManga(manga);
        }

        await mangaService.updateMangaChapter(manga);
      }
    }

    console.log('Manga data saved to the database.');
  } catch (error) {
    console.error('Error saving manga data to the database:', error.message);
  }
}

export { saveMangasToDatabase };
