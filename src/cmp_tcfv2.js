const synthetics = require('Synthetics');
const logger = require('SyntheticsLogger');

const LOG_EVERY_REQUEST = false;
const LOG_EVERY_RESPONSE = false;

let startTime = new Date().getTime();
const getTimeSinceStart = () => new Date().getTime() - startTime;

/**
 * We use custom log messages so that we can easily differentiate
 * between logs from this file and other logs in Cloudwatch.
 */
const formatMessage = (message) =>
	`GuCanaryRun. Time: ${getTimeSinceStart() / 1000}s. Message: ${message}`;

const log = (message) => {
	logger.info(formatMessage(message));
};
const logError = (message) => {
	logger.error(formatMessage(message));
};

const clearCookies = async (page) => {
	const allCookies = await page.cookies();
	await page.deleteCookie(...allCookies);
	log(`Cleared Cookies`);
};

const clearLocalStorage = async (page) => {
	await page.evaluate(() => localStorage.clear());
	log(`Cleared local storage`);
};

const checkTopAdHasLoaded = async (page) => {
	log(`Waiting for ads to load: Start`);
	await page.waitForSelector(
		'.ad-slot--top-above-nav .ad-slot__content iframe',
		{ timeout: 30000 },
	);
	log(`Waiting for ads to load: Complete`);
};

const checkTopAdDidNotLoad = async (page) => {
	log(`Checking ads do not load: Start`);

	const frame = await page.$(
		'.ad-slot--top-above-nav .ad-slot__content iframe',
	);

	if (frame !== null) {
		logError(`Checking ads do not load: Failed`);
		throw Error('Top above nav frame present on page');
	}

	log(`Checking ads do not load: Complete`);
};

const interactWithCMP = async (page) => {
	// When AWS Synthetics use a more up-to-date version of Puppeteer, we can make use of waitForFrame()
	log(`Clicking on "Yes I'm Happy"`);
	const frame = page
		.frames()
		.find((f) => f.url().startsWith('https://sourcepoint.theguardian.com'));

	// Accept cookies
	await frame.click(
		'div.message-component.message-row > button.btn-primary.sp_choice_type_11',
	);
};

const checkCMPIsOnPage = async (page) => {
	log(`Waiting for CMP: Start`);
	await page.waitForSelector('[id*="sp_message_container"]');
	log(`Waiting for CMP: Finish`);
};

const checkCMPIsNotVisible = async (page) => {
	log(`Checking CMP is Hidden: Start`);

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

	log('CMP hidden or removed from page');
};

const reloadPage = async (page) => {
	log(`Reloading page: Start`);
	const reloadResponse = await page.reload({
		waitUntil: 'domcontentloaded',
		timeout: 30000,
	});
	if (!reloadResponse) {
		logError(`Reloading page: Failed`);
		throw 'Failed to refresh page!';
	}

	// We see some run failures if we do not include a wait time after a page load
	await page.waitForTimeout(3000);

	log(`Reloading page: Complete`);
};

const loadPage = async (page, url) => {
	log(`Loading page: Start`);
	const response = await page.goto(url, {
		waitUntil: 'domcontentloaded',
		timeout: 30000,
	});
	if (!response) {
		logError('Loading page: Failed');
		throw 'Failed to load page!';
	}

	// If the response status code is not a 2xx success code
	if (response.status() < 200 || response.status() > 299) {
		logError(`Loading page: Failed. Status code: ${response.status()}`);
		throw 'Failed to load page!';
	}

	// We see some run failures if we do not include a wait time after a page reload
	await page.waitForTimeout(3000);

	log(`Loading page: Complete`);
};

const getCurrentLocation = async (page) => {
	const currentLocation = () => {
		return document.cookie
			.split('; ')
			.find((row) => row.startsWith('GU_geo_country='))
			?.split('=')[1];
	};

	return await page.evaluate(currentLocation);
};

const checkPrebid = async (page) => {
	log(`Reloading page: Start`);
	const reloadResponse = await page.reload({
		waitUntil: 'domcontentloaded',
		timeout: 30000,
	});
	if (!reloadResponse) {
		logError(`Reloading page : Failed`);
		throw 'Failed to refresh page!';
	}
	log(`Reloading page: Complete`);

	const currentLocation = await getCurrentLocation(page);
	if (currentLocation === 'CA') {
		log('In Canada we do not run Prebid');
		return Promise.resolve();
	}

	const hasPageskin = await page.evaluate(() =>
		document.body.classList.contains('has-page-skin'),
	);

	if (hasPageskin) {
		log('Pageskin detected. Prebid will not run');
		return Promise.resolve();
	}

	const prebidURL =
		'https://hbopenbid.pubmatic.com/translator?source=prebid-client';

	await page.waitForRequest((req) => req.url().includes(prebidURL));
	log(`Prebid check: Complete`);
};

/**
 * Checks that ads load correctly for the first time a user goes to
 * the site, with respect to and interaction with the CMP.
 */
const checkPage = async (pageType, url) => {
	log(`Start checking page: ${url}`);

	let page = await synthetics.getPage();

	// Reset the page state to a point where the we can start testing. Local storage can
	// only be cleared once the page has loaded.
	await loadPage(page, url);
	await clearLocalStorage(page);
	await clearCookies(page);

	// Now we can run our tests.

	// Test 1: CMP loads and the ads are NOT displayed on initial load
	await reloadPage(page);
	await synthetics.takeScreenshot(`${pageType}-page`, 'page loaded');
	await checkCMPIsOnPage(page);
	await checkTopAdDidNotLoad(page);

	// Test 2: Adverts load and the CMP is NOT displayed following interaction with the CMP
	await interactWithCMP(page);
	await checkCMPIsNotVisible(page);
	await checkTopAdHasLoaded(page);

	// Test 3: Adverts load and the CMP is NOT displayed when the page is reloaded
	await reloadPage(page);
	await synthetics.takeScreenshot(
		`${pageType}-page`,
		'CMP clicked then page reloaded',
	);
	await checkCMPIsNotVisible(page);
	await checkTopAdHasLoaded(page);

	//Test 4: Prebid
	await checkPrebid(page);

	// Test 5: After we clear local storage and cookies, the CMP banner is displayed once again
	await clearLocalStorage(page);
	await clearCookies(page);
	await reloadPage(page);
	await synthetics.takeScreenshot(
		`${pageType}-page`,
		'cookies and local storage cleared then page reloaded',
	);
	await checkCMPIsOnPage(page);
	await checkTopAdDidNotLoad(page);
};

const pageLoadBlueprint = async function () {
	const synConfig = synthetics.getConfiguration();
	synConfig.setConfig({
		/**
		 * Set harFile to true to see a detailed log of the HTTP requests that were made when the canary was run,
		 * along with the responses and the amount of time that it took for the request to complete:
		 */
		harFile: false,
		/**
		 * Setting logRequest and logResponse to true will log all requests/responses in the Cloudwatch logs.
		 * There are ~1000 of each, which makes it difficult to search through Cloudwatch
		 * when set to true, yet may be helpful for extra debugging.
		 */
		logRequest: LOG_EVERY_REQUEST,
		logResponse: LOG_EVERY_RESPONSE,
		screenshotOnStepStart: false,
		screenshotOnStepSuccess: false,
		screenshotOnStepFailure: true,
	});

	startTime = new Date().getTime();

	// The query param "adtest=fixed-puppies" is used to ensure that GAM provides us with an ad for our slot
	await synthetics.executeStep('Test Front page', async function () {
		await checkPage(
			'front',
			'https://www.theguardian.com?adtest=fixed-puppies',
		);
	});

	await synthetics.executeStep('Test Article page', async function () {
		await checkPage(
			'article',
			'https://www.theguardian.com/environment/2022/apr/22/disbanding-of-dorset-wildlife-team-puts-birds-pray-at-risk?adtest=fixed-puppies',
		);
	});
};

exports.handler = async () => {
	return await pageLoadBlueprint();
};
