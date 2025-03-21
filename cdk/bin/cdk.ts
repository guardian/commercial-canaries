import { RiffRaffYamlFile } from '@guardian/cdk/lib/riff-raff-yaml-file';
import { App as CDKApp } from 'aws-cdk-lib';
import { CommercialCanaries } from '../lib/commercial-canaries';
import { regions } from '../lib/regions';

const cdkApp = new CDKApp();

const riffRaff = new RiffRaffYamlFile(cdkApp);
const {
	riffRaffYaml: { deployments },
} = riffRaff;

deployments.forEach((deployment) => {
	deployment.parameters.cloudFormationStackName = 'commercial-canary';
	deployment.parameters.prependStackToCloudFormationStackName = false;
	deployment.parameters.cloudFormationStackByTags = false;
});

['CODE', 'PROD'].map((stage) =>
	regions.map(({ region, locationAbbr }) => {
		// CDK app
		new CommercialCanaries(
			cdkApp,
			`CommercialCanaries-${locationAbbr}-${stage}`,
			{
				stack: 'frontend',
				env: { region },
				stage,
				cloudFormationStackName: `commercial-canary`,
			},
		);

		// Corresponding RiffRaff deployment for app
		deployments.set(`upload-${locationAbbr.toLowerCase()}`, {
			type: 'aws-s3',
			app: 'commercial-canaries',
			regions: new Set([region]),
			stacks: new Set(['frontend']),
			parameters: {
				bucketSsmKey: `/account/services/commercial-canary.bucket`,
				cacheControl: 'private',
				publicReadAcl: false,
				prefixStack: false,
				prefixPackage: false,
			},
			contentDirectory: `upload-${locationAbbr.toLowerCase()}`,
		});
	}),
);

riffRaff.synth();
