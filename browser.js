import  puppeteer  from 'puppeteer-extra';
import StealthPlugin  from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin())

//  async function startBrowserWithProxy(proxyServer){
// 	let browserWithProxy;
// 	try {
// 	    console.log(`Opening the browser with ${proxyServer} ......`);
// 	    browserWithProxy = await launch({
// 	        headless: 'new',
// 	        args: [
// 				"--disable-setuid-sandbox",
// 				`--proxy-server=${proxyServer}`,
// 			],
// 	        'ignoreHTTPSErrors': true
// 	    });
// 	} catch (err) {
// 	    console.log("Could not create a browser instance => : ", err);
// 	}
// 	return browserWithProxy;
// }

async function startBrowser(){
	let browser;
	try {
	    console.log(`Opening the browser with no proxy ......`);
	    browser = await puppeteer.launch({
	        headless: 'new',
	        args: [
				"--disable-setuid-sandbox",
			],
	        'ignoreHTTPSErrors': true
	    });
	} catch (err) {
	    console.log("Could not create a browser instance => : ", err);
	}
	return browser;
}

export {startBrowser };
