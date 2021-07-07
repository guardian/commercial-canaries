const synthetics = require('Synthetics');
const log = require('SyntheticsLogger');

const checkArticle = async function (URL) {
	log.info(`Checking Article URL ${URL}`);

	let page = await synthetics.getPage();

	// Load page
	const response = await page.goto(URL, {
		waitUntil: 'domcontentloaded',
		timeout: 30000,
	});
	if (!response) {
		throw 'Failed to load page!';
	}

	// Check ads have loaded
	await page.waitForSelector(
		'.ad-slot--top-above-nav .ad-slot__content iframe',
	);

	// Clear cookies
	const client = await page.target().createCDPSession();
	await client.send('Network.clearBrowserCookies');

	// Reload the page
	const reloadResponse = await page.reload({
		waitUntil: 'domcontentloaded',
		timeout: 30000,
	});
	if (!reloadResponse) {
		throw 'Failed to refresh page!';
	}

	// Check banner is shown
	await page.waitForSelector('[id*="sp_message_container"]');
	log.info('CMP loaded');
};

const checkPage = async function (URL) {
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

	// wait for CMP
	await page.waitForSelector('[id*="sp_message_container"]');
	log.info('CMP loaded');

	// Click on Yes I'm happy
	const frame = page
		.frames()
		.find((f) => f.url().startsWith('https://sourcepoint.theguardian.com'));
	await page.waitFor(1000);
	await frame.click('button[title="Yes, I’m happy"]');

	//ads are loaded
	await page.waitForSelector(
		'.ad-slot--top-above-nav .ad-slot__content iframe',
	);

	// Reload page
	const reloadResponse = await page.reload({
		waitUntil: 'domcontentloaded',
		timeout: 30000,
	});
	if (!reloadResponse) {
		throw 'Failed to refresh page!';
	}

	// Check top-above-nav on page after clicking opting in and reloading
	await page.waitForSelector(
		'.ad-slot--top-above-nav .ad-slot__content iframe',
	);
};

const pageLoadBlueprint = async function () {
	// Check Front
	await checkPage('https://www.theguardian.com');

	// Check article
	await checkArticle(
		'https://www.theguardian.com/food/2020/dec/16/how-to-make-the-perfect-vegetarian-sausage-rolls-recipe-felicity-cloake',
	);
};

exports.handler = async () => {
	return await pageLoadBlueprint();
};
