import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { CommercialCanaries } from './commercial-canaries';

describe('The CommercialCanaries stack', () => {
	it('matches the UK CODE snapshot', () => {
		const app = new App();
		const stack = new CommercialCanaries(app, 'CommercialCanaries', {
			stack: 'frontend',
			stage: 'CODE',
			awsRegion: 'eu-west-1',
			location: 'UK',
		});

		const template = Template.fromStack(stack);
		expect(template.toJSON()).toMatchSnapshot();
	});

	it('matches the UK PROD snapshot', () => {
		const app = new App();
		const stack = new CommercialCanaries(app, 'CommercialCanaries', {
			stack: 'frontend',
			stage: 'PROD',
			awsRegion: 'eu-west-1',
			location: 'UK',
		});

		const template = Template.fromStack(stack);
		expect(template.toJSON()).toMatchSnapshot();
	});

	it('matches the Canada CODE snapshot', () => {
		const app = new App();
		const stack = new CommercialCanaries(app, 'CommercialCanaries', {
			stack: 'frontend',
			stage: 'CODE',
			awsRegion: 'ca-central-1',
			location: 'Canada',
		});

		const template = Template.fromStack(stack);
		expect(template.toJSON()).toMatchSnapshot();
	});

	it('matches the Canada PROD snapshot', () => {
		const app = new App();
		const stack = new CommercialCanaries(app, 'CommercialCanaries', {
			stack: 'frontend',
			stage: 'PROD',
			awsRegion: 'ca-central-1',
			location: 'Canada',
		});

		const template = Template.fromStack(stack);
		expect(template.toJSON()).toMatchSnapshot();
	});

	it('matches the US CODE snapshot', () => {
		const app = new App();
		const stack = new CommercialCanaries(app, 'CommercialCanaries', {
			stack: 'frontend',
			stage: 'CODE',
			awsRegion: 'us-west-1',
			location: 'US',
		});

		const template = Template.fromStack(stack);
		expect(template.toJSON()).toMatchSnapshot();
	});

	it('matches the US PROD snapshot', () => {
		const app = new App();
		const stack = new CommercialCanaries(app, 'CommercialCanaries', {
			stack: 'frontend',
			stage: 'PROD',
			awsRegion: 'us-west-1',
			location: 'US',
		});

		const template = Template.fromStack(stack);
		expect(template.toJSON()).toMatchSnapshot();
	});

	it('matches the Australia CODE snapshot', () => {
		const app = new App();
		const stack = new CommercialCanaries(app, 'CommercialCanaries', {
			stack: 'frontend',
			stage: 'CODE',
			awsRegion: 'ap-southeast-2',
			location: 'Australia',
		});

		const template = Template.fromStack(stack);
		expect(template.toJSON()).toMatchSnapshot();
	});

	it('matches the Australia PROD snapshot', () => {
		const app = new App();
		const stack = new CommercialCanaries(app, 'CommercialCanaries', {
			stack: 'frontend',
			stage: 'PROD',
			awsRegion: 'ap-southeast-2',
			location: 'Australia',
		});

		const template = Template.fromStack(stack);
		expect(template.toJSON()).toMatchSnapshot();
	});
});
