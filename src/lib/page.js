const { log, logError } = require('./logging');

export const reloadPage = async (page) => {
	log(`Reloading page: Start`);
	const reloadResponse = await page.reload({
		waitUntil: 'domcontentloaded',
		timeout: 30000,
	});
	if (!reloadResponse) {
		logError(`Reloading page: Failed`);
		throw 'Failed to refresh page!';
	}
	// We see some run failures if we do not include a wait time after a page load
	await page.waitForTimeout(3000);
	log(`Reloading page: Complete`);
};

export const loadPage = async (page, url) => {
	log(`Loading page: Start`);
	const response = await page.goto(url, {
		waitUntil: 'domcontentloaded',
		timeout: 30000,
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
	// We see some run failures if we do not include a wait time after a page reload
	await page.waitForTimeout(3000);
	log(`Loading page: Complete`);
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

export const getCurrentLocation = async (page) => {
	return await page.evaluate(
		() =>
			document.cookie
				.split('; ')
				.find((row) => row.startsWith('GU_geo_country='))
				?.split('=')[1],
	);
};
