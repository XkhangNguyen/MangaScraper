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
            // Add more headers as needed
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

		async function mangaPagePromise(link) {
            return limit(async () => {
                const dataObj = {};
                const newPage = await browser.newPage();
                console.log(`Navigating to ${link}...`);
                await newPage.goto(link);

                dataObj['MangaTitle'] = await newPage.$eval('.post-title > h1', text => text.textContent);
                dataObj['MangaDescription'] = await newPage.$eval('.description-summary p', text => text.textContent);
                dataObj['CoverImageUrl'] = await newPage.$eval('.summary_image img', img => img.src);
                dataObj['Author'] = await newPage.$eval('.tab-summary .post-content > div:nth-child(5) > div:nth-child(2)', text => text.textContent);
                dataObj['Genres'] = await newPage.$$eval('.tab-summary .post-content > div:nth-child(8) a', anchors => {
                    return anchors.map(anchor => anchor.textContent);
                });
                dataObj['ChaptersUrls'] = await newPage.$$eval('.list-item.box-list-chapter.limit-height li a', anchors => {
                    return anchors.map(anchor => anchor.href);
                });

                await newPage.close();
                console.log('== Manga %s scraped successfully. ==', dataObj.MangaTitle);
                return dataObj;
            });
        }

        
        const tasks = urls.map(link => mangaPagePromise(link));

        const results = await Promise.all(tasks);

        console.log('Saving data ...');
        fs.writeFileSync('results.json', JSON.stringify(results, null, 2));
        console.log('Data saved.');

        await browser.close();

        
	}
    
};

export { mangaScraperObject };
