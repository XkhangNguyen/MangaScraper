import { startBrowser } from './browser';
import { startService } from './service';
import scraperController from './pageController';

let browserInstance = startBrowser();
let serviceInstance = startService();

scraperController(browserInstance, serviceInstance);
