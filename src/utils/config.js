const synthetics = require('Synthetics');

const setConfig = () => {
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
		logRequest: process.env.logAllRequests === 'true',
		logResponse: process.env.logAllResponses === 'true',
		screenshotOnStepStart: false,
		screenshotOnStepSuccess: false,
		screenshotOnStepFailure: true,
	});
};

module.exports = {
	setConfig,
};
