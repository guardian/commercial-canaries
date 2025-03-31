const { URL } = require('url');
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

const interactWithCMP = async (page) => {
	// When AWS Synthetics use a more up-to-date version of Puppeteer, we can make use of waitForFrame()
	log(`Clicking on "Continue" on CMP`);

	const frame = page.frames().find((f) => {
		const parsedUrl = new URL(f.url());
		return parsedUrl.host === 'sourcepoint.theguardian.com';
	});
	await frame.click('button[title="Continue"]');
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

	// We see some run failures if we do not include a wait time after a page reload
	await page.waitForTimeout(3000);

	log(`Reloading page: Complete`);
};

const checkPrebid = async (page) => {
	// --------------- RELOAD PAGE START ---------------------------
	log(`[TEST 4: RELOAD PAGE] Step start`);
	const reloadResponse = await page.reload({
		waitUntil: 'domcontentloaded',
		timeout: 30000,
	});
	if (!reloadResponse) {
		logError(`[TEST 4: RELOAD PAGE] Reloading page : Failed`);
		throw 'Failed to refresh page!';
	}
	log(`[TEST 4: RELOAD PAGE] Step complete`);
	// --------------- RELOAD PAGE END ---------------------------

	// --------------- BUNDLE START ---------------------------
	log(`[TEST 4: PREBID BUNDLE] Checking: graun.Prebid.js.commercial.js`);
	await page.waitForRequest((req) =>
		req.url().includes('graun.Prebid.js.commercial.js'),
	);
	log(`[TEST 4: PREBID BUNDLE] Step start`);
	// --------------- BUNDLE END ---------------------------

	// --------------- PAGESKIN START ---------------------------
	log(`[TEST 4: PAGESKIN] Step start`);
	const hasPageskin = await page.evaluate(() =>
		document.body.classList.contains('has-page-skin'),
	);

	if (hasPageskin) {
		log('[TEST 4: PAGESKIN] Pageskin detected. Prebid will not run');
		return Promise.resolve();
	}
	log(`[TEST 4: PAGESKIN] Step complete`);
	// --------------- PAGESKIN END ---------------------------

	// --------------- PUBMATIC START ---------------------------
	log(`[TEST 4: PUBMATIC] Step start`);
	const prebidURL =
		'https://hbopenbid.pubmatic.com/translator?source=prebid-client';

	await page.waitForRequest((req) => req.url().includes(prebidURL));
	log(`[TEST 4: PUBMATIC] Step complete`);
	// --------------- PUBMATIC END ---------------------------

	// --------------- PBJS START ---------------------------
	log(`[TEST 4: PBJS] Step start`);
	const hasPrebid = await page.waitForFunction(() => window.pbjs !== undefined);
	if (!hasPrebid) {
		logError('[TEST 4: PBJS] Prebid.js is not loaded');
		throw new Error('Prebid.js is missing');
	}
	log(`[TEST 4: PBJS] Step complete`);
	// --------------- PBJS END ---------------------------

	// --------------- BID RESPONSE START ---------------------------
	log(`[TEST 4: BID RESPONSE] Step start`);

	await page.waitForFunction(
		() => {
			const events = window.pbjs?.getEvents() ?? [];
			return events.find(
				(event) =>
					event.eventType === 'auctionInit' &&
					event.args.adUnitCodes.includes('dfp-ad--top-above-nav'),
			);
		},
		{ timeout: 10000 },
	);

	const topAboveNavBidderRequests = await page.evaluate(() => {
		const auctionInitEvent = window.pbjs
			?.getEvents()
			.find(
				(event) =>
					event.eventType === 'auctionInit' &&
					event.args.adUnitCodes.includes('dfp-ad--top-above-nav'),
			);

		return auctionInitEvent?.args.bidderRequests || [];
	});

	const expectedBidders = [
		'ix',
		'rubicon',
		'criteo',
		'pubmatic',
		'ttd',
		'adyoulike',
		'triplelift',
		'and',
		'oxd',
	];

	if (topAboveNavBidderRequests.length === 0) {
		log('[TEST 4: BID RESPONSE] Bid Response not found.');
	}
	if (topAboveNavBidderRequests.length !== expectedBidders.length) {
		log(
			`[TEST 4: BID RESPONSE] Expected ${expectedBidders.length} bidders, got ${topAboveNavBidderRequests.length}`,
		);
	}

	const theActualBidders = topAboveNavBidderRequests.map(
		(bidder) => bidder.bidderCode,
	);
	log(
		`[TEST 4: BID RESPONSE] Actual Bidders ${JSON.stringify(theActualBidders)}`,
	);

	let allMatched = true;

	expectedBidders.forEach((bidder) => {
		if (!theActualBidders.includes(bidder)) {
			allMatched = false;
			logError('[TEST 4: BID RESPONSE] Missing bidder: ${bidder}');
			throw new Error('Bidders did not match');
		}
	});
	if (allMatched) {
		log(`[TEST 4: BID RESPONSE] All bidders matched`);
	} else {
		log(`[TEST 4: BID RESPONSE] Not all bidders matched`);
	}

	log(`[TEST 4: BID RESPONSE] Step complete`);
	// --------------- BID RESPONSE END ---------------------------
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

	// We see some run failures if we do not include a wait time after a page load
	await page.waitForTimeout(3000);

	log(`Loading page: Complete`);
};

/**
 * Checks that ads load correctly for the first time a user goes to
 * the site, with respect to and interaction with the CMP.
 */
const checkPage = async (pageType, url) => {
	log(`Start checking page: ${url}`);

	let page = await synthetics.getPage();

	// Reset the page state to a point where the we can start testing.
	// Local storage can only be cleared once the page has loaded.
	await loadPage(page, url);
	await clearLocalStorage(page);
	await clearCookies(page);

	// Now we can run our tests.
	log(`[TEST 1] start: Adverts load and the CMP is displayed on initial load`);
	await reloadPage(page);
	await synthetics.takeScreenshot(`${pageType}-page`, 'page loaded');
	await checkCMPIsOnPage(page);
	await checkTopAdHasLoaded(page);
	log(`[TEST 1] completed`);

	log(
		`[TEST 2] start: Adverts load and the CMP is NOT displayed following interaction with the CMP`,
	);
	await interactWithCMP(page);
	await checkCMPIsNotVisible(page);

	await reloadPage(page);
	await synthetics.takeScreenshot(
		`${pageType}-page`,
		'CMP clicked then page reloaded',
	);
	await checkCMPIsNotVisible(page);
	await checkTopAdHasLoaded(page);
	log(`[TEST 2]  completed`);

	log(
		`[TEST 3] start: After we clear local storage and cookies, the CMP banner is displayed once again`,
	);
	await clearLocalStorage(page);
	await clearCookies(page);
	await reloadPage(page);
	await synthetics.takeScreenshot(
		`${pageType}-page`,
		'cookies and local storage cleared then page reloaded',
	);
	await checkCMPIsOnPage(page);
	await checkTopAdHasLoaded(page);
	log(`[TEST 3] completed`);

	log(`[TEST 4] start: Prebid`);
	await checkPrebid(page);
	log(`[TEST 4] completed`);
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

	// The query param "adtest=fixed-puppies-ci" is used to ensure that GAM provides us with an ad for our slot
	await synthetics.executeStep('Test Front page', async function () {
		await checkPage(
			'front',
			'https://www.theguardian.com/au?adtest=fixed-puppies-ci',
		);
	});

	await synthetics.executeStep('Test Article page', async function () {
		await checkPage(
			'article',
			'https://www.theguardian.com/food/2020/dec/16/how-to-make-the-perfect-vegetarian-sausage-rolls-recipe-felicity-cloake?adtest=fixed-puppies-ci',
		);
	});
};

exports.handler = async () => {
	return await pageLoadBlueprint();
};
