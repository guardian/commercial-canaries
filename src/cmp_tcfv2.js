const synthetics = require('Synthetics');
const {
	checkTopAdHasLoaded,
	checkTopAdDidNotLoad,
	checkPrebidBundle,
	checkPrebidBidRequest,
	checkPbjsPresence,
	checkBidResponse,
} = require('./utils/adverts');
const {
	checkCMPIsOnPage,
	checkCMPIsNotVisible,
	interactWithCMPTcfv2,
} = require('./utils/cmp');
const { setConfig } = require('./utils/config');
const { TWO_SECONDS } = require('./utils/constants');
const { log } = require('./utils/logging');
const {
	clearLocalStorage,
	clearCookies,
	getCurrentLocation,
	loadPage,
	reloadPage,
} = require('./utils/page');

/**
 * Checks that ads load correctly for the first time a user goes to
 * the site, with respect to and interaction with the CMP.
 */
const checkPage = async (pageType, url) => {
	log(`Start checking page: ${url}`);

	let page = await synthetics.getPage();

	// Reset the page state to a point where the we can start testing.
	// Local storage can only be cleared once the page has loaded.
	await loadPage(page, url);
	await clearLocalStorage(page);
	await clearCookies(page);

	// Now we can run our tests.
	log(
		`[TEST 1] start: CMP loads and the ads are NOT displayed on initial load`,
	);
	await reloadPage(page);
	await checkCMPIsOnPage(page, pageType);
	await synthetics.takeScreenshot(`${pageType}-page`, 'page loaded');
	await checkTopAdDidNotLoad(page);
	log(`[TEST 1] completed`);

	log(
		`[TEST 2] start: Adverts load and the CMP is NOT displayed following interaction with the CMP`,
	);
	await interactWithCMPTcfv2(page);
	await checkCMPIsNotVisible(page);
	await checkTopAdHasLoaded(page, pageType);
	log(`[TEST 2]  completed`);

	log(
		`[TEST 3] start: Adverts load and the CMP is NOT displayed when the page is reloaded`,
	);
	await reloadPage(page);
	await new Promise((r) => setTimeout(r, TWO_SECONDS)); // Wait an extra two seconds after reloading the page
	await synthetics.takeScreenshot(
		`${pageType}-page`,
		'CMP clicked then page reloaded',
	);
	await checkCMPIsNotVisible(page);
	await checkTopAdHasLoaded(page, pageType);
	log(`[TEST 3] completed`);

	log(`[TEST 4] start: Prebid`);
	const currentLocation = await getCurrentLocation(page);
	if (currentLocation === 'CA') {
		log('In Canada we do not run Prebid');
	} else {
		await reloadPage(page);
		await checkPrebidBundle(page);
		await checkPrebidBidRequest(page);
		await checkPbjsPresence(page);
		const expectedBidders = [
			'oxd',
			'and',
			'pubmatic',
			'ix',
			'adyoulike',
			'ozone',
			'criteo',
			'ttd',
			'rubicon',
			...(currentLocation === 'UK' ? ['xhb'] : []),
		];
		await checkBidResponse(page, expectedBidders);
	}
	log(`[TEST 4] completed`);

	log(
		`[TEST 5] start: After we clear local storage and cookies, the CMP banner is displayed once again`,
	);
	await clearLocalStorage(page);
	await clearCookies(page);
	await reloadPage(page);
	await checkCMPIsOnPage(page, pageType);
	await synthetics.takeScreenshot(
		`${pageType}-page`,
		'cookies and local storage cleared then page reloaded',
	);
	await checkTopAdDidNotLoad(page);
	log(`[TEST 5] completed`);
};

const pageLoadBlueprint = async function () {
	setConfig();

	// The query param "adtest=fixed-puppies-ci" is used to ensure that GAM provides us with an ad for our slot
	await synthetics.executeStep('Test Front page', async function () {
		await checkPage(
			'front',
			'https://www.theguardian.com?adtest=fixed-puppies-ci',
		);
	});

	await synthetics.executeStep('Test Article page', async function () {
		await checkPage(
			'article',
			'https://www.theguardian.com/environment/2022/apr/22/disbanding-of-dorset-wildlife-team-puts-birds-pray-at-risk?adtest=fixed-puppies-ci',
		);
	});
};

exports.handler = async () => {
	return await pageLoadBlueprint();
};
