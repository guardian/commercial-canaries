const synthetics = require('Synthetics');
const { testPage } = require('../cmp_tcfv2');

const LOG_EVERY_REQUEST = false;
const LOG_EVERY_RESPONSE = false;

const pageLoadArticle = async function () {
	const synConfig = synthetics.getConfiguration();
	synConfig.setConfig({
		/**
		 * Set harFile to true to see a detailed log of the HTTP requests that were made when the canary was run,
		 * along with the responses and the amount of time that it took for the request to complete:
		 */
		harFile: false,
		/**
		 * Setting logRequest and logResponse to true will log all requests/responses in the Cloudwatch logs.
		 * There are ~1000 of each, which makes it difficult to search through Cloudwatch
		 * when set to true, yet may be helpful for extra debugging.
		 */
		logRequest: LOG_EVERY_REQUEST,
		logResponse: LOG_EVERY_RESPONSE,
		screenshotOnStepStart: false,
		screenshotOnStepSuccess: false,
		screenshotOnStepFailure: true,
	});

	/** The query param "adtest=fixed-puppies-ci" is used to ensure that GAM provides us with an ad for our slot */
	const url =
		'https://www.theguardian.com/environment/2022/apr/22/disbanding-of-dorset-wildlife-team-puts-birds-pray-at-risk?adtest=fixed-puppies-ci';
	const pageType = 'article';

	await testPage(url, pageType);
};

exports.handler = async () => {
	return await pageLoadArticle();
};
