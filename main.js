import {startBrowser} from './browser.js';
import { startService } from './service.js';
import scraperController from './pageController.js';

let browserInstance = startBrowser();
let serviceInstance = startService();

scraperController(browserInstance, serviceInstance);
