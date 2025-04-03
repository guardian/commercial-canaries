const logger = require('SyntheticsLogger');

/**
 * We use custom log messages so that we can easily differentiate
 * between logs from this file and other logs in Cloudwatch.
 */
export const log = (message) => {
	logger.info(`GuCanaryRun. Message: ${message}`);
};

export const logError = (message) => {
	logger.error(`GuCanaryRun. Message: ${message}`);
};

export const clearCookies = async (page) => {
	const allCookies = await page.cookies();
	await page.deleteCookie(...allCookies);
	log(`Cleared Cookies`);
};

export const clearLocalStorage = async (page) => {
	await page.evaluate(() => localStorage.clear());
	log(`Cleared local storage`);
};
