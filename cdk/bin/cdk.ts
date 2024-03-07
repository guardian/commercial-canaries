import 'source-map-support/register';
import { RiffRaffYamlFile } from '@guardian/cdk/lib/riff-raff-yaml-file';
import { App } from 'aws-cdk-lib';
import { CommercialCanaries } from '../lib/commercial-canaries';
import { regions } from '../lib/regions';

const app = new App();

const stages = ['CODE', 'PROD'];

stages.forEach((stage) => {
	regions.forEach(({ locationAbbr, region }) => {
		new CommercialCanaries(app, `CommercialCanaries-${locationAbbr}-${stage}`, {
			stack: 'frontend',
			env: {
				region: region,
			},
			stage,
			cloudFormationStackName: `commercial-canary`,
		});
	});
});

const riffRaff = new RiffRaffYamlFile(app);
const {
	riffRaffYaml: { deployments },
} = riffRaff;

regions.forEach(({ locationAbbr, region }) => {
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
});

riffRaff.synth();
