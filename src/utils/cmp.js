const { URL } = require('url');
const synthetics = require('Synthetics');
const { log, logError } = require('./logging');
const { secondsInMillis } = require('./time');

const findCmpFrame = (page) => {
  return page.frames().find((f) => {
		// Check that f.url is defined and that it's longer than a single character
		// Some URLs were coming through as just a colon, which causes an error as it isn't a valid URL
		if (f.url() && f.url().length > 1) {
			const parsedUrl = new URL(f.url());
			return parsedUrl.host === 'sourcepoint.theguardian.com';
		}
	});
}

const interactWithCMPTcfv2 = async (page) => {
  const frame = findCmpFrame(page)
	if (frame) {
    log(`Clicking on "Yes I'm Happy"`);
    const acceptAllButtonSelector = 'div.message-component.message-row > button.btn-primary.sp_choice_type_11'
		await frame.waitForSelector(acceptAllButtonSelector, { timeout: secondsInMillis(5) });
		// Accept cookies
		await frame.click(acceptAllButtonSelector);
	} else {
		logError('CMP frame not found');
	}
};

const interactWithCMPCcpa = async (page) => {
  const frame = findCmpFrame(page);
	if (frame) {
    log(`Clicking on "Do not sell or share my personal information" on CMP`);
    const doNotSellButtonSelector = 'button[title="Do not sell or share my personal information"]'
		await frame.waitForSelector(doNotSellButtonSelector,{ timeout: secondsInMillis(2) });
		await frame.click(doNotSellButtonSelector);
	} else {
		logError('CMP frame not found');
	}

  // The page reloads after clicking "do not sell" so need to wait for this to happen before moving on
  await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, secondsInMillis(1)));
};

const interactWithCMPAus = async (page) => {
  const frame = findCmpFrame(page);
  if (frame) {
    log(`Clicking on "Continue" on CMP`);
    const continueButtonSelector = 'button[title="Continue"]'
    await frame.waitForSelector(continueButtonSelector,{ timeout: secondsInMillis(2) });
    await frame.click(continueButtonSelector)
  } else {
    	logError('CMP frame not found');
  }
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
