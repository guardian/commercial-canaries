const { URL } = require('url');
const synthetics = require('Synthetics');
const { log, logError } = require('./logging');
const { secondsInMillis } = require('./time');

const interactWithCMPTcfv2 = async (page) => {
	// When AWS Synthetics use a more up-to-date version of Puppeteer, we can make use of waitForFrame()
	log(`Clicking on "Yes I'm Happy"`);
	const frame = page.frames().find((f) => {
		// Check that f.url is defined and that it's longer than a single character
		// Some URLs were coming through as just a colon, which causes an error as it isn't a valid URL
		if (f.url() && f.url().length > 1) {
			const parsedUrl = new URL(f.url());
			return parsedUrl.host === 'sourcepoint.theguardian.com';
		}
	});

	if (frame) {
		await frame.waitForSelector(
			'div.message-component.message-row > button.btn-primary.sp_choice_type_11',
			{ timeout: secondsInMillis(5) },
		);
		// Accept cookies
		await frame.click(
			'div.message-component.message-row > button.btn-primary.sp_choice_type_11',
		);
	} else {
		logError('CMP frame not found');
	}
};

const interactWithCMPCcpa = async (page) => {
	// When AWS Synthetics use a more up-to-date version of Puppeteer, we can make use of waitForFrame()
	log(`Clicking on "Do not sell or share my personal information" on CMP`);
	const frame = page.frames().find((f) => {
		// Check that f.url is defined and that it's longer than a single character
		// Some URLs were coming through as just a colon, which causes an error as it isn't a valid URL
		if (f.url() && f.url().length > 1) {
			const parsedUrl = new URL(f.url());
			return parsedUrl.host === 'sourcepoint.theguardian.com';
		}
	});

	if (frame) {
		await frame.waitForSelector(
			'button[title="Do not sell or share my personal information"]',
			{ timeout: secondsInMillis(2) },
		);
		await frame.click(
			'button[title="Do not sell or share my personal information"]',
		);
	} else {
		logError('CMP frame not found');
	}

	await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
	// We see some run failures if we do not include a wait time after a page load
	await new Promise((r) => setTimeout(r, secondsInMillis(2)));
};

const interactWithCMPAus = async (page) => {
	// When AWS Synthetics use a more up-to-date version of Puppeteer, we can make use of waitForFrame()
	log(`Clicking on "Continue" on CMP`);
	const frame = page.frames().find((f) => {
		// Check that f.url is defined and that it's longer than a single character
		// Some URLs were coming through as just a colon, which causes an error as it isn't a valid URL
		if (f.url() && f.url().length > 1) {
			const parsedUrl = new URL(f.url());
			return parsedUrl.host === 'sourcepoint.theguardian.com';
		}
	});
	await frame.click('button[title="Continue"]');
};

const checkCMPIsOnPage = async (page, pageType) => {
	log(`Waiting for CMP: Start`);
	try {
		await page.waitForSelector('[id*="sp_message_container"]', {
			timeout: secondsInMillis(5),
		});
	} catch (e) {
		logError(`Could not find CMP: ${e.message}`);
		await synthetics.takeScreenshot(`cmp-${pageType}`, 'Could not find CMP');
		throw new Error(e);
	}
	log(`Waiting for CMP: Finish`);
};

const checkCMPIsNotVisible = async (page) => {
	log(`Checking CMP is Hidden: Start`);

	await new Promise((r) => setTimeout(r, 100)); // Wait 100ms before checking if the CMP has been dismissed

	const getSpMessageDisplayProperty = function () {
		// eslint-disable-next-line no-undef -- document object exists in the browser only
		const element = document.querySelector('[id*="sp_message_container"]');
		if (element) {
			// eslint-disable-next-line no-undef -- window object exists in the browser only
			const computedStyle = window.getComputedStyle(element);
			return computedStyle.getPropertyValue('display');
		}
	};

	const display = await page.evaluate(getSpMessageDisplayProperty);

	// Use `!=` rather than `!==` here because display is a DOMString type
	if (display && display != 'none') {
		throw Error('CMP still present on page');
	}

	log('CMP hidden or removed from page');
};

module.exports = {
	interactWithCMPTcfv2,
	interactWithCMPCcpa,
	interactWithCMPAus,
	checkCMPIsOnPage,
	checkCMPIsNotVisible,
};
