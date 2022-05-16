# Commercial Canaries

The commercial canaries are a set of [AWS Synthetics Canaries](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries.html) hosted on the frontend AWS account that monitor fronts and article pages, ensuring they are working as expected with regard to ads and the CMP. A canary is a series of lambda functions that use Puppeteer to run a headless browser, load the site and check it behaves as expected. 

Canaries are hosted in the following regions: Ireland, Canada, the US and Australia.

## Configuration

A canary will initiate a run every two minutes. 

| Region          | File            | AWS Region     | Canary name               | Banner button text                  |
| --------------- | --------------- | -------------- | ------------------------- | ----------------------------------- |
| Ireland         | `src/cmp_tcfv2` | eu-west-1      | commercial_cmp_uk         | Yes, I’m happy                      |
| Canada          | `src/cmp_tcfv2` | ca-central-1   | commercial_cmp_ca         | Yes, I’m happy                      |
| US              | `src/cmp_ccpa`  | us-west-1      | commercial_cmp_us         | Do not sell my personal information |
| Australia       | `src/cmp_aus`   | ap-southeast-2 | commercial_cmp_aus        | Continue                            |

The Ireland and Canada canaries use the same source file as they both operate under [TCFV2](https://iabeurope.eu/tcf-2-0/). However, we monitor these regions separately as there are different possible failure modes since ads are controlled by a third party.

The US and Australia canaries have very similar source files, since the relationship between the ads and the CMP is the same for both regions. The difference is that each region has different cookie banners, with different button text.

In Ireland and Canada we must not load ads before the CMP is interacted with and consent is given, whereas in the US and Australia we can load ads on page load.

Within the canary code we test the following:

| Region    | On page load | Accept cookies | Clear cookies & refresh |
| --------- |:------------:|:--------------:|:-----------------------:|
| US        | Ads          | Ads            | Ads                     |
| Australia | Ads          | Ads            | Ads                     |
| Ireland   | No ads       | Ads            | No ads                  |
| Canada    | No ads       | Ads            | No ads                  |

## Monitoring and notifications

You can find the status of each canary by logging into the frontend AWS console and navigating to CloudWatch > Synthetics Canaries. You'll need to switch regions at the top of the screen to see each one. A [combined dashboard](https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#dashboards:name=Commercial-Canaries) of the status checks is also available.

If ads are not loading in a region, the team is informed via email by a CloudWatch Alarm which is sent to commercial.canaries@guardian.co.uk. Five consecutive failures are required to send an alarm. Another notification is sent on the first pass following five consecutive failures.

- On **failure** the email subjects look like this: `ALARM: "US CMP failed" in US West (N. California)`
- On **recovery** the email subject looks like this: `OK: "US CMP failed" in US West (N. California)`

When you are logged into the AWS account for frontend via [Janus](https://janus.gutools.co.uk/) you can see more detailed status information or the raw output from the Lambda run that failed.

## Debugging

Login to AWS frontend via Janus. To find the canary in AWS: 
- Ensure you are in the correct AWS region (`us-west-1`, `ap-southeast-2`, `eu-west-1` or `ca-central-1`)
- Go to CloudWatch > Synthetics Canaries
- Search for and select your canary. The canary looks like `commercial_cmp_us`

From here, you can see all the details relating to the canary and the recent runs. To see detailed logs, select Log groups from the sidebar and select your canary. At the current moment, we are experiencing infrequent and inconsistent failures; this does not indicate a serious problem with loading ads, but an inherent problem with testing ads via a headless browser.

## Requirements

* [Node 14](https://nodejs.org/en/download/) ([nvm](https://github.com/nvm-sh/nvm))
* [Yarn](https://classic.yarnpkg.com/en/docs/install/)

## Development

Canaries are located in the src folder. Create a new branch, make your changes to the code, then push your branch. A test canary that looks like `comm_cmp_us_test` will be updated with your code by a Github Action and Riffraff. To check the progress of the update in Riffraff, go to History and search for the project `frontend::commercial-canary-(us|uk|au|ca)`. The canary will be created in a stopped state, so you will need to click Actions -> Start to start a run.

Alternatively, you can locate the test canary in the AWS console, edit the canary, paste your code over the existing code and click Save.

## Deploying

Continuous deployment is set up using a combination of Github Actions and Riffraff. 

### Process

A push to the main branch will trigger the Github Action `deploy.yaml`, which runs the script `create-artifacts.sh` to zip up the lambda functions. These need to be zipped because AWS expects to find a zip file containing a template when creating a canary. Each zip file and CloudFormation template is uploaded to Riffraff. Continuous deployment is set up in Riffraff for each AWS region. Riffraff will then upload the files to S3 and execute the CloudFormation script to update the necessary resources, including the canary code.

### Further information

Diagram [here](https://docs.google.com/presentation/d/1l8QFoq7siUWdJMRq_qc8vLcNf1iFhXH5aKx3Ok5xEu4/edit#slide=id.gb8f2b491c7_0_44) - ask commercial if you need access to it.