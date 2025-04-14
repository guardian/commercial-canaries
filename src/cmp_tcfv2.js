const synthetics = require('Synthetics');
const {
	checkCMPIsOnPage,
	checkCMPIsNotVisible,
	interactWithCMPTcfv2,
} = require('./utils/cmp');
const { TWO_SECONDS, TWENTY_SECONDS } = require('./utils/constants');
const { log, logError } = require('./utils/logging');
const {
	clearLocalStorage,
	clearCookies,
	loadPage,
	reloadPage,
} = require('./utils/page');

const LOG_EVERY_REQUEST = false;
const LOG_EVERY_RESPONSE = false;

const checkTopAdHasLoaded = async (page, pageType) => {
	log(`Waiting for ads to load: Start`);
	try {
		await page.waitForSelector(
			'.ad-slot--top-above-nav .ad-slot__content iframe',
			{ timeout: TWENTY_SECONDS },
		);
	} catch (e) {
		logError(`Failed to load top-above-nav ad: ${e.message}`);
		await synthetics.takeScreenshot(
			`${pageType}-page`,
			'Failed to load top-above-nav ad',
		);
		throw new Error('top-above-nav ad did not load');
	}

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

const getCurrentLocation = async (page) => {
	const currentLocation = () => {
		// eslint-disable-next-line no-undef -- document object exists in the browser only
		return document.cookie
			.split('; ')
			.find((row) => row.startsWith('GU_geo_country='))
			?.split('=')[1];
	};

	return await page.evaluate(currentLocation);
};

const checkPrebid = async (page) => {
	const currentLocation = await getCurrentLocation(page);

	await reloadPage(page);

	log(`[TEST 4: PREBID BUNDLE] Checking: graun.Prebid.js.commercial.js`);
	try {
		await page.waitForRequest(
			(req) => req.url().includes('graun.Prebid.js.commercial.js'),
			{ timeout: TWO_SECONDS },
		);
	} catch (timeoutError) {
		if (currentLocation === 'CA') {
			log('[TEST 4: PREBID BUNDLE] In Canada we do not run Prebid');
			return Promise.resolve();
		}
		const hasPageskin = await page.evaluate(() =>
			// eslint-disable-next-line no-undef -- document object exists in the browser only
			document.body.classList.contains('has-page-skin'),
		);

		if (hasPageskin) {
			log('[TEST 4: PREBID BUNDLE] Pageskin detected. Prebid will not run');
			return Promise.resolve();
		}

		logError('[TEST 4: PREBID BUNDLE] Prebid bundle not loaded');
		throw timeoutError;
	}
	log(`[TEST 4: PREBID BUNDLE] Step complete`);

	log(`[TEST 4: PUBMATIC] Step start`);
	const prebidURL =
		'https://hbopenbid.pubmatic.com/translator?source=prebid-client';

	await page.waitForRequest((req) => req.url().includes(prebidURL), {
		timeout: TWO_SECONDS,
	});
	log(`[TEST 4: PUBMATIC] Step complete`);

	log(`[TEST 4: PBJS] Step start`);
	const hasPrebid = await page.waitForFunction(
		() =>
			// eslint-disable-next-line no-undef -- window object exists in the browser only
			window.pbjs !== undefined,
		{ timeout: TWO_SECONDS },
	);
	if (!hasPrebid) {
		logError('[TEST 4: PBJS] Prebid.js is not loaded');
		throw new Error('Prebid.js is missing');
	}
	log(`[TEST 4: PBJS] Step complete`);

	log(`[TEST 4: BID RESPONSE] Step start`);
	await page.waitForFunction(
		() => {
			// eslint-disable-next-line no-undef -- window object exists in the browser only
			const events = window.pbjs?.getEvents() ?? [];
			return events.find(
				(event) =>
					event.eventType === 'auctionInit' &&
					event.args.adUnitCodes.includes('dfp-ad--top-above-nav'),
			);
		},
		{ timeout: TWO_SECONDS },
	);

	const topAboveNavBidderRequests = await page.evaluate(() => {
		// eslint-disable-next-line no-undef -- window object exists in the browser only
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
		'oxd',
		'and',
		'pubmatic',
		'ix',
		'adyoulike',
		'ozone',
		'criteo',
		'ttd',
		'rubicon',
	];

	if (currentLocation === 'UK') {
		expectedBidders.push('xhb');
	}

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
			logError(`[TEST 4: BID RESPONSE] Missing bidder: ${bidder}`);
			throw new Error('Bidders did not match');
		}
	});
	if (allMatched) {
		log(`[TEST 4: BID RESPONSE] All bidders matched`);
	} else {
		log(`[TEST 4: BID RESPONSE] Not all bidders matched`);
	}
	log(`[TEST 4: BID RESPONSE] Step complete`);
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
	log(
		`[TEST 1] start: CMP loads and the ads are NOT displayed on initial load`,
	);
	await reloadPage(page);
	await new Promise((r) => setTimeout(r, TWO_SECONDS)); // Wait an extra two seconds after reloading the page
	await synthetics.takeScreenshot(`${pageType}-page`, 'page loaded');
	await checkCMPIsOnPage(page, pageType);
	await checkTopAdDidNotLoad(page);
	log(`[TEST 1] completed`);

	log(
		`[TEST 2] start: Adverts load and the CMP is NOT displayed following interaction with the CMP`,
	);
	await interactWithCMPTcfv2(page);
	await checkCMPIsNotVisible(page);
	await checkTopAdHasLoaded(page, pageType);
	log(`[TEST 2]  completed`);

	log(
		`[TEST 3] start: Adverts load and the CMP is NOT displayed when the page is reloaded`,
	);
	await reloadPage(page);
	await new Promise((r) => setTimeout(r, TWO_SECONDS)); // Wait an extra two seconds after reloading the page
	await synthetics.takeScreenshot(
		`${pageType}-page`,
		'CMP clicked then page reloaded',
	);
	await checkCMPIsNotVisible(page);
	await checkTopAdHasLoaded(page, pageType);
	log(`[TEST 3] completed`);

	log(`[TEST 4] start: Prebid`);
	await checkPrebid(page);
	log(`[TEST 4] completed`);

	log(
		`[TEST 5] start: After we clear local storage and cookies, the CMP banner is displayed once again`,
	);
	await clearLocalStorage(page);
	await clearCookies(page);
	await reloadPage(page);
	await new Promise((r) => setTimeout(r, TWO_SECONDS)); // Wait an extra two seconds after reloading the page
	await synthetics.takeScreenshot(
		`${pageType}-page`,
		'cookies and local storage cleared then page reloaded',
	);
	await checkCMPIsOnPage(page, pageType);
	await checkTopAdDidNotLoad(page);
	log(`[TEST 5] completed`);
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

	// The query param "adtest=fixed-puppies-ci" is used to ensure that GAM provides us with an ad for our slot
	await synthetics.executeStep('Test Front page', async function () {
		await checkPage(
			'front',
			'https://www.theguardian.com?adtest=fixed-puppies-ci',
		);
	});

	await synthetics.executeStep('Test Article page', async function () {
		await checkPage(
			'article',
			'https://www.theguardian.com/environment/2022/apr/22/disbanding-of-dorset-wildlife-team-puts-birds-pray-at-risk?adtest=fixed-puppies-ci',
		);
	});
};

exports.handler = async () => {
	return await pageLoadBlueprint();
};
