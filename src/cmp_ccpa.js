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
	interactWithCMPCcpa,
} = require('./utils/cmp');
const { setConfig } = require('./utils/config');
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

	await synthetics.executeStep('[STEP 1] Load page', async function () {
		// Reset the page state to a point where the we can start testing.
		// Local storage can only be cleared once the page has loaded.
		await loadPage(page, url);
		await clearLocalStorage(page);
		await clearCookies(page);
	});

	await synthetics.executeStep('[STEP 2] Check CMP', async function () {
		log('CMP loads and the ads are NOT displayed on initial load');
		await reloadPage(page);
		await synthetics.takeScreenshot(`cmp-${pageType}`, 'Page loaded');
		await checkCMPIsOnPage(page, pageType);
		await checkTopAdHasLoaded(page, pageType);
	});

	await synthetics.executeStep('[STEP 3] Interact with CMP', async function () {
		log(
			'Adverts load and the CMP is NOT displayed following interaction with the CMP',
		);
		await interactWithCMPCcpa(page);
		await checkCMPIsNotVisible(page);
		await reloadPage(page);
		await synthetics.takeScreenshot(
			`cmp-${pageType}`,
			'CMP clicked then page reloaded',
		);
		await checkCMPIsNotVisible(page);
		await checkTopAdHasLoaded(page, pageType);
	});

	await synthetics.executeStep(
		'[STEP 4] Reload page after CMP interaction',
		async function () {
			log(
				'After we clear local storage and cookies, the CMP banner is displayed once again',
			);
			await clearLocalStorage(page);
			await clearCookies(page);
			await reloadPage(page);
			await synthetics.takeScreenshot(
				`cmp-${pageType}`,
				'cookies and local storage cleared then page reloaded',
			);
		},
	);

	await synthetics.executeStep(
		'[STEP 5] Prebid : Load bundle',
		async function () {
			await reloadPage(page);
			await checkPrebidBundle(page);
		},
	);

	await synthetics.executeStep(
		'[STEP 6] Prebid : Bid request',
		async function () {
			await checkPrebidBidRequest(page);
		},
	);

	await synthetics.executeStep(
		'[STEP 7] Prebid : window.pbjs',
		async function () {
			await checkPbjsPresence(page);
		},
	);

	await synthetics.executeStep(
		'[STEP 8] Prebid : Bid response',
		async function () {
			const expectedBidders = [
				'ix',
				'rubicon',
				'criteo',
				'trustx',
				'pubmatic',
				'ozone',
				'ttd',
				'kargo',
				'adyoulike',
				'triplelift',
			];
			await checkBidResponse(page, expectedBidders);
		},
	);
};

exports.handler = async () => {
	return await testPage();
};
