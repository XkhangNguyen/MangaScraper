import pkg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pkg;
dotenv.config();

// Configuration for the database connection
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT, // Specify the port for PostgreSQL
};

// Create a PostgreSQL pool to manage connections
const pool = new Pool(dbConfig);

// Function to save manga data to the database
async function saveMangasToDatabase(scrapedMangaData) {
  try {
    // Connect to the PostgreSQL database using the pool
    const client = await pool.connect();
    console.log('Connected to the database.');

    // Loop through the scraped manga data and insert it into the database
    for (const mangaTitle in scrapedMangaData) {
      if (scrapedMangaData.hasOwnProperty(mangaTitle)) {
        const manga = scrapedMangaData[mangaTitle];

        // Perform the database insert operation for manga
        const query = `
          INSERT INTO mangas (title, description, cover_image_url, author)
          VALUES ($1, $2, $3, $4)
          RETURNING manga_id;
        `;
        const mangaValues = [manga.MangaTitle, manga.MangaDescription, manga.CoverImageUrl, manga.Author];

        // Execute the SQL query
        const mangaResult = await client.query(query, mangaValues);

        //Get the manga's ID
        const mangaId = mangaResult.rows[0].manga_id;

        // Insert manga genres into the 'manga_genre' table
        for (const genre of manga.Genres) {
          // First, check if the genre already exists in the 'genres' table
          const checkGenreQuery = `
            SELECT genre_id FROM genres WHERE genre_name = $1`;
          
          const checkGenreValues = [genre];
          const genreResult = await client.query(checkGenreQuery, checkGenreValues);

          let genreId;

          if (genreResult.rows.length === 0) {
            // If the genre doesn't exist, insert it into the 'genres' table
            const insertGenreQuery = `
              INSERT INTO genres (genre_name) VALUES ($1) RETURNING genre_id`;
            
            const insertGenreValues = [genre];
            const insertGenreResult = await client.query(insertGenreQuery, insertGenreValues);
            
            genreId = insertGenreResult.rows[0].genre_id;
          } else {
            // If the genre exists, use its ID
            genreId = genreResult.rows[0].genre_id;
          }

          // Insert the manga-genre relationship into the 'manga_genre' table
          const mangaGenreQuery = `
            INSERT INTO manga_genre (manga_id, genre_id) VALUES ($1, $2)`;

          const mangaGenreValues = [mangaId, genreId];
          await client.query(mangaGenreQuery, mangaGenreValues);
        }

        // Insert manga chapters into the 'chapters' table
        for (const chapter of manga.Chapters) {
          const chapterQuery = `
            INSERT INTO chapters (manga_id, chapter_number, chapter_link)
            VALUES ($1, $2, $3)
            RETURNING chapter_id  
          `;
          
          const chapterValues = [mangaId, chapter.ChapterNumber, chapter.ChapterLink];
          const insertChapterResult = await client.query(chapterQuery, chapterValues);
          
          let chapterId = insertChapterResult.rows[0].chapter_id;

          for (const chapterImageUrl of chapter.ChapterImageURLs){
            const chapterImageUrlQuery = `
              INSERT INTO chapter_images (chapter_id, chapter_image_url)
              VALUE ($1, $2)
            `
            const chapterImageUrlValues = [chapterId, chapterImageUrl];
            await client.query(chapterImageUrlQuery, chapterImageUrlValues);
          }
        }
      }
    }

    console.log('Manga data saved to the database.');

    // Release the database connection
    client.release();
  } catch (error) {
    console.error('Error saving manga data to the database:', error.message);
  }
}

export { saveMangasToDatabase };
