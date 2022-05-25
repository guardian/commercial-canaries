import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { CommercialCanaries } from '../lib/commercial-canaries';
import { regions } from '../lib/regions';

const app = new App();

const stages = ['CODE', 'PROD'];

stages.forEach((stage) => {
	regions.forEach(({ shortName: region, awsRegion }) => {
		new CommercialCanaries(app, `CommercialCanaries-${region}-${stage}`, {
			stack: 'frontend',
			region: awsRegion,
			stage,
		});
	});
});
