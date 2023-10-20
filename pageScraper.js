import pLimit from 'p-limit';
import { load } from "cheerio";
import { saveMangasToDatabase } from './database/saveDataToDB.js';
import { loadMangasFromDatabase } from './database/loadDataFromDB.js';
import { endService } from './service.js';

const concurrencyLimit = 2;
const limit = pLimit(concurrencyLimit);

const maxChaptersToScrape = 2;

const maxMangaToScrape = 2;
;
const maxRetries = 5;

const extensions = {
    saytruyen: {
        url: 'https://saytruyenmoi.com/',
        mangaLinksSelector: '.manga-content .page-item-detail > div:first-of-type a',
        mangaTitleSelector: '.post-title > h1',
        mangaDescriptionSelector: '.description-summary p',
        coverImageUrlSelector: '.summary_image img',
        authorSelector: '.tab-summary .post-content > div:nth-child(5) > div:nth-child(2)',
        genresSelector: '.tab-summary .post-content > div:nth-child(8) a',
        chaptersSelector: '.list-item.box-list-chapter.limit-height li a',
        chapterImageURLsSelector: '.page-break > img',
    },
    phetruyen: {
        url: 'https://phetruyen.net/',
        mangaLinksSelector: '#main_homepage .book_info h3 a',
        mangaTitleSelector: '.book_info .book_other h1',
        mangaDescriptionSelector: '.story-detail-info.detail-content p',
        coverImageUrlSelector: '.book_info .book_avatar img',
        authorSelector: '.book_info .book_other .author.row > p:nth-child(2)',
        genresSelector: '.book_info .book_other .list01 li a',
        chaptersSelector: '.list_chapter > div > div a',
        chapterImageURLsSelector: '.page-break > img',
    },
}

const extension = extensions.phetruyen;


const mangaScraperObject = {

    async scraper(mainBrowser, service) {

        const scrapedMangaData = await loadMangasFromDatabase(service);

        const pageUrls = await fetchWebsiteUrls(extension.url, mainBrowser);

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

    return $a(extension.mangaLinksSelector)
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
                    MangaTitle: $b(extension.mangaTitleSelector).text(),
                    MangaDescription: $b(extension.mangaDescriptionSelector).text(),
                    CoverImageUrl: $b(extension.coverImageUrlSelector).attr('src'),
                    Author: $b(extension.authorSelector).text(),
                    Genres: $b(extension.genresSelector).map((index, el) => $b(el).text()).get(),
                    Chapters: $b(extension.chaptersSelector).map((index, el) => {
                        const chapterNumber = $b(el).text();
                        const chapterLink = $b(el).attr('href');
                        return {
                            ChapterNumber: chapterNumber,
                            ChapterLink: chapterLink,
                        };
                    }).get(),
                };

                if (mangaData.Author.trim() === '') {
                    mangaData.Author = 'Đang cập nhật';
                }

                await mangaPage.close();

                // Load the scraped manga data and check if the manga has been scraped already
                if (scrapedMangaData && scrapedMangaData[mangaData.MangaTitle]) {
                    console.log(`- Manga ${mangaData.MangaTitle} is already scraped. Checking for new chapters...`);

                    mangaData.id = scrapedMangaData[mangaData.MangaTitle].id;

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

                            const chapterImageURLs = $c(extension.chapterImageURLsSelector).map((index, el) => $c(el).attr('src')).get();

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
