import Models from '../models/index.js';

class MangaService {
    constructor(sequelize) {
        Models(sequelize);
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
        try {
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
                        chapter_image_url: chapterImageUrl, // Include the image URL
                    });
                }
            }

            return manga;
        }
        catch (error) {
            console.error('Error updating manga:', error);
            throw error;
        }

    }
}

export default MangaService;
