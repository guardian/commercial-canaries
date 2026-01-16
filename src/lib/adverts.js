const { log } = require('console');
const synthetics = require('Synthetics');
const { logError } = require('./logging');
const { secondsInMillis } = require('./utils');

const TOP_ABOVE_NAV_SELECTOR =
	'.ad-slot--top-above-nav .ad-slot__content iframe';

const checkTopAdHasLoaded = async (page, pageType) => {
	log(`Waiting for ads to load: Start`);
	try {
		await page.waitForSelector(TOP_ABOVE_NAV_SELECTOR, {
			timeout: secondsInMillis(20),
		});
	} catch (timeoutError) {
		logError(`Failed to load top-above-nav ad: ${timeoutError.message}`);
		await synthetics.takeScreenshot(
			`${pageType}-page`,
			'Failed to load top-above-nav ad',
		);
		throw timeoutError;
	}
	log(`Waiting for ads to load: Complete`);
};

const checkTopAdDidNotLoad = async (page) => {
	log(`Checking ads do not load: Start`);
	const frame = await page.$(TOP_ABOVE_NAV_SELECTOR);
	if (frame !== null) {
		logError(`Checking ads do not load: Failed`);
		throw new Error('Top above nav frame present on page');
	}
	log(`Checking ads do not load: Complete`);
};

const checkPrebidBundle = async (page) => {
	try {
		await page.waitForRequest(
			(req) => req.url().includes('graun.Prebid.js.commercial.js'),
			{ timeout: secondsInMillis(2) },
		);
	} catch (timeoutError) {
		const hasPageskin = await page.evaluate(() =>
			// eslint-disable-next-line no-undef -- document object exists in the browser only
			document.body.classList.contains('has-page-skin'),
		);
		if (hasPageskin) {
			log('Pageskin detected. Prebid will not run');
			return Promise.resolve();
		}
		logError('Prebid bundle not loaded');
		throw timeoutError;
	}
};

const checkPrebidBidRequest = async (page) => {
	const prebidURL =
		'https://hbopenbid.pubmatic.com/translator?source=prebid-client';
	try {
		await page.waitForRequest((req) => req.url().includes(prebidURL), {
			timeout: secondsInMillis(3),
		});
	} catch (timeoutError) {
		logError('Expected bid request not made');
		throw timeoutError;
	}
};

const checkPbjsPresence = async (page) => {
	try {
		await page.waitForFunction(
			() =>
				// eslint-disable-next-line no-undef -- window object exists in the browser only
				window.pbjs !== undefined,
			{ timeout: secondsInMillis(2) },
		);
	} catch (timeoutError) {
		logError('Prebid.js is not loaded');
		throw timeoutError;
	}
};

const checkBidResponse = async (page, expectedBidders) => {
	await page.waitForFunction(
		() =>
			// eslint-disable-next-line no-undef -- window object exists in the browser only
			window.pbjs
				?.getEvents()
				.find(
					(event) =>
						event.eventType === 'auctionInit' &&
						event.args.adUnitCodes.includes('dfp-ad--top-above-nav'),
				),
		{ timeout: secondsInMillis(2) },
	);

	const topAboveNavBidders = await page.evaluate(
		() =>
			// eslint-disable-next-line no-undef -- window object exists in the browser only
			window.pbjs
				?.getEvents()
				.find(
					(event) =>
						event.eventType === 'auctionInit' &&
						event.args.adUnitCodes.includes('dfp-ad--top-above-nav'),
				)
				?.args.bidderRequests.map((bidder) => bidder.bidderCode) || [],
	);

	if (topAboveNavBidders.length === 0) {
		logError('Bid response not found');
		throw new Error('No bid responses found for top above nav slot');
	}

	if (topAboveNavBidders.length !== expectedBidders.length) {
		logError(
			`Expected ${expectedBidders.length} bidders but got ${topAboveNavBidders.length}`,
		);

		log(`Actual Bidders ${JSON.stringify(topAboveNavBidders)}`);
		logError(
			`Missing bidder ${expectedBidders.find((bidder) => topAboveNavBidders.indexOf(bidder) === -1)}`,
		);
		throw new Error('Bidders did not match expected bidders');
	}
};

module.exports = {
	checkTopAdHasLoaded,
	checkTopAdDidNotLoad,
	checkPrebidBundle,
	checkPrebidBidRequest,
	checkPbjsPresence,
	checkBidResponse,
};
