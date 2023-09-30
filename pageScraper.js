import pLimit from 'p-limit';
import { load } from "cheerio";
import { saveMangasToDatabase } from './database/saveDataToDB.js';
import { loadMangasFromDatabase } from './database/loadDataFromDB.js';
import { endService } from './service.js';

const concurrencyLimit = 1;
const limit = pLimit(concurrencyLimit);

const maxChaptersToScrape = 2;
const maxMangaToScrape = 10;
const maxRetries = 3;

const url = 'https://saytruyenmoi.com/';
const mangaLinksSelector = '.manga-content .page-item-detail > div:first-of-type a';
const mangaTitleSelector = '.post-title > h1';
const mangaDescriptionSelector = '.description-summary p';
const coverImageUrlSelector = '.summary_image img';
const authorSelector = '.tab-summary .post-content > div:nth-child(5) > div:nth-child(2)';
const genresSelector = '.tab-summary .post-content > div:nth-child(8) a';
const chaptersSelector = '.list-item.box-list-chapter.limit-height li a';
const chapterImageURLsSelector = '.page-break > img';

const mangaScraperObject = {

    async scraper(mainBrowser, service) {
        const scrapedMangaData = convertToObject(await loadMangasFromDatabase(service));

        const pageUrls = await fetchWebsiteUrls(url, mainBrowser);

        const tasks = pageUrls.map(link => scrapeChapterDetailsFromLink(link, mainBrowser, scrapedMangaData));

        const results = await Promise.all(tasks);

        const validResults = results.filter(result => result !== null);

        await saveMangasToDatabase(validResults, service);

        endService();
    }
};

async function fetchWebsiteUrls(pageUrl, browser) {
    let page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.google.com/',
    });

    await page.goto(pageUrl);

    const pageContent = await page.content();

    console.log(`Navigated to ${pageUrl}`);
    const $a = load(pageContent);

    return $a(mangaLinksSelector)
        .map((index, el) => $a(el).attr('href')).get()
        .slice(0, maxMangaToScrape);
}

async function scrapeChapterDetailsFromLink(link, browser, scrapedMangaData) {
    return limit(async () => {

        let mangaRetries = 0;

        while (mangaRetries < maxRetries) {
            try {
                const mangaPage = await browser.newPage();
                await mangaPage.goto(link);

                const mangaHtmlContent = await mangaPage.content();
                const $b = load(mangaHtmlContent);

                console.log(`Navigated to ${link}...`);

                const mangaData = {
                    MangaTitle: $b(mangaTitleSelector).text(),
                    MangaDescription: $b(mangaDescriptionSelector).text(),
                    CoverImageUrl: $b(coverImageUrlSelector).attr('src'),
                    Author: $b(authorSelector).text(),
                    Genres: $b(genresSelector).map((index, el) => $b(el).text()).get(),
                    Chapters: $b(chaptersSelector).map((index, el) => {
                        const chapterNumber = $b(el).text();
                        const chapterLink = $b(el).attr('href');
                        return {
                            ChapterNumber: chapterNumber,
                            ChapterLink: chapterLink,
                        };
                    }).get(),
                };

                await mangaPage.close();

                // Load the scraped manga data and check if the manga has been scraped already
                if (scrapedMangaData[mangaData.MangaTitle]) {
                    console.log(`- Manga ${mangaData.MangaTitle} is already scraped. Checking for new chapters...`);

                    // Filter out already scraped chapters
                    mangaData.Chapters = mangaData.Chapters.filter(chapter => !scrapedMangaData[mangaData.MangaTitle].Chapters.some(chap => chap.ChapterNumber === chapter.ChapterNumber));

                    if (mangaData.Chapters.length === 0) {
                        console.log(`-- No new chapters found for ${mangaData.MangaTitle}.`);
                        return null; // No new chapters to scrape
                    }
                    else {
                        console.log(`-- Found new chapters for ${mangaData.MangaTitle}.`);
                    }
                }
                else {
                    console.log(`- Manga ${mangaData.MangaTitle} is not scraped. Scraping for all chapters...`);
                }

                // Limit the number of chapters to scrape
                mangaData.Chapters = mangaData.Chapters.slice(0, maxChaptersToScrape);

                const chapterURLs = mangaData.Chapters.map(chapter => chapter.ChapterLink);

                // Record scraped manga data except the chapters list for new manga in the scrapedMangaData
                if (!scrapedMangaData[mangaData.MangaTitle]) {
                    scrapedMangaData[mangaData.MangaTitle] = { ...mangaData };
                    scrapedMangaData[mangaData.MangaTitle].Chapters = [];
                }

                for (const chapUrl of chapterURLs) {
                    let chapterRetries = 0;

                    while (chapterRetries < maxRetries) {
                        try {
                            const chapterPage = await browser.newPage();

                            await chapterPage.goto(chapUrl);

                            const chapterHtmlContent = await chapterPage.content();
                            const $c = load(chapterHtmlContent);

                            const chapterImageURLs = $c(chapterImageURLsSelector).map((index, el) => $c(el).attr('src')).get();

                            await chapterPage.close();

                            // Find the corresponding chapter in mangaData.Chapters and add the image URLs
                            const chapterIndex = mangaData.Chapters.findIndex(chapter => chapter.ChapterLink === chapUrl);

                            if (chapterIndex !== -1) {
                                mangaData.Chapters[chapterIndex].ChapterImageURLs = chapterImageURLs;
                            }

                            scrapedMangaData[mangaData.MangaTitle].Chapters.push(mangaData.Chapters[chapterIndex]);

                            console.log('+ Scraped %s for %s, number of image links: %d', mangaData.Chapters[chapterIndex].ChapterNumber, mangaData.MangaTitle, chapterImageURLs.length);
                            break;
                        }
                        catch (error) {
                            console.error('Error during scraping chapter:', error);
                            console.error(`Retrying (${chapterRetries + 1}/${maxRetries})...`);
                            chapterRetries++;
                        }
                    }

                    if (chapterRetries === maxRetries) {
                        console.error(`Max retries (${maxRetries}) reached. Unable to scrape the chapter.`);
                        return null;
                    }
                }

                console.log('~ Manga %s scraped successfully.', mangaData.MangaTitle);

                return mangaData;
            }
            catch (error) {
                console.error('Error during scraping manga:', error);
                console.error(`Retrying (${mangaRetries + 1}/${maxRetries})...`);
                mangaRetries++;
            }
        }

        console.error(`Max retries (${maxRetries}) reached. Unable to scrape the manga.`);
        return null;
    });
}

function convertToObject(data) {
    const mangaDataObject = {};

    data.forEach((manga) => {
        if (manga.MangaTitle) {
            mangaDataObject[manga.MangaTitle] = manga;
        }
    });

    return mangaDataObject;
}

export { mangaScraperObject };
