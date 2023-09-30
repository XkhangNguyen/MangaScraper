
// Function to save manga data to the database
async function loadMangasFromDatabase(mangaService) {
  try {
    console.log('Loading manga data from the database...');

    const mangasData = await mangaService.getAllManga();

    const mangasJSON = await Promise.all(
      mangasData.map(async (manga) => {
        const genres = await mangaService.getGenreOfManga(manga.MangaTitle);
        const chapters = await mangaService.getChaptersOfManga(manga.MangaTitle);

        const chaptersWithImages = await Promise.all(chapters.map(async (chapter) => {
          const chapterNumber = chapter.ChapterNumber;
          const chapterLink = chapter.ChapterLink;
          const chapterImageURLs = await mangaService.getChapterImageURLsOfChapter(chapter);
          return {
            ChapterNumber: chapterNumber,
            ChapterLink: chapterLink,
            ChapterImageURLs: chapterImageURLs,
          };
        }));

        return {
          ...manga.toJSON(),
          Genres: genres.map((genre) => genre.genre_name),
          Chapters: chaptersWithImages,
        };
      })
    );

    console.log('Manga data loaded from the database.');

    return mangasJSON;
  } catch (error) {
    console.error('Error loading manga data from the database:', error.message);
    process.exit(1);
  }
}

export { loadMangasFromDatabase };
