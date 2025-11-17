import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import type { App } from 'aws-cdk-lib';
import {
	CfnParameter,
	Duration,
	Size,
	aws_synthetics as synthetics,
	Tags,
} from 'aws-cdk-lib';
import {
	Alarm,
	ComparisonOperator,
	MathExpression,
	Stats,
	TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Subscription, SubscriptionProtocol, Topic } from 'aws-cdk-lib/aws-sns';

type Props = GuStackProps & {
	articleUrl: string;
	frontUrl: string;
};

export class CommercialCanaries extends GuStack {
	constructor(scope: App, id: string, props: Props) {
		super(scope, id, props);

		const { env, stage, articleUrl, frontUrl } = props;

		if (!env?.region) {
			throw new Error('env.region is required');
		}

		const accountId = this.account;
		const s3BucketNameCanary = `cw-syn-canary-${accountId}-${env.region}`;
		const s3BucketNameResults = `cw-syn-results-${accountId}-${env.region}`;
		const isTcf = env.region === 'eu-west-1' || env.region === 'ca-central-1';

		const commonCanaryProps: synthetics.CanaryProps = {
			test: synthetics.Test.custom({
				code: synthetics.Code.fromBucket(
					Bucket.fromBucketName(this, 'CanaryS3Bucket', s3BucketNameCanary),
					`${stage.toUpperCase()}/nodejs.zip`,
				),
				handler: 'testPage.handler',
			}),
			runtime: synthetics.Runtime.SYNTHETICS_NODEJS_PUPPETEER_11_0,
			schedule: synthetics.Schedule.rate(Duration.minutes(1)),
			// Don't run non-prod canaries indefinitely
			timeToLive: stage === 'PROD' ? undefined : Duration.minutes(30),
			timeout: Duration.seconds(60),
			memory: Size.mebibytes(isTcf ? 2048 : 3008),
			provisionedResourceCleanup: true,
			successRetentionPeriod: Duration.days(7),
			failureRetentionPeriod: Duration.days(31),
			startAfterCreation: true,
		};

		const resultsBucket = Bucket.fromBucketName(
			this,
			'CanaryArtifactsS3Bucket',
			`${s3BucketNameResults}`,
		);

		const canaryFront = new synthetics.Canary(this, 'CanaryFront', {
			...commonCanaryProps,
			// Limitation of max 21 characaters and lower case. Pattern: ^[0-9a-z_\-]+$
			canaryName: `commercial_canary_${stage.toLocaleLowerCase()}_front`,
			artifactsBucketLocation: {
				bucket: resultsBucket,
				prefix: `${stage.toUpperCase()}/front`,
			},
			environmentVariables: {
				logAllRequests: 'false',
				logAllResponses: 'false',
				pageType: 'front',
				url: frontUrl,
			},
		});

		const canaryArticle = new synthetics.Canary(this, 'CanaryArticle', {
			...commonCanaryProps,
			// Limitation of max 21 characaters and lower case. Pattern: ^[0-9a-z_\-]+$
			canaryName: `commercial_canary_${stage.toLocaleLowerCase()}_article`,
			artifactsBucketLocation: {
				bucket: resultsBucket,
				prefix: `${stage.toUpperCase()}/article`,
			},
			environmentVariables: {
				logAllRequests: 'false',
				logAllResponses: 'false',
				pageType: 'article',
				url: articleUrl,
			},
		});

		/** Ensures the canary is redeployed with every code change, since the code lives in S3 separate to the canary itself */
		const buildId = new CfnParameter(this, 'BuildId', {
			type: 'String',
			description:
				'The riff-raff build id, automatically generated and provided by riff-raff',
		});
		Tags.of(canaryFront).add('buildId', buildId.valueAsString);
		Tags.of(canaryArticle).add('buildId', buildId.valueAsString);

		const topic = new Topic(this, 'Topic');
		new Subscription(this, 'Subscription', {
			topic,
			endpoint: `commercial.canaries+${stage}-${env.region}@guardian.co.uk`,
			protocol: SubscriptionProtocol.EMAIL,
			region: env.region,
		});

		/**
		 * Metric representing the canary success rate per minute, where missing data is filled in with zeros
		 * @see https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_synthetics-readme.html#alarms
		 */
		const alarmMetric = new MathExpression({
			label: 'successRate',
			expression: 'AVG([FILL(frontSuccess,0), FILL(articleSuccess,0)])',
			period: Duration.minutes(1),
			usingMetrics: {
				frontSuccess: canaryFront.metricSuccessPercent({
					statistic: Stats.AVERAGE,
					period: Duration.minutes(1),
				}),
				articleSuccess: canaryArticle.metricSuccessPercent({
					statistic: Stats.AVERAGE,
					period: Duration.minutes(1),
				}),
			},
		});

		const alarm = new Alarm(this, 'Alarm', {
			// Only allow alarm actions in PROD
			actionsEnabled: stage === 'PROD',
			alarmDescription: `Commercial canary is failing in ${env.region}.\nSee https://metrics.gutools.co.uk/d/aej6crz3hvz0gc/canary-status for details`,
			alarmName: `commercial-canary-${stage}`,
			metric: alarmMetric,
			/** Alarm is triggered if canary fails (or fails to run) 5 times in a row */
			datapointsToAlarm: 5,
			evaluationPeriods: 5,
			threshold: 100, // the metric is either 100% or 0% when evaluating minute-by-minute
			comparisonOperator: ComparisonOperator.LESS_THAN_THRESHOLD,
			treatMissingData: TreatMissingData.BREACHING,
		});

		alarm.addAlarmAction(new SnsAction(topic));
		alarm.addOkAction(new SnsAction(topic));
	}
}
