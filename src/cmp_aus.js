const synthetics = require('Synthetics');
const {
	checkTopAdHasLoaded,
	checkPrebidBundle,
	checkPrebidBidRequest,
	checkPbjsPresence,
	checkBidResponse,
} = require('./lib/adverts');
const {
	checkCMPIsOnPage,
	checkCMPIsNotVisible,
	interactWithCMPAus,
} = require('./lib/cmp');
const { setConfig } = require('./lib/config');
const { log } = require('./lib/logging');
const {
	clearLocalStorage,
	clearCookies,
	loadPage,
	reloadPage,
} = require('./lib/page');
const { secondsInMillis } = require('./lib/utils');

const testPage = async function () {
	setConfig();

	const url = process.env.url;
	const pageType = process.env.pageType;

	log(`Start checking page: ${url}`);
	let page = await synthetics.getPage();

	await synthetics.executeStep('STEP 1 - Load page', async function () {
		// Reset the page state to a point where the we can start testing.
		// Local storage can only be cleared once the page has loaded.
		await loadPage(page, url);
		await clearLocalStorage(page);
		await clearCookies(page);
	});

	await synthetics.executeStep('STEP 2 - Check CMP', async function () {
		log('Adverts load and the CMP is displayed on initial load');
		await reloadPage(page);
		await synthetics.takeScreenshot(`cmp-${pageType}`, 'Page loaded');
		await checkCMPIsOnPage(page, pageType);
		await checkTopAdHasLoaded(page, pageType);
	});

	await synthetics.executeStep('STEP 3 - Interact with CMP', async function () {
		log(
			'Adverts load and the CMP is NOT displayed following interaction with the CMP',
		);
		await interactWithCMPAus(page);
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
		'STEP 4 - Reload page after CMP interaction',
		async function () {
			log(
				'After we clear local storage and cookies, the CMP banner is displayed once again',
			);

			await clearLocalStorage(page);
			await clearCookies(page);
			await reloadPage(page);
			await new Promise((r) => setTimeout(r, secondsInMillis(2))); // Wait an extra two seconds after reloading the page
			await synthetics.takeScreenshot(
				`cmp-${pageType}`,
				'cookies and local storage cleared then page reloaded',
			);
			await checkCMPIsOnPage(page, pageType);
			await checkTopAdHasLoaded(page, pageType);
		},
	);

	await synthetics.executeStep(
		'STEP 5 - Prebid - Load bundle',
		async function () {
			await reloadPage(page);
			await checkPrebidBundle(page);
		},
	);

	await synthetics.executeStep(
		'STEP 6 - Prebid - Bid request',
		async function () {
			await checkPrebidBidRequest(page);
		},
	);

	await synthetics.executeStep(
		'STEP 7 - Prebid - window.pbjs',
		async function () {
			await checkPbjsPresence(page);
		},
	);

	await synthetics.executeStep(
		'STEP 8 - Prebid - Bid response',
		async function () {
			const expectedBidders = [
				'ix',
				'rubicon',
				'criteo',
				'pubmatic',
				'ttd',
				'triplelift',
				'and',
				'oxd',
			];
			await checkBidResponse(page, expectedBidders);
		},
	);
};

exports.handler = async () => {
	return await testPage();
};
