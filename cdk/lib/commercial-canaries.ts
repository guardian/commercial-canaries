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
	Stats,
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

		const canary = new synthetics.Canary(this, 'Canary', {
			artifactsBucketLocation: {
				bucket: Bucket.fromBucketName(
					this,
					'CanaryArtifactsS3Bucket',
					`${s3BucketNameResults}/${stage.toUpperCase()}`,
				),
			},
			test: synthetics.Test.custom({
				code: synthetics.Code.fromBucket(
					Bucket.fromBucketName(this, 'CanaryS3Bucket', s3BucketNameCanary),
					`${stage.toUpperCase()}/nodejs.zip`,
				),
				handler: 'pageLoadBlueprint.handler',
			}),
			role,
			canaryName,
			runtime: synthetics.Runtime.SYNTHETICS_NODEJS_PUPPETEER_7_0,
			schedule: synthetics.Schedule.rate(Duration.minutes(1)),
			timeout: Duration.seconds(60),
			memory: Size.mebibytes(isTcf ? 2048 : 3008),
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

		const alarm = new Alarm(this, 'Alarm', {
			// Only allow alarm actions in PROD
			actionsEnabled: stage === 'PROD',
			alarmDescription: `Low success rate for canary in ${env.region} over the last 5 minutes.\nSee https://metrics.gutools.co.uk/d/degb6prp5nqpsc/canary-status for details`,
			alarmName: `commercial-canary-${stage}`,
			/**
			 * This metric represents the success rate where missing data is filled in with zeros
			 * @see https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_synthetics-readme.html#alarms
			 */
			metric: new MathExpression({
				expression: 'FILL(successPercentRaw, 0)',
				usingMetrics: {
					successPercentRaw: canary.metricSuccessPercent({
						statistic: Stats.AVERAGE,
						period: Duration.minutes(1),
					}),
				},
			}),
			/** Alarm is triggered if canary fails (or fails to run) 3 times in a period of 5 minutes */
			datapointsToAlarm: 3,
			evaluationPeriods: 5,
			threshold: 100, // the metric is either 100% or 0% when evaluating minute-by-minute
			comparisonOperator: ComparisonOperator.LESS_THAN_THRESHOLD,
			treatMissingData: TreatMissingData.BREACHING,
		});

		alarm.addAlarmAction(new SnsAction(topic));
		alarm.addOkAction(new SnsAction(topic));
	}
}
