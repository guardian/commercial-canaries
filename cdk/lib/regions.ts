export type Region = {
	location: string;
	locationAbbr: 'EU' | 'CA' | 'US' | 'AUS';
	build: 'tcfv2' | 'ccpa' | 'aus';
	region: 'eu-west-1' | 'ca-central-1' | 'us-west-1' | 'ap-southeast-2';
	frontUrl: string;
	articleUrl: string;
};

export const regions: Region[] = [
	{
		location: 'Europe',
		locationAbbr: 'EU',
		build: 'tcfv2',
		region: 'eu-west-1',
		/** The query param "adtest=fixed-puppies-ci" is used to ensure that GAM provides us with an ad for our slot */
		frontUrl: 'https://www.theguardian.com?adtest=fixed-puppies-ci',
		articleUrl:
			'https://www.theguardian.com/environment/2022/apr/22/disbanding-of-dorset-wildlife-team-puts-birds-pray-at-risk?adtest=fixed-puppies-ci',
	},
	{
		location: 'Canada',
		locationAbbr: 'CA',
		build: 'tcfv2',
		region: 'ca-central-1',
		frontUrl: 'https://www.theguardian.com?adtest=fixed-puppies-ci',
		articleUrl:
			'https://www.theguardian.com/environment/2022/apr/22/disbanding-of-dorset-wildlife-team-puts-birds-pray-at-risk?adtest=fixed-puppies-ci',
	},
	{
		location: 'US',
		locationAbbr: 'US',
		build: 'ccpa',
		region: 'us-west-1',
		frontUrl: 'https://www.theguardian.com/us?adtest=fixed-puppies-ci',
		articleUrl:
			'https://www.theguardian.com/food/2020/dec/16/how-to-make-the-perfect-vegetarian-sausage-rolls-recipe-felicity-cloake?adtest=fixed-puppies-ci',
	},
	{
		location: 'Australia',
		locationAbbr: 'AUS',
		build: 'aus',
		region: 'ap-southeast-2',
		frontUrl: 'https://www.theguardian.com/au?adtest=fixed-puppies-ci',
		articleUrl:
			'https://www.theguardian.com/food/2020/dec/16/how-to-make-the-perfect-vegetarian-sausage-rolls-recipe-felicity-cloake?adtest=fixed-puppies-ci',
	},
];
