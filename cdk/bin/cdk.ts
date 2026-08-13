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
		regions.map(
			({ locationAbbr, region, frontUrl, articleUrl, pageskinUrl }) => ({
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
						pageskinUrl,
					},
				),
				locationAbbr,
				region,
			}),
		),
	)
	.flat();

const riffRaff = new RiffRaffYamlFile(cdkApp);
const { configuration } = riffRaff;
const riffRaffProjectName = 'frontend::commercial-canaries';

canaryApps.forEach(({ locationAbbr, region }) => {
	configuration.get(riffRaffProjectName)?.deployments.set(`upload-${locationAbbr.toLowerCase()}`, {
		type: 'aws-s3',
		app: 'commercial-canaries',
		regions: new Set([region]),
		stacks: new Set([stack]),
		parameters: {
			bucketSsmKey: `/account/services/commercial-canary.bucket`,
			cacheControl: 'private',
			cloudFormationStackByTags: false,
			cloudFormationStackName: cloudFormationStackName,
			prefixPackage: false,
			prefixStack: false,
			prependStackToCloudFormationStackName: false,
			publicReadAcl: false,
		},
		contentDirectory: `upload-${locationAbbr.toLowerCase()}`,
	});
});

riffRaff.synth();
