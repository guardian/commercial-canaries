import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { regions } from '../lib/regions';
import { CommercialCanaries } from './commercial-canaries';

describe('The CommercialCanaries stack', () => {
	it.each(regions)('matches the $location CODE snapshot', ({ region }) => {
		const app = new App();
		const stack = new CommercialCanaries(app, 'CommercialCanaries', {
			stack: 'frontend',
			stage: 'CODE',
			env: { region },
		});

		const template = Template.fromStack(stack);
		expect(template.toJSON()).toMatchSnapshot();
	});

	it.each(regions)('matches the $location PROD snapshot', ({ region }) => {
		const app = new App();
		const stack = new CommercialCanaries(app, 'CommercialCanaries', {
			stack: 'frontend',
			stage: 'PROD',
			env: { region },
		});

		const template = Template.fromStack(stack);
		expect(template.toJSON()).toMatchSnapshot();
	});
});
