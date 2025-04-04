const logger = require('SyntheticsLogger');

/**
 * We use custom log messages so that we can easily differentiate
 * between logs from this file and other logs in Cloudwatch.
 */
const formatMessage = (message) => `GuCanaryRun : ${message}`;

export const log = (message) => {
	logger.info(formatMessage(message));
};
export const logError = (message) => {
	logger.error(formatMessage(message));
};
