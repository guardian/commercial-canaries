import { RiffRaffYamlFile } from '@guardian/cdk/lib/riff-raff-yaml-file';
import { App as CDKApp } from 'aws-cdk-lib';
import { CommercialCanaries } from '../lib/commercial-canaries';
import type { Region } from '../lib/regions';
import { regions } from '../lib/regions';

const cdkApp = new CDKApp();

const canaryApp = ({
	locationAbbr,
	stage,
	region,
}: {
	locationAbbr: Region['locationAbbr'];
	stage: 'CODE' | 'PROD';
	region: Region['awsRegion'];
}) =>
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

/** EU - CODE */
canaryApp({ locationAbbr: 'EU', region: 'eu-west-1', stage: 'CODE' });
/** EU - PROD */
canaryApp({ locationAbbr: 'EU', region: 'eu-west-1', stage: 'PROD' });

/** Canada - CODE */
canaryApp({ locationAbbr: 'CA', region: 'ca-central-1', stage: 'CODE' });
/** Canada - PROD */
canaryApp({ locationAbbr: 'CA', region: 'ca-central-1', stage: 'PROD' });

/** US - CODE */
canaryApp({ locationAbbr: 'US', region: 'us-west-1', stage: 'CODE' });
/** US - PROD */
canaryApp({ locationAbbr: 'US', region: 'us-west-1', stage: 'PROD' });

/** Australia - CODE */
canaryApp({ locationAbbr: 'AUS', region: 'ap-southeast-2', stage: 'CODE' });
/** Australia - PROD */
canaryApp({ locationAbbr: 'AUS', region: 'ap-southeast-2', stage: 'PROD' });

const riffRaff = new RiffRaffYamlFile(cdkApp);
const {
	riffRaffYaml: { deployments },
} = riffRaff;

deployments.forEach((deployment) => {
	deployment.parameters.cloudFormationStackName = 'commercial-canary';
	deployment.parameters.prependStackToCloudFormationStackName = false;
	deployment.parameters.cloudFormationStackByTags = false;
});

regions.forEach(({ locationAbbr, awsRegion }) => {
	deployments.set(`upload-${locationAbbr.toLowerCase()}`, {
		type: 'aws-s3',
		app: 'commercial-canaries',
		regions: new Set([awsRegion]),
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
