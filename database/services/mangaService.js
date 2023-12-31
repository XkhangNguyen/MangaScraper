class MangaService {
    constructor(sequelize) {
        this.sequelize = sequelize;
        this.models = sequelize.models;
    }

    async getAllMangaAsJSONObject() {
        const mangaRecords = await this.models.manga.findAll({
            include: [
                {
                    model: this.models.genre,
                    attributes: ['genre_name'],
                    through: {
                        attributes: []
                    },
                },
                {
                    model: this.models.chapter,
                    attributes: ['ChapterNumber', 'ChapterLink'],
                }
            ]
        });

        const mangaData = mangaRecords.map((mangaRecord) => {
            const mangaJSON = mangaRecord.toJSON();

            // Rename "genres" to "Genres"
            mangaJSON.Genres = mangaJSON.genres;
            delete mangaJSON.genres;

            // Rename "chapters" to "Chapters"
            mangaJSON.Chapters = mangaJSON.chapters;
            delete mangaJSON.chapters;

            // Return the modified JSON
            return { [mangaJSON.MangaTitle]: mangaJSON };
        });

        // Convert the array of objects to a single object
        const mangaObject = Object.assign({}, ...mangaData);

        return mangaObject;
    }


    async getChapterImageURLsOfChapter(chapterId) {
        try {
            // Find the chapter record by its ID
            const chapterRecord = await this.models.chapter.findByPk(chapterId, {
                include: 'chapter_image'
            });

            if (!chapterRecord) {
                throw new Error('Chapter not found');
            }

            return chapterRecord.chapter_image;

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

            const mangaToTitleMap = new Map(mangaRecords.map((mangaRecord) => [mangaRecord.MangaTitle, mangaRecord]));

            mangaDataArray = mangaDataArray.filter((mangaData) => {
                // If a matching manga record exists, assign its id to mangaData
                if (mangaToTitleMap.has(mangaData.MangaTitle)) {
                    mangaData.id = mangaToTitleMap.get(mangaData.MangaTitle).id;
                    return true;
                }
                return false; // Return false for mangaData that doesn't have a matching record
            });

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

            //console.log(mangaDataToInsert)

            return mangaDataArray;
        } catch (error) {
            // Rollback the transaction in case of an error
            if (transaction) {
                await transaction.rollback();
            }

            console.error('Error creating mangas:', error);
            throw error;
        }
    }

    async updateMangas(mangasCreated) {
        let transaction;

        try {
            // Start a transaction
            transaction = await this.sequelize.transaction();

            const chaptersToUpdate = [];

            const chapterImagesToUpdate = [];

            let chapterLinkToChapterMap = new Map();

            mangasCreated.forEach((manga) => {
                manga.Chapters.forEach((chapter) => {
                    chaptersToUpdate.push({ ...chapter, mangaId: manga.id });

                    chapterLinkToChapterMap.set(chapter.ChapterLink, chapter)
                });
            });

            const updatedChapterRecords = await this.models.chapter.bulkCreate(chaptersToUpdate, { transaction });

            updatedChapterRecords.forEach((record) => {
                const matchedChapter = chapterLinkToChapterMap.get(record.ChapterLink);

                let combinedURLsInChapter = '';

                matchedChapter.ChapterImageURLs.forEach((url, index) => {
                    if (index > 0) {
                        combinedURLsInChapter += ';';
                    }

                    combinedURLsInChapter += url;
                })

                chapterImagesToUpdate.push({
                    chapterId: record.id,
                    chapter_image_urls: combinedURLsInChapter,
                });
            });

            await this.models.chapter_image.bulkCreate(chapterImagesToUpdate, { transaction });


            // Commit the transaction
            await transaction.commit();
        }
        catch (error) {
            // Handle the error or log it
            console.error('Error updating manga:', error);

            // Rollback the transaction
            if (transaction) {
                await transaction.rollback();
            }
        }
    }
}

export default MangaService;
