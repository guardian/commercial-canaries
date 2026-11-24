const { synthetics } = require('@aws/synthetics-playwright');
const {
	checkTopAdHasLoaded,
	checkTopAdDidNotLoad,
} = require('./utils/adverts');
const {
	checkCMPIsOnPage,
	checkCMPIsNotVisible,
	interactWithCMPTcfv2,
} = require('./utils/cmp');
const { log } = require('./utils/logging');
const {
	clearLocalStorage,
	clearCookies,
	getCurrentLocation,
	loadPage,
	reloadPage,
} = require('./utils/page');
const {
	checkPageskinHasLoaded,
	checkPageskinBackgroundImageHasLoaded,
	checkPageskinWidthIsConstrained,
	checkPageskinCollapsesFrontsSlots,
} = require('./utils/pageskin');
const {
	checkPrebidBundle,
	checkPrebidBidRequest,
	checkPbjsPresence,
	checkBidResponse,
} = require('./utils/prebid');

const testPage = async function () {
	const url = process.env.url;
	const pageType = process.env.pageType;
	const pageskinUrl = process.env.pageskinUrl;

	if (!pageskinUrl) {
		throw new Error('Missing required env var: pageskinUrl');
	}

	log(`Start checking page: ${url}`);
	const browser = await synthetics.launch();

	// Open a completely fresh, clean context (session)
	const browserContext = await browser.newContext();
	const page = await synthetics.newPage(browserContext);

	await synthetics.executeStep('STEP 1 - Load page', async function () {
		// Reset the page state to a point where the we can start testing.
		// Local storage can only be cleared once the page has loaded.
		await loadPage(page, url);
		await clearLocalStorage(page);
		await clearCookies(page);
	});

	await synthetics.executeStep('STEP 2 - Check CMP', async function () {
		log('CMP loads and the ads are NOT displayed on initial load');
		await reloadPage(page);
		await checkCMPIsOnPage(page, pageType);
		await checkTopAdDidNotLoad(page);
		await page.screenshot({ path: `/tmp/cmp-loads-${pageType}.png` });

		log(
			'Checking that the CMP is removed from the DOM and adverts load after interaction',
		);
		await interactWithCMPTcfv2(page);
		await checkCMPIsNotVisible(page);
		await checkTopAdHasLoaded(page, pageType);
		await page.screenshot({ path: `/tmp/cmp-removed-${pageType}.png` });

		log(
			'Checking that the CMP is not visible and adverts load when reloading the page',
		);
		await reloadPage(page);
		await checkCMPIsNotVisible(page);
		await checkTopAdHasLoaded(page, pageType);
		await page.screenshot({
			path: `/tmp/cmp-hidden-on-reload-${pageType}.png`,
		});

		log(
			'Checking that the CMP banner is displayed again after clearing local storage and cookies',
		);
		await clearLocalStorage(page);
		await clearCookies(page);
		await reloadPage(page);
		await checkCMPIsOnPage(page, pageType);
		await checkTopAdDidNotLoad(page);
		await page.screenshot({ path: `/tmp/cmp-loads-again-${pageType}.png` });
		await interactWithCMPTcfv2(page);
		await checkCMPIsNotVisible(page);
	});

	const currentLocation = await getCurrentLocation(page);
	if (currentLocation === 'CA') {
		log('In Canada we do not run Prebid. Skipping STEP 3 - Prebid.');
	} else {
		await synthetics.executeStep('STEP 3 - Prebid', async function () {
			await reloadPage(page);
			await checkPrebidBundle(page);
			await checkPrebidBidRequest(page);
			await checkPbjsPresence(page);

			const expectedBidders = [
				'oxd',
				'and',
				'pubmatic',
				'ix',
				'ozone',
				'criteo',
				'ttd',
				'rubicon',
				'teads',
				...(currentLocation === 'UK' ? ['xhb'] : []),
			];
			await checkBidResponse(page, expectedBidders);
		});
	}

	await synthetics.executeStep('STEP 4 - Pageskin', async function () {
		await loadPage(page, pageskinUrl);
		await checkPageskinHasLoaded(page);
		await checkPageskinBackgroundImageHasLoaded(page);
		await checkPageskinWidthIsConstrained(page);
		await checkPageskinCollapsesFrontsSlots(page);
		await page.screenshot({ path: `/tmp/pageskin-${pageType}.png` });
	});
};

exports.handler = async () => {
	try {
		return await testPage();
	} finally {
		// Close all browser contexts and browser
		await synthetics.close();
	}
};
