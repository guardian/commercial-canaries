const { log, logError } = require('./logging');
const { secondsInMillis } = require('./time');

const checkPageskinHasLoaded = async (page) => {
	log('Checking pageskin has loaded: Start');
	try {
		await page.waitForFunction(
			() =>
				// eslint-disable-next-line no-undef -- document object exists in the browser only
				document.body.classList.contains('has-page-skin'),
			{ timeout: secondsInMillis(10) },
		);
	} catch {
		logError('Pageskin not detected on page');
		throw new Error('Page does not have pageskin class');
	}
	log('Checking pageskin has loaded: Complete');
};

const checkPageskinBackgroundImageHasLoaded = async (page) => {
	log('Checking pageskin background image: Start');
	try {
		await page.waitForFunction(
			() => {
				// eslint-disable-next-line no-undef -- window object exists in the browser only
				const backgroundImage = window.getComputedStyle(
					// eslint-disable-next-line no-undef -- document object exists in the browser only
					document.body,
				).backgroundImage;

				return (
					backgroundImage !== 'none' &&
					backgroundImage.includes('puppies-pageskin')
				);
			},
			{ timeout: secondsInMillis(10) },
		);
	} catch {
		logError('Pageskin background image not detected');
		throw new Error('Pageskin background image not detected');
	}
	log('Checking pageskin background image: Complete');
};

const checkPageskinWidthIsConstrained = async (page) => {
	log('Checking pageskin width constraint: Start');
	try {
		await page.waitForFunction(
			() => {
				// Require at least 100px spare viewport width so pageskin rails can fit.
				const minimumPageskinGutter = 100;

				// eslint-disable-next-line no-undef -- document object exists in the browser only
				const main = document.querySelector(
					'main#maincontent[data-layout="FrontLayout"]',
				);

				if (!main) {
					return false;
				}

				if (
					// eslint-disable-next-line no-undef -- document object exists in the browser only
					!document.body.classList.contains('has-page-skin')
				) {
					return false;
				}

				const rect = main.getBoundingClientRect();
				// eslint-disable-next-line no-undef -- window object exists in the browser only
				const styles = window.getComputedStyle(main);

				// eslint-disable-next-line no-undef -- window object exists in the browser only
				const viewportWidth = window.innerWidth;
				const maxWidth = styles.maxWidth;

				return (
					maxWidth !== 'none' &&
					rect.width < viewportWidth &&
					viewportWidth - rect.width > minimumPageskinGutter
				);
			},
			{ timeout: secondsInMillis(10) },
		);
	} catch {
		logError('Pageskin width constraint not detected');
		throw new Error('Pageskin width is not constrained');
	}
	log('Checking pageskin width constraint: Complete');
};

const checkPageskinCollapsesFrontsSlots = async (page) => {
	log('Checking pageskin front slot suppression: Start');

	// When pageskin is active, DCR does not render the fronts-banner slot at all.
	// Confirming it is absent from the DOM is the simplest reliable signal.
	const frontsBannerSlot = await page.$('[id^="dfp-ad--fronts-banner-"]');
	if (frontsBannerSlot !== null) {
		logError('Fronts-banner slot present — pageskin suppression not in effect');
		throw new Error('Pageskin did not collapse expected front ad slots');
	}
	log('Checking pageskin front slot suppression: Complete');
};

module.exports = {
	checkPageskinHasLoaded,
	checkPageskinBackgroundImageHasLoaded,
	checkPageskinWidthIsConstrained,
	checkPageskinCollapsesFrontsSlots,
};
