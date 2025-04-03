import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import type { App } from 'aws-cdk-lib';
import {
	Duration,
	aws_iam as iam,
	Size,
	aws_synthetics as synthetics,
} from 'aws-cdk-lib';
import {
	Alarm,
	ComparisonOperator,
	MathExpression,
	TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Subscription, SubscriptionProtocol, Topic } from 'aws-cdk-lib/aws-sns';

export class CommercialCanaries extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const { env, stage } = props;

		if (!env?.region) {
			throw new Error('env.region is required');
		}

		const accountId = this.account;
		const s3BucketNameCanary = `cw-syn-canary-${accountId}-${env.region}`;
		const s3BucketNameResults = `cw-syn-results-${accountId}-${env.region}`;
		const isTcf = env.region === 'eu-west-1' || env.region === 'ca-central-1';

		// Limitation of max 21 characaters and lower case. Pattern: ^[0-9a-z_\-]+$
		const canaryName = `comm_cmp_canary_${stage.toLocaleLowerCase()}`;

		const policyDocument = new iam.PolicyDocument({
			statements: [
				new iam.PolicyStatement({
					resources: [`arn:aws:s3:::${s3BucketNameCanary}/*`],
					actions: ['s3:PutObject', 's3:GetObject', 's3:GetBucketLocation'],
					effect: iam.Effect.ALLOW,
				}),
				new iam.PolicyStatement({
					resources: [`arn:aws:s3:::${s3BucketNameResults}/*`],
					actions: [
						's3:PutObject',
						's3:GetObject',
						's3:GetBucketLocation',
						's3:DeleteObject',
					],
					effect: iam.Effect.ALLOW,
				}),
				new iam.PolicyStatement({
					resources: [
						`arn:aws:logs:${env.region}:${accountId}:log-group:/aws/lambda/cwsyn-${canaryName}-*`,
					],
					actions: [
						'logs:CreateLogStream',
						'logs:PutLogEvents',
						'logs:CreateLogGroup',
					],
					effect: iam.Effect.ALLOW,
				}),
				new iam.PolicyStatement({
					resources: ['*'],
					actions: ['s3:ListAllMyBuckets', 'xray:PutTraceSegments'],
					effect: iam.Effect.ALLOW,
				}),
				new iam.PolicyStatement({
					resources: ['*'],
					actions: ['cloudwatch:PutMetricData'],
					effect: iam.Effect.ALLOW,
					conditions: {
						StringEquals: {
							'cloudwatch:namespace': 'CloudWatchSynthetics',
						},
					},
				}),
			],
		});

		const role = new iam.Role(this, 'Role', {
			assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
			roleName: `CloudWatchSyntheticsRole-${canaryName}-${env.region}`,
			description:
				'CloudWatch Synthetics lambda execution role for running canaries',
			managedPolicies: [
				{
					managedPolicyArn:
						'arn:aws:iam::aws:policy/CloudWatchSyntheticsFullAccess',
				},
			],
			inlinePolicies: {
				PolicyDocument: policyDocument,
			},
		});

		const canaryCodeS3Bucket = Bucket.fromBucketName(
			this,
			'CanaryS3Bucket',
			s3BucketNameCanary,
		);

		const canaryArtifactsS3Bucket = Bucket.fromBucketName(
			this,
			'CanaryArtifactsS3Bucket',
			`${s3BucketNameResults}/${stage.toUpperCase()}`,
		);

		const canary = new synthetics.Canary(this, 'Canary', {
			schedule: synthetics.Schedule.rate(Duration.minutes(1)),
			test: synthetics.Test.custom({
				code: synthetics.Code.fromBucket(
					canaryCodeS3Bucket,
					`${stage}/nodejs.zip`,
				),
				handler: 'pageLoadBlueprint.handler',
			}),
			role,
			canaryName,
			runtime: synthetics.Runtime.SYNTHETICS_NODEJS_PUPPETEER_7_0,
			timeout: Duration.seconds(60),
			memory: Size.mebibytes(isTcf ? 2048 : 3008),
			artifactsBucketLocation: { bucket: canaryArtifactsS3Bucket },
			// Don't run non-prod canaries indefinitely
			timeToLive: stage === 'PROD' ? undefined : Duration.minutes(30),
			provisionedResourceCleanup: true,
			successRetentionPeriod: Duration.days(7),
			failureRetentionPeriod: Duration.days(31),
			startAfterCreation: true,
		});

		const topic = new Topic(this, 'Topic');
		new Subscription(this, 'Subscription', {
			topic,
			endpoint: `commercial.canaries+${stage}-${env.region}@guardian.co.uk`,
			protocol: SubscriptionProtocol.EMAIL,
			region: env.region,
		});

		/**
		 * Alarm triggered if canary has an average success rate of lower than 80%
		 * over five minutes twice in a row (ie over a total of a ten minute period)
		 *
		 * For example, a fifteen minute period visualisation:
		 *
		 * | <--- 5 minutes ----> | <--- 5 minutes ----> | <--- 5 minutes ----> |
		 * |  success rate: 40%   |  success rate: 100%  |  success rate: 60%   | // NOT TRIGGERED (two non-consecutive failure periods)
		 * |  success rate: 80%   |  success rate: 60%   |  success rate: 60%   | // IS TRIGGERED (two consecutive failure periods)
		 *
		 */
		const alarm = new Alarm(this, 'CanaryFailureAlarm', {
			actionsEnabled: stage === 'PROD', // Only allow actions in prod
			alarmDescription: `Either a Front or an Article CMP has failed in ${env.region}`,
			alarmName: `commercial-canary-${stage}`,
			comparisonOperator: ComparisonOperator.LESS_THAN_THRESHOLD,
			/** @see https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_synthetics-readme.html#alarms */
			metric: canary.metricSuccessPercent({
				statistic: 'avg',
				period: Duration.minutes(5),
			}),
			datapointsToAlarm: 1,
			evaluationPeriods: 2,
			threshold: 80,
			treatMissingData: TreatMissingData.BREACHING,
		});

		if (stage === 'PROD') {
			alarm.addAlarmAction(new SnsAction(topic));
			alarm.addOkAction(new SnsAction(topic));
		}
	}
}
