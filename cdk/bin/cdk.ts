import 'source-map-support/register';
import { GuRoot } from '@guardian/cdk/lib/constructs/root';
import { CommercialCanaries } from '../lib/commercial-canaries';
import { regions } from '../lib/regions';

const app = new GuRoot();

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
