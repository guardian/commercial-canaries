const synthetics = require('Synthetics');
const { log, logError } = require('./logging');

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
