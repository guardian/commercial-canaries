const synthetics = require('Synthetics');
const { log, logError } = require('./logging');
const { secondsInMillis } = require('./time');

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

const checkPageskinHasLoaded = async (page) => {
	log('Checking pageskin has loaded: Start');
	try {
		await page.waitForFunction(
			() =>
				// eslint-disable-next-line no-undef -- document object exists in the browser only
				document.body.classList.contains('has-page-skin'),
			{ timeout: secondsInMillis(10) },
		);
	} catch {
		logError('Pageskin not detected on page');
		throw new Error('Page does not have pageskin class');
	}
	log('Checking pageskin has loaded: Complete');
};

const checkPageskinBackgroundImageHasLoaded = async (page) => {
	log('Checking pageskin background image: Start');
	try {
		await page.waitForFunction(
			() => {
				// eslint-disable-next-line no-undef -- window object exists in the browser only
				const backgroundImage = window.getComputedStyle(
					// eslint-disable-next-line no-undef -- document object exists in the browser only
					document.body,
				).backgroundImage;

				return (
					backgroundImage !== 'none' &&
					backgroundImage.includes('puppies-pageskin')
				);
			},
			{ timeout: secondsInMillis(10) },
		);
	} catch {
		logError('Pageskin background image not detected');
		throw new Error('Pageskin background image not detected');
	}
	log('Checking pageskin background image: Complete');
};

const checkPageskinWidthIsConstrained = async (page) => {
	log('Checking pageskin width constraint: Start');
	try {
		await page.waitForFunction(
			() => {
				// Require at least 100px spare viewport width so pageskin rails can fit.
				const minimumPageskinGutter = 100;

				// eslint-disable-next-line no-undef -- document object exists in the browser only
				const main = document.querySelector(
					'main#maincontent[data-layout="FrontLayout"]',
				);

				if (!main) {
					return false;
				}

				if (
					// eslint-disable-next-line no-undef -- document object exists in the browser only
					!document.body.classList.contains('has-page-skin')
				) {
					return false;
				}

				const rect = main.getBoundingClientRect();
				// eslint-disable-next-line no-undef -- window object exists in the browser only
				const styles = window.getComputedStyle(main);

				// eslint-disable-next-line no-undef -- window object exists in the browser only
				const viewportWidth = window.innerWidth;
				const maxWidth = styles.maxWidth;

				return (
					maxWidth !== 'none' &&
					rect.width < viewportWidth &&
					viewportWidth - rect.width > minimumPageskinGutter
				);
			},
			{ timeout: secondsInMillis(10) },
		);
	} catch {
		logError('Pageskin width constraint not detected');
		throw new Error('Pageskin width is not constrained');
	}
	log('Checking pageskin width constraint: Complete');
};

const checkPageskinCollapsesFrontsSlots = async (page) => {
	log('Checking pageskin front slot suppression: Start');
	// When pageskin is active, DCR does not render the fronts-banner slot at all.
	// Confirming it is absent from the DOM is the simplest reliable signal.
	const frontsBannerSlot = await page.$('[id^="dfp-ad--fronts-banner-"]');
	if (frontsBannerSlot !== null) {
		logError('Fronts-banner slot present — pageskin suppression not in effect');
		throw new Error('Pageskin did not collapse expected front ad slots');
	}
	log('Checking pageskin front slot suppression: Complete');
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
			{ timeout: secondsInMillis(3) },
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
	checkPageskinHasLoaded,
	checkPageskinBackgroundImageHasLoaded,
	checkPageskinWidthIsConstrained,
	checkPageskinCollapsesFrontsSlots,
};
