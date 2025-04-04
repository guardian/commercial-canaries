const synthetics = require('Synthetics');
const {
	clearLocalStorage,
	clearCookies,
	loadPage,
	reloadPage,
	getCurrentLocation,
} = require('./lib/page');
import { log, logError } from './logging';

const TOP_ABOVE_NAV_SELECTOR =
	'.ad-slot--top-above-nav .ad-slot__content iframe';
const TWO_SECONDS = 2000;

export const checkTopAdHasLoaded = async (page) => {
	log(`Waiting for ads to load: Start`);
	try {
		await page.waitForSelector(TOP_ABOVE_NAV_SELECTOR, {
			timeout: TWO_SECONDS,
		});
	} catch (e) {
		logError(`Failed to load top-above-nav ad: ${e.message}`);
		await synthetics.takeScreenshot(
			`${page}-page`,
			'Failed to load top-above-nav ad',
		);
		throw new Error('top-above-nav ad did not load');
	}
	log(`Waiting for ads to load: Complete`);
};

export const checkTopAdDidNotLoad = async (page) => {
	log(`Checking ads do not load: Start`);
	const frame = await page.$(TOP_ABOVE_NAV_SELECTOR);
	if (frame !== null) {
		logError('Checking ads do not load: Failed');
		throw Error('Top above nav frame present on page');
	}
	log(`Checking ads do not load: Complete`);
};

const pageLoadFront = async function () {
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
		logRequest: process.env,
		logResponse: LOG_EVERY_RESPONSE,
		screenshotOnStepStart: false,
		screenshotOnStepSuccess: false,
		screenshotOnStepFailure: true,
	});

	/** The query param "adtest=fixed-puppies-ci" is used to ensure that GAM provides us with an ad for our slot */
	const url = 'https://www.theguardian.com?adtest=fixed-puppies-ci';
	const pageType = 'front';

	let page = await synthetics.getPage();

	await synthetics.executeStep('loadPage', async function () {
		// Reset the page state to a point where the we can start testing.
		// Local storage can only be cleared once the page has loaded.
		await loadPage(page, url);
		await clearLocalStorage(page);
		await clearCookies(page);
	});

	await synthetics.executeStep('checkCmp', async function () {
		log('CMP loads and the ads are NOT displayed on initial load');
		await reloadPage(page);
		await synthetics.takeScreenshot(`${pageType}-page`, 'page loaded');
		await checkCMPIsOnPage(page);
		await checkTopAdDidNotLoad(page);
	});

	await synthetics.executeStep('acceptCookies', async function () {
		log(
			'Adverts load and the CMP is NOT displayed following interaction with the CMP',
		);
		await interactWithCMP(page);
		await checkCMPIsNotVisible(page);
		await checkTopAdHasLoaded(page);
	});

	await synthetics.executeStep('reloadAfterCmp', async function () {
		log('Adverts load and the CMP is NOT displayed when the page is reloaded');
		await reloadPage(page);
		await synthetics.takeScreenshot(
			`${pageType}-page`,
			'CMP clicked then page reloaded',
		);
		await checkCMPIsNotVisible(page);
		await checkTopAdHasLoaded(page);
	});

	await synthetics.executeStep('prebidBundleCheck', async function () {
		const reloadResponse = await page.reload({
			waitUntil: 'domcontentloaded',
			timeout: 30000,
		});
		if (!reloadResponse) {
			logError(`[Prebid: RELOAD PAGE] Reloading page : Failed`);
			throw 'Failed to refresh page!';
		}

		try {
			await page.waitForRequest(
				(req) => req.url().includes('graun.Prebid.js.commercial.js'),
				TWO_SECONDS,
			);
		} catch (e) {
			const currentLocation = await getCurrentLocation(page);
			const hasPageskin = await page.evaluate(() =>
				document.body.classList.contains('has-page-skin'),
			);
			if (currentLocation === 'CA') {
				log('In Canada we do not run Prebid');
				Promise.resolve();
			} else if (hasPageskin) {
				log('Pageskin detected. Prebid will not run');
				Promise.resolve();
			} else {
				logError('No Prebid bundle loaded');
				throw Error('No request to Prebid bundle made');
			}
		}
	});

	await synthetics.executeStep('prebidPubmaticCheck', async function () {
		const prebidURL =
			'https://hbopenbid.pubmatic.com/translator?source=prebid-client';
		const pubmaticUrlCalled = await page.waitForRequest((req) =>
			req.url().includes(prebidURL),
		);
		if (!pubmaticUrlCalled) {
			logError('pubmatic URL not called');
			throw Error('Prebid call to Pubmatic not found');
		}
	});

	await synthetics.executeStep('pbjsCheck', async function () {
		const hasPrebid = await page.waitForFunction(
			() => window.pbjs !== undefined,
		);
		if (!hasPrebid) {
			const msg = 'window.pbjs not found';
			logError(msg);
			throw Error(msg);
		}
	});

	await synthetics.executeStep('prebidBidResponse', async function () {
		const auctionInitEvent = window.pbjs
			?.getEvents()
			.find(
				(event) =>
					event.eventType === 'auctionInit' &&
					event.args.adUnitCodes.includes('dfp-ad--top-above-nav'),
			);

		await page.waitForFunction(() => auctionInitEvent, { timeout: 10000 });

		const topAboveNavBidderRequests = await page.evaluate(
			() => auctionInitEvent?.args.bidderRequests || [],
		);

		const currentLocation = await getCurrentLocation(page);

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
			...(currentLocation === 'UK' ? ['xhb'] : []),
		];

		if (topAboveNavBidderRequests.length === 0) {
			log('No bid requests found');
		}
		if (topAboveNavBidderRequests.length !== expectedBidders.length) {
			log(
				`Expected ${expectedBidders.length} bidders, got ${topAboveNavBidderRequests.length}`,
			);
		}

		const actualBidders = topAboveNavBidderRequests.map(_.bidderCode);
		log(`Actual Bidders ${JSON.stringify(actualBidders)}`);

		expectedBidders.forEach((bidder) => {
			if (!actualBidders.includes(bidder)) {
				const msg = `Missing bidder: ${bidder}`;
				logError(msg);
				throw Error(msg);
			}
		});
	});

	await synthetics.executeStep('clearStorageAndCookies', async function () {
		log(
			'After clearing local storage and cookies, the CMP banner is displayed again',
		);
		await clearLocalStorage(page);
		await clearCookies(page);
		await reloadPage(page);
		await synthetics.takeScreenshot(
			`${pageType}-page`,
			'cookies and local storage cleared then page reloaded',
		);
		await checkCMPIsOnPage(page);
		await checkTopAdDidNotLoad(page);
	});
};

exports.handler = async () => {
	return await pageLoadFront();
};
