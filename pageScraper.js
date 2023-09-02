import pLimit from 'p-limit';
import fs from 'fs';
const concurrencyLimit = 3;

const mangaScraperObject = {
    url: 'https://saytruyenhay.com/',
    async scraper(browser){
		let page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 768 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36');
        await page.setExtraHTTPHeaders({
            'Accept':'*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding':'gzip, deflate, br',
            'Referer': 'https://www.google.com/',
        });
        
        function randomDelay(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }

		console.log(`Navigating to ${this.url}...`);
		await page.goto(this.url);
        console.log(`Navigated to ${this.url}...`);

        const delay = randomDelay(2000, 5000);
        console.log(`Delaying for ${delay}ms...`);
        await page.waitForTimeout(delay);

        await page.waitForSelector('.manga-content');

        const urls = await page.$$eval('.manga-content .page-item-detail > div:first-of-type a', links => {
            return links.map(link => link.href);
        });
        
        const limit = pLimit(concurrencyLimit);

		async function scrapeManga(link) {
            return limit(async () => {
                const newPage = await browser.newPage();
                await newPage.goto(link);
                console.log(`Navigated to ${link}...`);
                const dataObj = {
                    MangaTitle: await newPage.$eval('.post-title > h1', text => text.textContent),
                    MangaDescription: await newPage.$eval('.description-summary p', text => text.textContent),
                    CoverImageUrl: await newPage.$eval('.summary_image img', img => img.src),
                    Author: await newPage.$eval('.tab-summary .post-content > div:nth-child(5) > div:nth-child(2)', text => text.textContent),
                    Genres: await newPage.$$eval('.tab-summary .post-content > div:nth-child(8) a', anchors => anchors.map(anchor => anchor.textContent)),
                    Chapters: await newPage.$$eval(
                        '.list-item.box-list-chapter.limit-height li a',
                        async (anchors) => {
                            const chapterNumbers = anchors.map(anchor => anchor.textContent);
                            const chapterLinks = anchors.map(anchor => anchor.href);
                    
                            return chapterNumbers.map((chapterNumber, index) => ({
                                ChapterNumber: chapterNumber,
                                ChapterLink: chapterLinks[index],
                            }));
                        },
                    )
                };
                await newPage.close();

                const chapterURLs = dataObj.Chapters.map(chapter => chapter.ChapterLink);

                for (const chapUrl of chapterURLs) {
                    const chapterPage = await browser.newPage();
                    await chapterPage.goto(chapUrl);
                    console.log(`Navigated to ${chapUrl}...`);
                    const chapterImageURLs = await chapterPage.$$eval('.page-break img', imgs => imgs.map((img) => img.src));
                    await chapterPage.close();
                    
                    // Find the corresponding chapter in dataObj.Chapters and add the image URLs
                    const chapterIndex = dataObj.Chapters.findIndex(chapter => chapter.ChapterLink === chapUrl);
                    if (chapterIndex !== -1) {
                        dataObj.Chapters[chapterIndex].ChapterImageURLs = chapterImageURLs;
                    }
                }

                console.log('== Manga %s scraped successfully. ==', dataObj.MangaTitle);
                return dataObj;
            });
        }
        
        const tasks = urls.map(link => scrapeManga(link));

        const results = await Promise.all(tasks);

        console.log('Saving data ...');
        fs.writeFileSync('results.json', JSON.stringify(results, null, 2));
        console.log('Data saved.');
	}
    
};

export { mangaScraperObject };
