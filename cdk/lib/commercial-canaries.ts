import type { GuStackProps } from '@guardian/cdk/lib/constructs/core';
import { GuStack } from '@guardian/cdk/lib/constructs/core';
import type { App } from 'aws-cdk-lib';
import {
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
import { Topic } from 'aws-cdk-lib/aws-sns';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';

interface StackProps extends GuStackProps {
	awsRegion: string;
}

export class CommercialCanaries extends GuStack {
	constructor(scope: App, id: string, props: StackProps) {
		super(scope, id, props);

		const { awsRegion, stage } = props;

		const email = 'commercial.canaries@guardian.co.uk';
		const accountId = this.account;
		const S3BucketCanary = `cw-syn-canary-${accountId}-${awsRegion}`;
		const S3BucketResults = `cw-syn-results-${accountId}-${awsRegion}`;

		// Limitation of max 21 characaters and lower case. Pattern: ^[0-9a-z_\-]+$
		const canaryName = `comm_cmp_canary_${stage.toLocaleLowerCase()}`;

		const policyDocument = new iam.PolicyDocument({
			statements: [
				new iam.PolicyStatement({
					resources: [`arn:aws:s3:::${S3BucketCanary}/*`],
					actions: ['s3:PutObject', 's3:GetObject', 's3:GetBucketLocation'],
					effect: iam.Effect.ALLOW,
				}),
				new iam.PolicyStatement({
					resources: [`arn:aws:s3:::${S3BucketResults}/*`],
					actions: ['s3:PutObject', 's3:GetObject', 's3:GetBucketLocation'],
					effect: iam.Effect.ALLOW,
				}),
				new iam.PolicyStatement({
					resources: [
						`arn:aws:logs:${awsRegion}:${accountId}:log-group:/aws/lambda/cwsyn-${canaryName}-*`,
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
			roleName: `CloudWatchSyntheticsRole-${canaryName}-${awsRegion}`,
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

		new synthetics.CfnCanary(this, 'FooCanary', {
			artifactS3Location: `s3://${S3BucketResults}/${stage.toUpperCase()}`,
			code: {
				handler: 'pageLoadBlueprint.handler',
				s3Bucket: S3BucketCanary,
				s3Key: `${stage}/nodejs.zip`,
			},
			executionRoleArn: role.roleArn,
			name: canaryName,
			runtimeVersion: 'syn-nodejs-puppeteer-3.6',
			runConfig: {
				timeoutInSeconds: 120,
			},
			schedule: {
				expression: 'rate(2 minutes)',
				durationInSeconds: stage === 'PROD' ? '0' : '60 * 30', // Don't run non-prod canaries indefinitely
			},
			startCanaryAfterCreation: true,
			tags: [
				{
					key: 'blueprint',
					value: 'heartbeat',
				},
				{
					key: 'version',
					value: '1',
				},
			],
		});

		if (stage === 'PROD') {
			const topic = new Topic(this, 'Topic');
			topic.addSubscription(new EmailSubscription(email));

			const alarm = new Alarm(this, `Alarm`, {
				actionsEnabled: true,
				alarmDescription: 'Either a Front or an Article CMP has failed',
				alarmName: `Commercial canary`,
				comparisonOperator: ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD,
				datapointsToAlarm: 5,
				evaluationPeriods: 5,
				metric: new Metric({
					namespace: 'CloudWatchSynthetics',
					metricName: 'SuccessPercent',
					statistic: 'avg',
					period: Duration.minutes(2),
					dimensionsMap: {
						CanaryName: canaryName,
					},
				}),
				threshold: 80,
				treatMissingData: TreatMissingData.MISSING,
			});

			alarm.addAlarmAction(new SnsAction(topic));
			alarm.addOkAction(new SnsAction(topic));
		}
	}
}
