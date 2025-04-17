import { RiffRaffYamlFile } from '@guardian/cdk/lib/riff-raff-yaml-file';
import { App } from 'aws-cdk-lib';
import { CommercialCanaries } from '../lib/commercial-canaries';
import { regions } from '../lib/regions';

const cdkApp = new App();

const stages = ['CODE', 'PROD'];
const stack = 'frontend';
const cloudFormationStackName = 'commercial-canary';

const canaryApps = stages
	.map((stage) =>
		regions.map(({ locationAbbr, region, frontUrl, articleUrl }) => ({
			app: new CommercialCanaries(
				cdkApp,
				`CommercialCanaries-${locationAbbr}-${stage}-front`,
				{
					stack,
					stage,
					env: { region },
					cloudFormationStackName,
					frontUrl,
					articleUrl,
				},
			),
			locationAbbr,
			region,
		})),
	)
	.flat();

const riffRaff = new RiffRaffYamlFile(cdkApp);
const {
	riffRaffYaml: { deployments },
} = riffRaff;

deployments.forEach((deployment) => {
	deployment.parameters.cloudFormationStackName = cloudFormationStackName;
	deployment.parameters.prependStackToCloudFormationStackName = false;
	deployment.parameters.cloudFormationStackByTags = false;
});

canaryApps.forEach(({ locationAbbr, region }) => {
	deployments.set(`upload-${locationAbbr.toLowerCase()}`, {
		type: 'aws-s3',
		app: 'commercial-canaries',
		regions: new Set([region]),
		stacks: new Set([stack]),
		parameters: {
			bucketSsmKey: `/account/services/commercial-canary.bucket`,
			cacheControl: 'private',
			publicReadAcl: false,
			prefixStack: false,
			prefixPackage: false,
		},
		contentDirectory: `upload-${locationAbbr.toLowerCase()}`,
	});
});

riffRaff.synth();
