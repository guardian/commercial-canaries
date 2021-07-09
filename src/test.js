const puppeteer = require('puppeteer');

const waitForNoSelector = async (page) => {
	await page.waitFor(2000);

	console.log(
		'Frame on page:',
		page
			.frames()
			.some((f) => f.url().startsWith('https://ccpa-notice.sp-prod.net')),
	);

	// Select sp_message_container
	const spMessageContainer = await page.$('[id*="sp_message_container"]');

	console.log('sp_message_container on page:', spMessageContainer !== null);

	if (spMessageContainer !== null) {
		console.log(
			'display:',
			await page.evaluate(
				`window.getComputedStyle(document.querySelector('[id*=\\"sp_message_container\\"]')).getPropertyValue('display')`,
			),
			'height:',
			await page.evaluate(
				`window.getComputedStyle(document.querySelector('[id*=\\"sp_message_container\\"]')).getPropertyValue('height')`,
			),
			'top:',
			await page.evaluate(
				`window.getComputedStyle(document.querySelector('[id*=\\"sp_message_container\\"]')).getPropertyValue('top')`,
			),
		);
	} else {
		console.log("Can't display styles as sp_message_container is null");
	}
};

const checkPage = async function (URL, click = true) {
	const browser = await puppeteer.launch();
	const page = await browser.newPage();

	// Clear cookies
	// const client = await page.target().createCDPSession();
	// await client.send('Network.clearBrowserCookies');
	// console.log('Cookies', await page.cookies());

	const response = await page.goto(URL, {
		waitUntil: 'domcontentloaded',
		timeout: 30000,
	});
	if (!response) {
		throw 'Failed to load page!';
	}

	//If the response status code is not a 2xx success code
	if (response.status() < 200 || response.status() > 299) {
		console.log('Here...', response.status());
		throw 'Failed to load page!';
	}

	//await page.evaluate(() => localStorage.clear());

	console.log(
		await page.evaluate(() => window.localStorage.getItem('gu.alreadyVisited')),
	);

	console.log('Page loaded');

	// 	// Check ads load before banner is interacted with
	await page.waitForSelector(
		'.ad-slot--top-above-nav .ad-slot__content iframe',
	);

	// wait for CMP
	await page.waitForSelector('[id*="sp_message_container"]');

	await page.waitFor(30000);

	page.evaluate(() => {
		window.scrollBy(0, window.innerHeight);
	});

	await page.screenshot({ path: 'example.png' });

	await waitForNoSelector(page);

	console.log('CMP loaded');

	if (click) {
		//	click Do not sell my information
		const frame = page
			.frames()
			.find((f) => f.url().startsWith('https://ccpa-notice.sp-prod.net'));

		console.log('Click do not sell');
		await frame.click('button[title="Do not sell my personal information"]');
	}

	await waitForNoSelector(page);

	console.log('Complete');

	browser.close();
};

(async () => {
	await puppeteer.launch({
		args: ['--disable-web-security'],
	});

	console.log('Front, click=true');
	await checkPage('https://www.theguardian.com/us', true);

	// console.log('\nArticle, click=false');
	// await checkPage(
	// 	'https://www.theguardian.com/us-news/2021/jul/05/gray-wolves-wisconsin-hunting-population',
	// 	false,
	// );

	// console.log('\nFront, click=true');
	// await checkPage('https://www.theguardian.com/us');

	// console.log('\nArticle, click=true');
	// await checkPage(
	// 	'https://www.theguardian.com/us-news/2021/jul/05/gray-wolves-wisconsin-hunting-population',
	// );
})();
