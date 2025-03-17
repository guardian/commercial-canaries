export type Region = {
	location: string;
	locationAbbr: 'EU' | 'CA' | 'US' | 'AUS';
	build: 'tcfv2' | 'ccpa' | 'aus';
	awsRegion: 'eu-west-1' | 'ca-central-1' | 'us-west-1' | 'ap-southeast-2';
};

export const regions: Region[] = [
	{
		location: 'EU',
		locationAbbr: 'EU',
		build: 'tcfv2',
		awsRegion: 'eu-west-1',
	},
	{
		location: 'Canada',
		locationAbbr: 'CA',
		build: 'tcfv2',
		awsRegion: 'ca-central-1',
	},
	{
		location: 'US',
		locationAbbr: 'US',
		build: 'ccpa',
		awsRegion: 'us-west-1',
	},
	{
		location: 'Australia',
		locationAbbr: 'AUS',
		build: 'aus',
		awsRegion: 'ap-southeast-2',
	},
];
