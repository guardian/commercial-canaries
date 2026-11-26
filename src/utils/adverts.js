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
		await page.screenshot({ path: `/tmp/${pageType}-page.png` });
		log('Failed to load top-above-nav ad');
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

module.exports = {
	checkTopAdHasLoaded,
	checkTopAdDidNotLoad,
};
