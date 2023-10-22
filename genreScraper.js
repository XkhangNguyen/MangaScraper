import puppeteer from 'puppeteer-extra';
import { load } from 'cheerio';
import sequelize from './database/dbConfig';

(async () => {
    console.log(`Opening the browser...`);

    const models = sequelize.models;

    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            "--disable-setuid-sandbox",
        ],
        'ignoreHTTPSErrors': true
    });

    console.log(`Opened the browser`);

    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.google.com/',
    });

    // Navigate to the target website
    await page.goto('https://phetruyen.net/'); // Replace with the URL of the website you want to scrape

    console.log(`Navigated to link.`);

    // Get the HTML content of the page
    const html = await page.content();

    // Load the HTML content into Cheerio
    const $ = load(html);

    // Define the selector for the articles
    const genresSelector = '.book_tags_content p a'; // Replace with the appropriate selector for your target website

    // Iterate through the articles and extract data
    const genres = $(genresSelector).map((index, el) => $(el).text()).get();

    console.log(genres);

    await browser.close();

    await models.genre.destroy({
        where: {}, // This condition will delete all records
    });

    console.log('Deleted existing genres from the database.');

    await models.genre.bulkCreate(genres.map(genre_name => ({ genre_name })));
    console.log('Genres saved to the database.');
    sequelize.close();

    await browser.close();
})();