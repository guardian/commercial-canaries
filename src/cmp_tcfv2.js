const synthetics = require('Synthetics');
const log = require('SyntheticsLogger');

const LOG_EVERY_REQUEST = false;
const LOG_EVERY_RESPONSE = false;

// So we can differentiate between logs from this file and other logs in Cloudwatch.
const logInfoMessage = (message) => {
	log.info(`GUCanaryRun. Message: ${message}`);
}
const logErrorMessage = (message) => {
	log.error(`GUCanaryRun. Message: ${message}`);
}

const clearLocalStorage = async (page) => {
	await page.evaluate(() => localStorage.clear());
	logInfoMessage(`Cleared local storage`);
}

const clearCookies = async (client) => {
	await client.send('Network.clearBrowserCookies');
	logInfoMessage(`Cleared Cookies`);
}

const checkTopAdHasLoaded = async (page) => {
	logInfoMessage(`Waiting for ads to load: Start`);
	await page.waitForSelector(
		'.ad-slot--top-above-nav .ad-slot__content iframe',
		{ timeout: 30000 }
	);
	logInfoMessage(`Waiting for ads to load: Complete`);
}

const checkTopAdDidNotLoad = async (page) => {
	logInfoMessage(`Checking ads do not load: Start`);

	const frame = await page.$(
		'.ad-slot--top-above-nav .ad-slot__content iframe',
	);

	if (frame !== null) {
		logErrorMessage(`Checking ads do not load: Failed`);
		throw Error('Top above nav frame present on page');
	}

	logInfoMessage(`Checking ads do not load: Complete`);
};

const interactWithCMP = async (page) => {
	// Ensure that Sourcepoint has enough time to load the CMP
	await page.waitForTimeout(5000);
	
	// When AWS Synthetics use a more up-to-date version of Puppeteer, 
	// we can make use of waitForFrame(), and remove the timeout above.
	logInfoMessage(`Clicking on "Yes I'm Happy" on CMP`);
	const frame = page
		.frames()
		.find((f) => f.url().startsWith('https://sourcepoint.theguardian.com'));
	await frame.click('button[title="Yes, I’m happy"]');
}

const checkCMPIsOnPage = async (page) => {
	logInfoMessage(`Waiting for CMP: Start`);
	await page.waitForSelector('[id*="sp_message_container"]');
	logInfoMessage(`Waiting for CMP: Finish`);
}

const checkCMPIsNotVisible = async (page) => {
	logInfoMessage(`Checking CMP is Hidden: Start`);

	const getSpMessageDisplayProperty = function () {
		const element = document.querySelector(
			'[id*="sp_message_container"]',
		);
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

const checkCMPDidNotLoad = async (page) => {
	logInfoMessage(`Checking CMP does not load: Start`);

	const spMessageContainer = await page.$('[id*="sp_message_container"]');

	if (spMessageContainer !== null) {
		logErrorMessage(`Checking CMP does not load: Failed`);
		throw Error('CMP present on page');
	}

	logInfoMessage(`Checking CMP does not load: Complete`);
};

const reloadPage = async (page) => {
	logInfoMessage(`Reloading page: Start`);
	const reloadResponse = await page.reload({ 
		waitUntil: ["networkidle0", "domcontentloaded"],
		timeout: 30000
	});
	if (!reloadResponse) {
		logErrorMessage(`Reloading page: Failed`);
		throw 'Failed to refresh page!';
	}
	logInfoMessage(`Reloading page: Complete`);
}

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
}

/**
 * Checks that ads load correctly for the second page a user goes to 
 * when visiting the site, with respect to and interaction with the CMP.
 */
const checkSubsequentPage = async (url) => {
	let page = await synthetics.getPage();
	logInfoMessage(`Start checking subsequent Page URL: ${url}`);
		
	await loadPage(page, url);

	// There is no CMP since this we have already accepted this on a previous page.
	await checkTopAdHasLoaded(page);

	const client = await page.target().createCDPSession();
	await clearCookies(client);
	await clearLocalStorage(page);

	await reloadPage(page);

	await checkTopAdDidNotLoad(page);

	await interactWithCMP(page);

	await checkCMPIsNotVisible(page);

	await checkTopAdHasLoaded(page);
}

/**
 * Checks that ads load correctly for the first time a user goes to 
 * the site, with respect to and interaction with the CMP.
 */
const checkPages = async (url, nextUrl) => {
	let page = await synthetics.getPage();
	logInfoMessage(`Start checking Page URL: ${url}`);

	// Clear cookies before starting testing, to ensure the CMP is displayed.
	const client = await page.target().createCDPSession();
	await clearCookies(client);

	await loadPage(page, url);

	await clearLocalStorage(page);

	await checkCMPIsOnPage(page);

	await checkTopAdDidNotLoad(page);

	await interactWithCMP(page);

	await checkCMPIsNotVisible(page);

	await checkTopAdHasLoaded(page);

	await reloadPage(page);

	await checkTopAdHasLoaded(page);

	await checkCMPDidNotLoad(page);

	if (nextUrl) {
		await checkSubsequentPage(nextUrl);
	}
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
		logResponse: LOG_EVERY_RESPONSE
	});

	/**
	 * Check front as first navigation. Then, check that ads load when viewing an article.
	 */
	await checkPages(
		// The query param "adtest=fixed-puppies" is used to ensure that GAM provides us with an ad for our slot
		'https://www.theguardian.com?adtest=fixed-puppies',
		'https://www.theguardian.com/food/2020/dec/16/how-to-make-the-perfect-vegetarian-sausage-rolls-recipe-felicity-cloake?adtest=fixed-puppies',
	);

	/**
	 * Check Article as first navigation.
	 */
	await checkPages(
		'https://www.theguardian.com/environment/2022/apr/22/disbanding-of-dorset-wildlife-team-puts-birds-pray-at-risk?adtest=fixed-puppies',
	);
};

exports.handler = async () => {
	return await pageLoadBlueprint();
};
