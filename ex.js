import { executablePath as _executablePath } from 'puppeteer';

(async () => {
  // Use puppeteer to get the path to the Chromium executable
  const executablePath = _executablePath();

  console.log('Chromium executable path:', executablePath);
})();