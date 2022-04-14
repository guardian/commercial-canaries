const synthetics = require('Synthetics');
const log = require('SyntheticsLogger');

// Initial timestamp used in logging
const startTime = new Date().getTime();
const getTimeSinceStart = () => new Date().getTime() - startTime

// Random ID used in logger below
const runID = Math.floor(Math.random()*10000000000).toString(36);

const taggedLogger = (message) => {
	log.info(`GUCanaryRun:${runID}:${getTimeSinceStart()}ms: ${message}`);
}

const checkAdsDidNotLoad = async (page) => {
	const frame = await page.$(
		'.ad-slot--top-above-nav .ad-slot__content iframe',
	);

	log.info('Top above nav frame on page:', frame !== null);

	if (frame !== null) {
		throw Error('Top above nav frame present on page');
	}
};

const checkCMPDidNotLoad = async (page) => {
	const spMessageContainer = await page.$('[id*="sp_message_container"]');

	log.info('sp_message_container on page:', spMessageContainer !== null);

	if (spMessageContainer !== null) {
		throw Error('CMP present on page');
	}
};

const checkCMPIsHidden = async (page) => {
	taggedLogger(`Checking CMP is Hidden: Start`);

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

	taggedLogger('CMP hidden or removed from page');
};

const checkArticle = async function (URL) {
	taggedLogger(`Checking Article URL ${URL}`);

	let page = await synthetics.getPage();

	// Load page
	const response = await page.goto(URL, {
		waitUntil: 'domcontentloaded',
		timeout: 30000,
	});
	if (!response) {
		throw 'Failed to load page!';
	}

	// Check ads have loaded
	await page.waitForSelector(
		'.ad-slot--top-above-nav .ad-slot__content iframe',
	);

	// Clear cookies
	const client = await page.target().createCDPSession();
	await client.send('Network.clearBrowserCookies');

	// Reload the page
	const reloadResponse = await page.reload({
		waitUntil: 'domcontentloaded',
		timeout: 30000,
	});
	if (!reloadResponse) {
		throw 'Failed to refresh page!';
	}

	// Check no ads load
	await checkAdsDidNotLoad(page);

	// Check banner is shown
	await page.waitForSelector('[id*="sp_message_container"]');
	taggedLogger('CMP loaded');
};

const checkPage = async function (URL) {

	taggedLogger(`Start checking Page URL ${URL}`);

	let page = await synthetics.getPage();

	//clear cookies
	const client = await page.target().createCDPSession();
	await client.send('Network.clearBrowserCookies');
	taggedLogger(`Cleared Cookies`);

	taggedLogger(`Loading URL: Start`);
	const response = await page.goto(URL, {
		waitUntil: 'domcontentloaded',
		timeout: 30000,
	});
	if (!response) {
		taggedLogger('Loading URL: Failed');
		throw 'Failed to load page!';
	}

	//If the response status code is not a 2xx success code
	if (response.status() < 200 || response.status() > 299) {
		taggedLogger(`Loading URL: Error: Status ${response.status()}`);
		throw 'Failed to load page!';
	}
	taggedLogger(`Loading URL: OK`);

	taggedLogger(`Waiting for CMP Container: Start`);
	// wait for CMP
	await page.waitForSelector('[id*="sp_message_container"]');
	taggedLogger(`Waiting for CMP Container: Loaded`);

	// Wait for iframe to load into sp_message_container
	await page.waitFor(5000);

	taggedLogger(`Clicking on "Yes I'm Happy`);

	// Click on Yes I'm happy
	const frame = page
		.frames()
		.find((f) => f.url().startsWith('https://sourcepoint.theguardian.com'));
	await frame.click('button[title="Yes, I’m happy"]');
	await page.waitFor(5000);

	await checkCMPIsHidden(page);

	//ads are loaded
	await page.waitForSelector(
		'.ad-slot--top-above-nav .ad-slot__content iframe',
	);

	// Reload page
	const reloadResponse = await page.reload({
		waitUntil: 'domcontentloaded',
		timeout: 30000,
	});
	if (!reloadResponse) {
		throw 'Failed to refresh page!';
	}

	// Check top-above-nav on page after clicking opting in and reloading
	await page.waitForSelector(
		'.ad-slot--top-above-nav .ad-slot__content iframe',
	);

	// Check CMP is not present on page after reload
	await checkCMPDidNotLoad(page);
};

const pageLoadBlueprint = async function () {
	// Check Front
	await checkPage('https://www.theguardian.com');

	// Check article
	await checkArticle(
		'https://www.theguardian.com/food/2020/dec/16/how-to-make-the-perfect-vegetarian-sausage-rolls-recipe-felicity-cloake',
	);
};

exports.handler = async () => {
	return await pageLoadBlueprint();
};
