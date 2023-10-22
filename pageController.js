import { mangaScraperObject } from './pageScraper';

async function scrapeAll(browserInstance, serviceInstance) {
	let browser;
	let service;
	try {
		browser = await browserInstance;
		service = serviceInstance;

		await mangaScraperObject.scraper(browser, service);

		await browser.close();
	}
	catch (err) {
		console.log("Could not resolve the browser instance => ", err);
	}
}

export default (browserInstance, serviceInstance) => scrapeAll(browserInstance, serviceInstance)