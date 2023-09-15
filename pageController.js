import { mangaScraperObject } from './pageScraper.js';
//import { proxiesScraperObject } from './proxyRotator.js';
//import  {startBrowserWithProxy}  from './browser.js';

async function scrapeAll(browserInstance){
	let browser;
	try{
		browser = await browserInstance;

		//const proxy = await proxiesScraperObject.scraper(browser);

		//let browserWithProxy = await startBrowserWithProxy(proxy);

		await mangaScraperObject.scraper(browser);
			
		await browser.close();
	}
	catch(err){
		console.log("Could not resolve the browser instance => ", err);
	}
}

export default (browserInstance) => scrapeAll(browserInstance)