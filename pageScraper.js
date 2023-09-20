    import pLimit from 'p-limit';
    import { load } from "cheerio";
    import fs, { readFileSync } from 'fs';

    const concurrencyLimit = 2;
    const maxChaptersToScrape = 5;
    const maxMangaToScrape = 1;

    const scrapedMangaDataFile = 'results.json';

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

        async scraper(mainBrowser){
            const scrapedMangaData = loadScrapedMangaData();

            const pageUrls = await fetchWebsiteUrls(url, mainBrowser);

            const tasks = pageUrls.map(link => scrapeChapterDetailsFromLink(link, mainBrowser, scrapedMangaData));
            
            (await Promise.all(tasks)).filter(result => result !== null);
            
            saveScrapedMangaData(scrapedMangaData);
        }
    };

    async function fetchWebsiteUrls(pageUrl, browser){
        let page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 768 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36');
        await page.setExtraHTTPHeaders({
            'Accept':'*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding':'gzip, deflate, br',
            'Referer': 'https://www.google.com/',
        });
        
        await page.goto(pageUrl);
        
        const pageContent = await page.content();
        
        console.log(`Navigated to ${pageUrl}...`);
        const $a = load(pageContent);

        return $a(mangaLinksSelector)
        .map((index, el) => $a(el).attr('href')).get()
        .slice(0, maxMangaToScrape);
    }

    async function scrapeChapterDetailsFromLink(link, browser, scrapedMangaData) {
        const limit = pLimit(concurrencyLimit);
        
        return limit(async () => {
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
            if (scrapedMangaData[mangaData.MangaTitle]){
                console.log(`- Manga ${mangaData.MangaTitle} is already scraped. Checking for new chapters...`);
                
                // Filter out already scraped chapters
                mangaData.Chapters = mangaData.Chapters.filter(chapter => !scrapedMangaData[mangaData.MangaTitle].Chapters.some(chap => chap.ChapterNumber === chapter.ChapterNumber));
                
                if (mangaData.Chapters.length === 0) {
                    console.log(`-- No new chapters found for ${mangaData.MangaTitle}.`);
                    return scrapedMangaData[mangaData.MangaTitle]; // No new chapters to scrape
                }
                else{
                    console.log(`-- Found new chapters for ${mangaData.MangaTitle}.`);
                }
            }
            else{
                console.log(`- Manga ${mangaData.MangaTitle} is not scraped. Scraping for all chapters...`);
            }
            
            // Limit the number of chapters to scrape
            mangaData.Chapters = mangaData.Chapters.slice(0, maxChaptersToScrape);
            
            const chapterURLs = mangaData.Chapters.map(chapter => chapter.ChapterLink);
            
            // Record scraped manga data except the chapters list for new manga in the scrapedMangaData
            if (!scrapedMangaData[mangaData.MangaTitle]) {
                scrapedMangaData[mangaData.MangaTitle] = {...mangaData};
                scrapedMangaData[mangaData.MangaTitle].Chapters = [];
            }

            for (const chapUrl of chapterURLs) {
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
                
                console.log('+ Scraped %s for %s, number of image links: %d', mangaData.Chapters[chapterIndex].ChapterNumber , mangaData.MangaTitle, chapterImageURLs.length);
            }
            
            console.log('~ Manga %s scraped successfully.', mangaData.MangaTitle);
            
            return scrapedMangaData[mangaData.MangaTitle];
        });
    }

    function loadScrapedMangaData() {
        try {
            const data = readFileSync(scrapedMangaDataFile);
            const mangaArray = JSON.parse(data);
            return mangaArray;
        } catch (error) {
            return {};
        }
    }

    function saveScrapedMangaData(results) {
        try {
            // const mangaDataObject = {};

            // results.forEach((manga) => {
            //     if (manga.MangaTitle) {
            //         mangaDataObject[manga.MangaTitle] = manga;
            //     }
            // });

            fs.writeFileSync('results.json', JSON.stringify(results, null, 2)); // Filter out null results (no new chapters)
            console.log('Data saved.');
        } catch (error) {
            console.error('Error while saving data:', error.message);
        }
    }


    export { mangaScraperObject };
