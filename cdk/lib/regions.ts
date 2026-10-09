export type Region = {
	location: string;
	locationAbbr: 'EU' | 'CA' | 'US' | 'AUS';
	build: 'tcfv2' | 'ccpa' | 'aus';
	region: 'eu-west-1' | 'ca-central-1' | 'us-west-1' | 'ap-southeast-2';
	articlePath: string;
	frontPath: string;
};

export const regions: Region[] = [
	{
		location: 'Europe',
		locationAbbr: 'EU',
		build: 'tcfv2',
		region: 'eu-west-1',
		frontPath: 'europe',
		articlePath:
			'environment/2022/apr/22/disbanding-of-dorset-wildlife-team-puts-birds-pray-at-risk',
	},
	{
		location: 'Canada',
		locationAbbr: 'CA',
		build: 'tcfv2',
		region: 'ca-central-1',
		frontPath: 'international',
		articlePath:
			'environment/2022/apr/22/disbanding-of-dorset-wildlife-team-puts-birds-pray-at-risk',
	},
	{
		location: 'US',
		locationAbbr: 'US',
		build: 'ccpa',
		region: 'us-west-1',
		frontPath: 'us',
		articlePath:
			'food/2020/dec/16/how-to-make-the-perfect-vegetarian-sausage-rolls-recipe-felicity-cloake',
	},
	{
		location: 'Australia',
		locationAbbr: 'AUS',
		build: 'aus',
		region: 'ap-southeast-2',
		frontPath: 'au',
		articlePath:
			'food/2020/dec/16/how-to-make-the-perfect-vegetarian-sausage-rolls-recipe-felicity-cloake',
	},
];
