/**
 * We use custom log messages so that we can easily differentiate
 * between logs from this file and other logs in Cloudwatch.
 */
const formatMessage = (message) => `GuCanaryRun: ${message}`;

const log = (message) => console.info(formatMessage(message));

const logError = (message) => console.error(formatMessage(message));

module.exports = {
	log,
	logError,
};
