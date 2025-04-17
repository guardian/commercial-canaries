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
		log('CMP loads and the ads are NOT displayed on initial load');
		await reloadPage(page);
		await new Promise((r) => setTimeout(r, TWO_SECONDS)); // Wait an extra two seconds after reloading the page
		await synthetics.takeScreenshot(`cmp-${pageType}`, 'page-loaded');
		await checkCMPIsOnPage(page, pageType);
		await checkTopAdDidNotLoad(page);
	});

	await synthetics.executeStep('acceptCookies', async function () {
		log(
			'Adverts load and the CMP is NOT displayed following interaction with the CMP',
		);
		await interactWithCMPTcfv2(page);
		await checkCMPIsNotVisible(page);
		await checkTopAdHasLoaded(page, pageType);
	});

	await synthetics.executeStep('reloadAfterCmp', async function () {
		log('Adverts load and the CMP is NOT displayed when the page is reloaded');
		await reloadPage(page);
		await new Promise((r) => setTimeout(r, TWO_SECONDS)); // Wait an extra two seconds after reloading the page
		await synthetics.takeScreenshot(`cmp-${pageType}`, 'page-reloaded');
		await checkCMPIsNotVisible(page);
		await checkTopAdHasLoaded(page, pageType);
	});

	const currentLocation = await getCurrentLocation(page);
	if (currentLocation === 'CA') {
		log('In Canada we do not run Prebid. Skipping Prebid steps.');
	} else {
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
		});
	}

	await synthetics.executeStep('clearStorageAndCookies', async function () {
		await clearLocalStorage(page);
		await clearCookies(page);
		await reloadPage(page);
		await new Promise((r) => setTimeout(r, TWO_SECONDS)); // Wait an extra two seconds after reloading the page
		await synthetics.takeScreenshot(
			`cmp-${pageType}`,
			'page-reloaded-after-clearing-cookies-and-localstorage',
		);
		await checkCMPIsOnPage(page, pageType);
		await checkTopAdDidNotLoad(page);
	});
};

exports.handler = async () => {
	return await testPage();
};
