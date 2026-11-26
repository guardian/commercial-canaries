const { log, logError } = require('./logging');
const { secondsInMillis } = require('./time');

/**
 * Checks that the prebid bundle is loaded. If there is a pageskin, then
 * it is expected that the prebid bundle will not be loaded.
 */
const checkPrebidBundle = async (page) => {
	log('Checking Prebid bundle has loaded');
	try {
		await page.waitForRequest(
			(req) => req.url().includes('graun.Prebid.js.commercial.js'),
			{ timeout: secondsInMillis(5) },
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
	log('Prebid bundle check: Complete');
};

const checkPrebidBidRequest = async (page) => {
	log('Checking Prebid bid request');
	const prebidURL =
		'https://hbopenbid.pubmatic.com/translator?source=prebid-client';
	try {
		await page.waitForRequest((req) => req.url().includes(prebidURL), {
			timeout: secondsInMillis(5),
		});
	} catch (timeoutError) {
		logError('Expected Prebid bid request not made');
		throw timeoutError;
	}
	log('Prebid bid request: Complete');
};

const checkPbjsPresence = async (page) => {
	log('Checking Prebid.js presence');
	try {
		await page.waitForFunction(
			() =>
				// eslint-disable-next-line no-undef -- window object exists in the browser only
				window.pbjs !== undefined,
			{ timeout: secondsInMillis(5) },
		);
	} catch (timeoutError) {
		logError('Prebid.js is not loaded');
		throw timeoutError;
	}
	log('Prebid.js presence: Complete');
};

const checkPrebidBidResponse = async (page, expectedBidders) => {
	log('Checking Prebid bid response');
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
		{ timeout: secondsInMillis(5) },
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
	log('Prebid bid response: Complete');
};

module.exports = {
	checkPrebidBundle,
	checkPrebidBidRequest,
	checkPbjsPresence,
	checkPrebidBidResponse,
};
