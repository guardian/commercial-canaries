const Chromium = require('chrome-aws-lambda');
const synthetics = require('Synthetics');
const log = require('SyntheticsLogger');

const LOG_EVERY_REQUEST = false;
const LOG_EVERY_RESPONSE = false;

/**
 * We use custom log messages so that we can easily differentiate
 * between logs from this file and other logs in Cloudwatch.
 */
const logInfoMessage = (message) => {
	log.info(`GuCanaryRun. Message: ${message}`);
};
const logErrorMessage = (message) => {
	log.error(`GuCanaryRun. Message: ${message}`);
};

const initialiseOptions = async () => {
	return {
		headless: true,
		args: Chromium.args,
		defaultViewport: Chromium.defaultViewport,
		executablePath: await Chromium.executablePath,
		ignoreHTTPSErrors: true,
		devtools: false,
		timeout: 0,
	};
};

const launchBrowser = async (ops) => {
	return await Chromium.puppeteer.launch(ops);
};

const makeNewBrowser = async () => {
	const ops = await initialiseOptions(false);
	const browser = await launchBrowser(ops);
	return browser;
};

const clearCookies = async (client) => {
	await client.send('Network.clearBrowserCookies');
	logInfoMessage(`Cleared Cookies`);
};

const clearLocalStorage = async (page) => {
	await page.evaluate(() => localStorage.clear());
	logInfoMessage(`Cleared local storage`);
};

const checkTopAdHasLoaded = async (page) => {
	logInfoMessage(`Waiting for ads to load: Start`);
	await page.waitForSelector(
		'.ad-slot--top-above-nav .ad-slot__content iframe',
		{ timeout: 30000 },
	);
	logInfoMessage(`Waiting for ads to load: Complete`);
};

const interactWithCMP = async (page) => {
	// Ensure that Sourcepoint has enough time to load the CMP
	await page.waitForTimeout(5000);

	// When AWS Synthetics use a more up-to-date version of Puppeteer,
	// we can make use of waitForFrame(), and remove the timeout above.
	logInfoMessage(`Clicking on "Do not sell my personal information" on CMP`);
	const frame = page
		.frames()
		.find((f) => f.url().startsWith('https://sourcepoint.theguardian.com'));
	await frame.click('button[title="Do not sell my personal information"]');
};

const checkCMPIsOnPage = async (page) => {
	logInfoMessage(`Waiting for CMP: Start`);
	await page.waitForSelector('[id*="sp_message_container"]');
	logInfoMessage(`Waiting for CMP: Finish`);
};

const checkCMPIsNotVisible = async (page) => {
	logInfoMessage(`Checking CMP is Hidden: Start`);

	const getSpMessageDisplayProperty = function () {
		const element = document.querySelector('[id*="sp_message_container"]');
		if (element) {
			const computedStyle = window.getComputedStyle(element);
			return computedStyle.getPropertyValue('display');
		}
	};

	const display = await page.evaluate(getSpMessageDisplayProperty);

	// Use `!=` rather than `!==` here because display is a DOMString type
	if (display && display != 'none') {
		throw Error('CMP still present on page');
	}

	logInfoMessage('CMP hidden or removed from page');
};

const reloadPage = async (page) => {
	logInfoMessage(`Reloading page: Start`);
	const reloadResponse = await page.reload({
		waitUntil: ['networkidle0', 'domcontentloaded'],
		timeout: 30000,
	});
	if (!reloadResponse) {
		logErrorMessage(`Reloading page: Failed`);
		throw 'Failed to refresh page!';
	}
	logInfoMessage(`Reloading page: Complete`);
};

const loadPage = async (page, url) => {
	logInfoMessage(`Loading page: Start`);
	const response = await page.goto(url, {
		waitUntil: 'domcontentloaded',
		timeout: 30000,
	});
	if (!response) {
		logErrorMessage('Loading URL: Failed');
		throw 'Failed to load page!';
	}

	// If the response status code is not a 2xx success code
	if (response.status() < 200 || response.status() > 299) {
		logErrorMessage(`Loading URL: Error: Status ${response.status()}`);
		throw 'Failed to load page!';
	}

	logInfoMessage(`Loading page: Complete`);
};

/**
 * Checks that ads load correctly for the first time a user goes to
 * the site, with respect to and interaction with the CMP.
 */
const checkPage = async (browser, url) => {
	logInfoMessage(`Start checking Page URL: ${url}`);

	const page = await browser.newPage();

	// Clear cookies before starting testing, to ensure the CMP is displayed.
	const client = await page.target().createCDPSession();
	await clearCookies(client);

	// We can't clear local storage before the page is loaded
	await loadPage(page, url);
	await clearLocalStorage(page);
	await reloadPage(page);

	await checkTopAdHasLoaded(page);

	await checkCMPIsOnPage(page);

	await interactWithCMP(page);

	await checkCMPIsNotVisible(page);

	await reloadPage(page);

	await checkTopAdHasLoaded(page);

	await page.close();
};

const pageLoadBlueprint = async function () {
	const synConfig = synthetics.getConfiguration();

	/**
	 * Setting these to true will log all requests/responses in the Cloudwatch logs.
	 * There are ~1000 of each, which makes it difficult to search through Cloudwatch
	 * when set to true, yet may be helpful for extra debugging.
	 */
	synConfig.setConfig({
		logRequest: LOG_EVERY_REQUEST,
		logResponse: LOG_EVERY_RESPONSE,
	});

	let browser = null;
	try {
		browser = await makeNewBrowser();

		/**
		 * Check front as first navigation. Then, check that ads load when viewing an article.
		 * Note: The query param "adtest=fixed-puppies" is used to ensure that GAM provides us with an ad for our slot
		 */
		await checkPage(
			browser,
			'https://www.theguardian.com/us?adtest=fixed-puppies',
		);

		/**
		 * Check Article as first navigation.
		 */
		await checkPage(
			browser,
			'https://www.theguardian.com/food/2020/dec/16/how-to-make-the-perfect-vegetarian-sausage-rolls-recipe-felicity-cloake?adtest=fixed-puppies',
		);
	} catch (error) {
		logErrorMessage(`The canary failed for the following reason: ${error}`);
		throw error;
	} finally {
		if (browser !== null) {
			await browser.close();
		}
	}
};

exports.handler = async () => {
	return await pageLoadBlueprint();
};
