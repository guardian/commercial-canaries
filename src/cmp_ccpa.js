const synthetics = require('Synthetics');
const log = require('SyntheticsLogger');

const checkArticle = async function (URL) {
	// Load article
	let page = await synthetics.getPage();

	const response = await page.goto(URL, {
		waitUntil: 'domcontentloaded',
		timeout: 30000,
	});
	if (!response) {
		throw 'Failed to load page!';
	}

	//If the response status code is not a 2xx success code
	if (response.status() < 200 || response.status() > 299) {
		throw 'Failed to load page!';
	}

	// Check ads have loaded
	await page.waitForSelector(
		'.ad-slot--top-above-nav .ad-slot__content iframe',
	);

	// Clear cookies
	const client = await page.target().createCDPSession();
	await client.send('Network.clearBrowserCookies');

	// Reload page
	const reloadResponse = await page.reload({
		waitUntil: 'domcontentloaded',
		timeout: 30000,
	});
	if (!reloadResponse) {
		throw 'Failed to refresh page!';
	}

	// Check ads load before banner is interacted with
	await page.waitForSelector(
		'.ad-slot--top-above-nav .ad-slot__content iframe',
	);

	// Check CMP on page
	await page.waitForSelector('[id*="sp_message_container"]');

	log.info('Article follow on check complete');
};

const checkPage = async function (URL, nextURL) {
	log.info(`Checking Page URL ${URL}`);

	let page = await synthetics.getPage();

	//clear cookies
	const client = await page.target().createCDPSession();
	await client.send('Network.clearBrowserCookies');

	const response = await page.goto(URL, {
		waitUntil: 'domcontentloaded',
		timeout: 30000,
	});
	if (!response) {
		throw 'Failed to load page!';
	}

	//If the response status code is not a 2xx success code
	if (response.status() < 200 || response.status() > 299) {
		throw 'Failed to load page!';
	}

	//Ads loaded before interacting with CMP
	await page.waitForSelector(
		'.ad-slot--top-above-nav .ad-slot__content iframe',
	);

	// wait for CMP
	await page.waitForSelector('[id*="sp_message_container"]');
	log.info('CMP loaded');

	//click Do not sell my information
	const frame = page
		.frames()
		.find((f) => f.url().startsWith('https://ccpa-notice.sp-prod.net'));
	await frame.click('button[title="Do not sell my personal information"]');

	await page.waitFor(2000);

	// Reload page
	const reloadResponse = await page.reload({
		waitUntil: 'domcontentloaded',
		timeout: 30000,
	});
	if (!reloadResponse) {
		throw 'Failed to refresh page!';
	}

	// Check top-above-nav on page after clicking do not sell and then reloading
	await page.waitForSelector(
		'.ad-slot--top-above-nav .ad-slot__content iframe',
	);

	// Check another article after this page (initially without clearing cookies)
	if (nextURL !== undefined) {
		await checkArticle(nextURL);
	}
};

const pageLoadBlueprint = async function () {
	// Check front as first navigation
	// After front check make sure ads load when viewing an article
	await checkPage(
		'https://www.theguardian.com/us',
		'https://www.theguardian.com/us-news/2021/jul/05/gray-wolves-wisconsin-hunting-population',
	);

	// Check Article as first navigation
	await checkPage(
		'https://www.theguardian.com/food/2020/dec/16/how-to-make-the-perfect-vegetarian-sausage-rolls-recipe-felicity-cloake',
	);
};

exports.handler = async () => {
	return await pageLoadBlueprint();
};
