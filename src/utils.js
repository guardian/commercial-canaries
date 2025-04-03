const synthetics = require('Synthetics');
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

export const checkTopAdHasLoaded = async (page) => {
	log(`Waiting for ads to load: Start`);
	try {
		await page.waitForSelector(
			'.ad-slot--top-above-nav .ad-slot__content iframe',
			{ timeout: 30000 },
		);
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

export const checkCMPIsOnPage = async (page) => {
	log(`Waiting for CMP: Start`);
	try {
		await page.waitForSelector('[id*="sp_message_container"]');
	} catch (e) {
		logError(`Could not find CMP: ${e.message}`);
		await synthetics.takeScreenshot(`${page}-page`, 'Could not find CMP');
		throw new Error('top-above-nav ad did not load');
	}

	log(`Waiting for CMP: Finish`);
};

export const checkCMPIsNotVisible = async (page) => {
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
