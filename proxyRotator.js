import { load } from "cheerio";

const proxiesScraperObject = {
    url:"https://sslproxies.org/",

    async scraper(browser){
        let ip_addresses = [];
        let port_numbers = [];

        console.log(`Navigating to ${this.url}...`);

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
        
        await page.goto(this.url);

        console.log(`Navigated to ${this.url}...`);

        const htmlContent = await page.content();
        const $ = load(htmlContent);

        
        $("td:nth-child(1)").each(function(index, value) {
        ip_addresses[index] = $(this).text();
        });
    
        $("td:nth-child(2)").each(function(index, value) {
        port_numbers[index] = $(this).text();
        });

        ip_addresses.join(", ");
        port_numbers.join(", ");
        
        let random_number = Math.floor(Math.random() * 100);
        let proxy = `http://${ip_addresses[random_number]}:${port_numbers[random_number]}`;
        console.log(proxy);
        return proxy;
    }
}

export { proxiesScraperObject };