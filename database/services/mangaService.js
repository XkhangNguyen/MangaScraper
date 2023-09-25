import Models from '../models/index.js';

class MangaService{
    constructor(sequelize){
        Models(sequelize);
        this.models = sequelize.models;
    }

    async getAllManga() {
        return await Manga.findAll({
          include: [Genre, Chapter], // Include associated genres and chapters
        });
    }

    async getMangaByTitle(mangaTitle){
        return await this.models.manga.findOne({where: {title : mangaTitle}, });
    }
      
    async createManga(mangaData) {
        try {
            // Extract genre names from the mangaData object
            const { Genres, ...mangaInfo } = mangaData;

            // Find or create the manga record
            const manga = await this.models.manga.create(mangaInfo);
        
            // If genres were provided, create or associate them
            if (Genres && Genres.length > 0) {
                const genreRecords = await Promise.all(
                    Genres.map(async (genreName) => {
                    // Find or create the genre based on its name
                    const [genre] = await this.models.genre.findOrCreate({
                    where: { genre_name: genreName },
                    });
        
                    // Associate the genre with the manga
                    await manga.addGenre(genre);
        
                    return genre;
                })
                );
        
                manga.setGenres(genreRecords); // Set genres for the manga
            }
        
            return manga;
    
        } catch (error) {
            console.error('Error creating manga:', error);
            throw error;
        }
    } 
    
    async updateMangaChapter(mangaData) {
        const manga = await this.getMangaByTitle(mangaData.MangaTitle)

        if (!manga) {
          throw new Error('Manga not found');
        }

        const chapters = mangaData.Chapters;

        for (const chapterData of chapters) {
            const { ChapterImageURLs, ChapterNumber, ChapterLink } = chapterData;

            const newChapter = await this.models.chapter.create({
                ChapterNumber,
                ChapterLink,
                mangaId: manga.id,
            });

            for (const chapterImageUrl of ChapterImageURLs) {
                await this.models.chapter_image.create({
                  chapterId: newChapter.id, // Associate the image with the chapter
                  chapter_image_url : chapterImageUrl, // Include the image URL
                });
            }
        }
        
        return manga;
    }
}

export default MangaService;
  