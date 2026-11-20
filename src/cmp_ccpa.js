const { synthetics } = require('@aws/synthetics-playwright');
const {
	checkTopAdHasLoaded,
	checkPrebidBundle,
	checkPrebidBidRequest,
	checkPbjsPresence,
	checkBidResponse,
	checkPageskinHasLoaded,
	checkPageskinBackgroundImageHasLoaded,
	checkPageskinWidthIsConstrained,
	checkPageskinCollapsesFrontsSlots,
} = require('./utils/adverts');
const {
	checkCMPIsOnPage,
	checkCMPIsNotVisible,
	interactWithCMPCcpa,
} = require('./utils/cmp');
const { log } = require('./utils/logging');
const {
	clearLocalStorage,
	clearCookies,
	loadPage,
	reloadPage,
} = require('./utils/page');

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
		log('Loading page...');
		await loadPage(page, url);
		log('Page loaded');
		await clearLocalStorage(page);
		await clearCookies(page);
	});

	await synthetics.executeStep('STEP 2 - Check CMP', async function () {
		await reloadPage(page);
		log('Checking that the CMP loads and ads are displayed');
		await checkCMPIsOnPage(page, pageType);
		await checkTopAdHasLoaded(page, pageType);
		await page.screenshot({ path: `/tmp/step2-cmp-${pageType}.png` });
	});

	await synthetics.executeStep('STEP 3 - Interact with CMP', async function () {
		log('Checking that the CMP is removed from the DOM after interaction');
		await interactWithCMPCcpa(page);
		await checkCMPIsNotVisible(page);
		await page.screenshot({ path: `/tmp/step3-cmp-${pageType}.png` });

		log('Checking that the CMP is not visible when reloading the page');
		await reloadPage(page);
		await checkCMPIsNotVisible(page);
		await checkTopAdHasLoaded(page, pageType);
	});

	await synthetics.executeStep(
		'STEP 4 - Reload page after CMP interaction',
		async function () {
			log(
				'Checking that the CMP banner is displayed again after clearing local storage and cookies',
			);
			await clearLocalStorage(page);
			await clearCookies(page);
			await reloadPage(page);
			await checkCMPIsOnPage(page, pageType);
			await page.screenshot({ path: `/tmp/step4-cmp-${pageType}.png` });
			await interactWithCMPCcpa(page);
			await checkCMPIsNotVisible(page);
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
				'ozone',
				'ttd',
				'kargo',
				'triplelift',
				'teads',
			];
			await checkBidResponse(page, expectedBidders);
		},
	);

	await synthetics.executeStep('STEP 9 - Pageskin', async function () {
		await loadPage(page, pageskinUrl);
		await checkTopAdHasLoaded(page, pageType);
		await checkPageskinHasLoaded(page);
		await checkPageskinBackgroundImageHasLoaded(page);
		await checkPageskinWidthIsConstrained(page);
		await checkPageskinCollapsesFrontsSlots(page);
		await page.screenshot({ path: `/tmp/step9-pageskin-${pageType}.png` });
		log('Pageskin loaded');
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
