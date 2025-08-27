const logger = require('SyntheticsLogger');

/**
 * We use custom log messages so that we can easily differentiate
 * between logs from this file and other logs in Cloudwatch.
 */
const formatMessage = (message) => `GuCanaryRun: ${message}`;

const log = (message) => logger.info(formatMessage(message));

const logError = (message) => logger.error(formatMessage(message));

const subscribeToCommercialLogger = () =>
	// eslint-disable-next-line no-undef -- window object exists in the browser only
	window.guardian.logger.subscribeTo('commercial');

module.exports = {
	log,
	logError,
	subscribeToCommercialLogger,
};
