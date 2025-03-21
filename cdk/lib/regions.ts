export type Region = {
	location: string;
	locationAbbr: 'EU' | 'CA' | 'US' | 'AUS';
	build: 'tcfv2' | 'ccpa' | 'aus';
	region: 'eu-west-1' | 'ca-central-1' | 'us-west-1' | 'ap-southeast-2';
};

export const regions: Region[] = [
	{
		location: 'Europe',
		locationAbbr: 'EU',
		build: 'tcfv2',
		region: 'eu-west-1',
	},
	{
		location: 'Canada',
		locationAbbr: 'CA',
		build: 'tcfv2',
		region: 'ca-central-1',
	},
	{
		location: 'USA',
		locationAbbr: 'US',
		build: 'ccpa',
		region: 'us-west-1',
	},
	{
		location: 'Australia',
		locationAbbr: 'AUS',
		build: 'aus',
		region: 'ap-southeast-2',
	},
];
