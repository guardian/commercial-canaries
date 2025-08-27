const { TEN_SECONDS, TWO_SECONDS } = require('./constants');
const { log, logError, subscribeToCommercialLogger } = require('./logging');

const clearCookies = async (page) => {
	const allCookies = await page.cookies();
	await page.deleteCookie(...allCookies);
	log(`Cleared Cookies`);
};

const clearLocalStorage = async (page) => {
	// eslint-disable-next-line no-undef -- localStorage object exists in the browser only
	await page.evaluate(() => localStorage.clear());
	log(`Cleared local storage`);
};

const loadPage = async (page, url) => {
	log(`Loading page: Start`);
	const response = await page.goto(url, {
		waitUntil: 'domcontentloaded',
		timeout: TEN_SECONDS,
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
	// Wait an extra two seconds to allow the page to load
	await new Promise((r) => setTimeout(r, TWO_SECONDS));
	log(`Loading page: Complete`);
};

const reloadPage = async (page) => {
	log(`Reloading page: Start`);
	const reloadResponse = await page.reload({
		waitUntil: 'domcontentloaded',
		timeout: TEN_SECONDS,
	});
	if (!reloadResponse) {
		logError(`Reloading page: Failed`);
		throw 'Failed to refresh page!';
	}
	subscribeToCommercialLogger();
	log(`Reloading page: Complete`);
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

module.exports = {
	clearCookies,
	clearLocalStorage,
	loadPage,
	reloadPage,
	getCurrentLocation,
};
