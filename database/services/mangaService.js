
class MangaService {
    constructor(sequelize) {
        this.sequelize = sequelize;
        this.models = sequelize.models;
    }

    async getAllManga() {
        return await this.models.manga.findAll();
    }

    async getMangaByTitle(mangaTitle) {
        return await this.models.manga.findOne({ where: { title: mangaTitle } });
    }

    async getGenreOfManga(mangaTitle) {
        try {
            // Find the manga record by title
            const manga = await this.models.manga.findOne({
                where: { title: mangaTitle },
                include: [this.models.genre], // Include the associated genre
            });


            if (!manga) {
                throw new Error('Manga not found');
            }

            // Access the genre associated with the manga
            const genres = manga.genres;

            // Return the genre data
            return genres;
        } catch (error) {
            console.error('Error getting genres of manga:', error.message);
            throw error;
        }
    }

    async getChaptersOfManga(mangaTitle) {
        try {
            const manga = await this.models.manga.findOne({
                where: { title: mangaTitle },
                include: [
                    {
                        model: this.models.chapter,
                    },
                ],
            })

            if (!manga) {
                throw new Error('Manga not found');
            }

            const chapters = manga.chapters;

            return chapters;
        } catch (error) {
            console.error('Error getting chapters of manga:', error.message);
            throw error;
        }
    }

    async getChapterImageURLsOfChapter(chapter) {
        try {
            // Find the chapter record by its ID, assuming chapter is a Sequelize instance
            const chapterRecord = await chapter.reload({ include: 'chapter_images' });

            if (!chapterRecord) {
                throw new Error('Chapter not found');
            }

            // Access the associated chapter_images
            const chapterImages = chapterRecord.chapter_images;

            // Extract image URLs from the chapter_images
            const imageUrls = chapterImages.map((image) => image.chapter_image_url);

            return imageUrls;
        } catch (error) {
            console.error('Error getting chapter image URLs:', error.message);
            throw error;
        }
    }

    async createMangas(mangaDataArray) {
        let transaction;
        
        try {
            // Start a transaction
            transaction = await this.sequelize.transaction();
    
            const mangaIds = mangaDataArray.map((mangaData) => mangaData.id);
    
            // Find existing manga ids in the database within the transaction
            const existingMangaIds = (await this.models.manga.findAll({
                where: { id: mangaIds },
                attributes: ['id'],
            })).map((manga) => manga.id);
    
            // Filter out manga data for ids that don't already exist
            const mangaDataToInsert = mangaDataArray.filter((mangaData) => {
                return !existingMangaIds.includes(mangaData.id);
            });
    
            // Perform a bulk insert of manga records within the transaction
            const mangaRecords = await this.models.manga.bulkCreate(mangaDataToInsert, { transaction });
            
            // map manga record by its title
            const mangaToTitleMap = new Map(mangaRecords.map((mangaRecord) => [mangaRecord.MangaTitle, mangaRecord]));

            // Create manga-genre associations within the transaction
            const mangaGenreAsso = [];

            // find all genre records and map each record by its genre name
            const allGenres = new Map();
            (await this.models.genre.findAll({ transaction })).forEach((genre) => {
                allGenres.set(genre.genre_name, genre);
            });
                
            mangaDataToInsert.forEach((mangaData) => {
                const matchedManga = mangaToTitleMap.get(mangaData.MangaTitle);
    
                if (mangaData.Genres && mangaData.Genres.length > 0) {
                    for (const genre of mangaData.Genres) {  
                        mangaGenreAsso.push({ mangaId: matchedManga.id, genreId: allGenres.get(genre).id });
                    }
                }
            });
    
            // Perform a bulk insert for manga-genre associations within the transaction
            await this.models.manga_genre.bulkCreate(mangaGenreAsso, { transaction });
    
            // Commit the transaction
            await transaction.commit();
    
            return mangaGenreAsso;
        } catch (error) {
            // Rollback the transaction in case of an error
            if (transaction) {
                await transaction.rollback();
            }
    
            console.error('Error creating mangas:', error);
            throw error;
        }
    }

    async updateMangaChapter(mangaData, mangaToUpdate) {
        try {
            if (!mangaToUpdate) {
                throw new Error('Manga not found');
            }

            mangaToUpdate.NumberOfChapters = mangaData.NumberOfChapters;

            await mangaToUpdate.save();

            const chapters = mangaData.Chapters;

            for (const chapterData of chapters) {
                const { ChapterImageURLs, ChapterNumber, ChapterLink } = chapterData;

                const newChapter = await this.models.chapter.create({
                    ChapterNumber,
                    ChapterLink,
                    mangaId: mangaToUpdate.id,
                });

                for (const chapterImageUrl of ChapterImageURLs) {
                    await this.models.chapter_image.create({
                        chapterId: newChapter.id, // Associate the image with the chapter
                        chapter_image_url: chapterImageUrl, // Include the image URL
                    });
                }
            }

            return mangaToUpdate;
        }
        catch (error) {
            console.error('Error updating manga:', error);
            throw error;
        }

    }
}

export default MangaService;
