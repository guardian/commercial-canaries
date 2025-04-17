const synthetics = require('Synthetics');
const {
	checkTopAdHasLoaded,
	checkPrebidBundle,
	checkPrebidBidRequest,
	checkPbjsPresence,
	checkBidResponse,
} = require('./utils/adverts');
const {
	checkCMPIsOnPage,
	checkCMPIsNotVisible,
	interactWithCMPAus,
} = require('./utils/cmp');
const { setConfig } = require('./utils/config');
const { TWO_SECONDS } = require('./utils/constants');
const { log } = require('./utils/logging');
const {
	clearLocalStorage,
	clearCookies,
	loadPage,
	reloadPage,
} = require('./utils/page');

const testPage = async function () {
	setConfig();

	const url = process.env.url;
	const pageType = process.env.pageType;

	log(`Start checking page: ${url}`);
	let page = await synthetics.getPage();

	await synthetics.executeStep('loadPage', async function () {
		// Reset the page state to a point where the we can start testing.
		// Local storage can only be cleared once the page has loaded.
		await loadPage(page, url);
		await clearLocalStorage(page);
		await clearCookies(page);
	});

	await synthetics.executeStep('checkCmp', async function () {
		log('Adverts load and the CMP is displayed on initial load');
		await reloadPage(page);
		await new Promise((r) => setTimeout(r, TWO_SECONDS)); // Wait an extra two seconds after reloading the page
		await synthetics.takeScreenshot(`cmp-${pageType}`, 'page-loaded');
		await checkCMPIsOnPage(page, pageType);
		await checkTopAdHasLoaded(page, pageType);
	});

	await synthetics.executeStep('cmpInteraction', async function () {
		log(
			'Adverts load and the CMP is NOT displayed following interaction with the CMP',
		);
		await interactWithCMPAus(page);
		await checkCMPIsNotVisible(page);
		await reloadPage(page);
		await new Promise((r) => setTimeout(r, TWO_SECONDS)); // Wait an extra two seconds after reloading the page
		await synthetics.takeScreenshot(
			`${pageType}-page`,
			'CMP clicked then page reloaded',
		);
		await synthetics.takeScreenshot(
			`cmp-${pageType}`,
			'page-reloaded-after-cmp',
		);
		await checkCMPIsNotVisible(page);
		await checkTopAdHasLoaded(page, pageType);
	});

	await synthetics.executeStep('reloadAfterCmp', async function () {
		log(
			'After we clear local storage and cookies, the CMP banner is displayed once again',
		);

		await clearLocalStorage(page);
		await clearCookies(page);
		await reloadPage(page);
		await new Promise((r) => setTimeout(r, TWO_SECONDS)); // Wait an extra two seconds after reloading the page
		await synthetics.takeScreenshot(
			`cmp-${pageType}`,
			'page-reloaded-after-clearing-cookie-and-localStorage',
		);
		await checkCMPIsOnPage(page, pageType);
		await checkTopAdHasLoaded(page, pageType);
	});

	await synthetics.executeStep('prebidBundleCheck', async function () {
		await reloadPage(page);
		await checkPrebidBundle(page);
	});

	await synthetics.executeStep('prebidPubmaticCheck', async function () {
		await checkPrebidBidRequest(page);
	});

	await synthetics.executeStep('pbjsCheck', async function () {
		await checkPbjsPresence(page);
	});

	await synthetics.executeStep('prebidBidResponse', async function () {
		const expectedBidders = [
			'ix',
			'rubicon',
			'criteo',
			'pubmatic',
			'ttd',
			'adyoulike',
			'triplelift',
			'and',
			'oxd',
		];
		await checkBidResponse(page, expectedBidders);
	});
};

exports.handler = async () => {
	return await testPage();
};
