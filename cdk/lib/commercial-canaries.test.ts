import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CommercialCanaries } from './commercial-canaries';

describe('The CommercialCanaries stack', () => {
	it('matches the UK CODE snapshot', () => {
		const app = new App();
		const stack = new CommercialCanaries(app, 'CommercialCanaries', {
			stack: 'frontend',
			stage: 'CODE',
			env: {
				region: 'eu-west-1',
			},
		});

		const template = Template.fromStack(stack);
		expect(template.toJSON()).toMatchSnapshot();
	});

	it('matches the UK PROD snapshot', () => {
		const app = new App();
		const stack = new CommercialCanaries(app, 'CommercialCanaries', {
			stack: 'frontend',
			stage: 'PROD',
			env: {
				region: 'eu-west-1',
			},
		});

		const template = Template.fromStack(stack);
		expect(template.toJSON()).toMatchSnapshot();
	});

	it('matches the Canada CODE snapshot', () => {
		const app = new App();
		const stack = new CommercialCanaries(app, 'CommercialCanaries', {
			stack: 'frontend',
			stage: 'CODE',
			env: {
				region: 'ca-central-1',
			},
		});

		const template = Template.fromStack(stack);
		expect(template.toJSON()).toMatchSnapshot();
	});

	it('matches the Canada PROD snapshot', () => {
		const app = new App();
		const stack = new CommercialCanaries(app, 'CommercialCanaries', {
			stack: 'frontend',
			stage: 'PROD',
			env: {
				region: 'ca-central-1',
			},
		});

		const template = Template.fromStack(stack);
		expect(template.toJSON()).toMatchSnapshot();
	});

	it('matches the US CODE snapshot', () => {
		const app = new App();
		const stack = new CommercialCanaries(app, 'CommercialCanaries', {
			stack: 'frontend',
			stage: 'CODE',
			env: {
				region: 'us-west-1',
			},
		});

		const template = Template.fromStack(stack);
		expect(template.toJSON()).toMatchSnapshot();
	});

	it('matches the US PROD snapshot', () => {
		const app = new App();
		const stack = new CommercialCanaries(app, 'CommercialCanaries', {
			stack: 'frontend',
			stage: 'PROD',
			env: {
				region: 'us-west-1',
			},
		});

		const template = Template.fromStack(stack);
		expect(template.toJSON()).toMatchSnapshot();
	});

	it('matches the Australia CODE snapshot', () => {
		const app = new App();
		const stack = new CommercialCanaries(app, 'CommercialCanaries', {
			stack: 'frontend',
			stage: 'CODE',
			env: {
				region: 'ap-southeast-2',
			},
		});

		const template = Template.fromStack(stack);
		expect(template.toJSON()).toMatchSnapshot();
	});

	it('matches the Australia PROD snapshot', () => {
		const app = new App();
		const stack = new CommercialCanaries(app, 'CommercialCanaries', {
			stack: 'frontend',
			stage: 'PROD',
			env: {
				region: 'ap-southeast-2',
			},
		});

		const template = Template.fromStack(stack);
		expect(template.toJSON()).toMatchSnapshot();
	});
});
