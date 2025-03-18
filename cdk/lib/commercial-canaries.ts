import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import type { App } from 'aws-cdk-lib';
import {
	CfnParameter,
	Duration,
	aws_iam as iam,
	aws_synthetics as synthetics,
} from 'aws-cdk-lib';
import {
	Alarm,
	ComparisonOperator,
	Metric,
	TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Subscription, SubscriptionProtocol, Topic } from 'aws-cdk-lib/aws-sns';

const THIRTY_MINUTES_IN_SECONDS = '1800';

export class CommercialCanaries extends GuStack {
	constructor(scope: App, id: string, props: GuStackProps) {
		super(scope, id, props);

		const { env, stage } = props;

		if (!env?.region) {
			throw new Error('env.region is required');
		}

		const email = 'commercial.canaries@guardian.co.uk';
		const accountId = this.account;
		const S3BucketCanary = `cw-syn-canary-${accountId}-${env.region}`;
		const S3BucketResults = `cw-syn-results-${accountId}-${env.region}`;
		const isTcf = env.region === 'eu-west-1' || env.region === 'ca-central-1';

		// Limitation of max 21 characaters and lower case. Pattern: ^[0-9a-z_\-]+$
		const canaryName = `comm_cmp_canary_${stage.toLocaleLowerCase()}`;

		/**
		 *  This is used to ensure the canary is redeployed when the build id changes as it increments for each riff-raff build
		 */
		const buildId = new CfnParameter(this, 'BuildId', {
			type: 'String',
			description:
				'The riff-raff build id, automatically generated and provided by riff-raff',
		});

		const policyDocument = new iam.PolicyDocument({
			statements: [
				new iam.PolicyStatement({
					resources: [`arn:aws:s3:::${S3BucketCanary}/*`],
					actions: ['s3:PutObject', 's3:GetObject', 's3:GetBucketLocation'],
					effect: iam.Effect.ALLOW,
				}),
				new iam.PolicyStatement({
					resources: [`arn:aws:s3:::${S3BucketResults}/*`],
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

		new synthetics.CfnCanary(this, 'Canary', {
			artifactS3Location: `s3://${S3BucketResults}/${stage.toUpperCase()}`,
			code: {
				handler: 'pageLoadBlueprint.handler',
				s3Bucket: S3BucketCanary,
				s3Key: `${stage}/nodejs.zip`,
			},
			executionRoleArn: role.roleArn,
			name: canaryName,
			runtimeVersion: 'syn-nodejs-puppeteer-7.0',
			runConfig: {
				timeoutInSeconds: 60,
				memoryInMb: isTcf ? 2048 : 3008,
			},
			schedule: {
				expression: 'rate(1 minute)',
				durationInSeconds: stage === 'PROD' ? '0' : THIRTY_MINUTES_IN_SECONDS, // Don't run non-prod canaries indefinitely
			},
			deleteLambdaResourcesOnCanaryDeletion: true,
			successRetentionPeriod: 7,
			failureRetentionPeriod: 31,
			startCanaryAfterCreation: true,
			tags: [
				{
					key: 'BuildId',
					value: buildId.valueAsString,
				},
			],
		});

		if (stage === 'PROD') {
			const topic = new Topic(this, `Topic-${stage}`);

			new Subscription(this, `Subscription-${stage}`, {
				topic,
				endpoint: email,
				protocol: SubscriptionProtocol.EMAIL,
			});

			const alarm = new Alarm(this, `Alarm-${stage}`, {
				actionsEnabled: true,
				alarmDescription: 'Either a Front or an Article CMP has failed',
				alarmName: `commercial-canary-${stage}`,
				comparisonOperator: ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD,
				datapointsToAlarm: 5,
				evaluationPeriods: 5,
				metric: new Metric({
					namespace: 'CloudWatchSynthetics',
					metricName: 'SuccessPercent',
					statistic: 'avg',
					period: Duration.minutes(1),
					dimensionsMap: {
						CanaryName: canaryName,
					},
				}),
				threshold: 80,
				treatMissingData: TreatMissingData.BREACHING,
			});

			alarm.addAlarmAction(new SnsAction(topic));
			alarm.addOkAction(new SnsAction(topic));
		}
	}
}
