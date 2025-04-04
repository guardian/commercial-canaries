import { log, logError } from './logging';

export const interactWithCMP = async (page) => {
	// When AWS Synthetics use a more up-to-date version of Puppeteer, we can make use of waitForFrame()
	log(`Clicking on "Yes I'm Happy"`);
	const frame = page.frames().find((f) => {
		const parsedUrl = new URL(f.url());
		return parsedUrl.host === 'sourcepoint.theguardian.com';
	});
	// Accept cookies
	await frame.click(
		'div.message-component.message-row > button.btn-primary.sp_choice_type_11',
	);
};

export const checkCMPIsOnPage = async (page) => {
	log(`Waiting for CMP: Start`);
	try {
		await page.waitForSelector('[id*="sp_message_container"]');
	} catch (e) {
		logError(`Could not find CMP: ${e.message}`);
		await synthetics.takeScreenshot(`${page}-page`, 'Could not find CMP');
		throw new Error('top-above-nav ad did not load');
	}
	log(`Waiting for CMP: Finish`);
};

export const checkCMPIsNotVisible = async (page) => {
	log(`Checking CMP is Hidden: Start`);
	const getSpMessageDisplayProperty = function () {
		const element = document.querySelector('[id*="sp_message_container"]');
		if (element) {
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
