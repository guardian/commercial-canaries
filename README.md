# Commercial Canaries

The commercial canaries are a set of [AWS Synthetics Canaries](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries.html) that monitor advert and CMP behaviour on fronts and article pages. A canary is a series of lambda functions that use Puppeteer to load the site within a headless browser and check that the page is working as expected with regard to ads and the CMP.

## Configuration

Canaries are hosted in the following regions: Ireland, Canada, the US and Australia. A canary will initiate a run every one minute. The canary is called `comm_cmp_canary_prod`.

| Region             | AWS Region     | Banner button text                  |
| ------------------ | -------------- | ----------------------------------- |
| Ireland            | eu-west-1      | Yes, I’m happy                      |
| Canada             | ca-central-1   | Yes, I’m happy                      |
| US (N. California) | us-west-1      | Do not sell my personal information |
| Australia (Sydney) | ap-southeast-2 | Continue                            |

The Ireland and Canada canaries use the same source file as they both operate under [TCFV2](https://iabeurope.eu/tcf-2-0/). However, we monitor these regions separately as there are different possible failure modes since ads are controlled by a third party.

The US and Australia canaries have very similar source files, since the relationship between the ads and the CMP is the same for both regions. The difference is that each region has different cookie banners, with different button text.

### Ad loading rules

-   In Ireland and Canada we must not load ads before the CMP is interacted with and consent is given.
-   In the US and Australia we can load ads on page load, provided the user has not previously withdrawn their consent.

Within the canary code we test the following:

| Region    | On page load | Accept cookies | Clear cookies & refresh |
| --------- | :----------: | :------------: | :---------------------: |
| Ireland   |    No ads    |      Ads       |         No ads          |
| Canada    |    No ads    |      Ads       |         No ads          |
| US        |     Ads      |      Ads       |           Ads           |
| Australia |     Ads      |      Ads       |           Ads           |

## Monitoring and notifications

You can find the status of each canary by logging into the frontend AWS console and navigating to CloudWatch > Synthetics Canaries. You'll need to switch regions at the top of the screen to see each one. A [combined dashboard](https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#dashboards:name=Commercial-Canaries) of the status checks is also available.

### Email notifications

If ads are not loading in a region, the team is informed via email by a CloudWatch Alarm which is sent to commercial.dev@guardian.co.uk. Five consecutive failures are required to send an alarm. Another email is sent on the first pass following an alarm.

-   On **failure** the email subject is: `ALARM: "Commercial canary" in Asia Pacific (Sydney)`
-   On **recovery** the email subject is: `OK: "Commercial canary" in Asia Pacific (Sydney)`

When you are logged into the AWS account for frontend via [Janus](https://janus.gutools.co.uk/) you can see more detailed status information or the raw output from the Lambda run that failed.

## Debugging

Login to AWS frontend via Janus. To find the canary in AWS:

-   Ensure you are in the correct AWS region (`us-west-1`, `ap-southeast-2`, `eu-west-1` or `ca-central-1`)
-   Go to CloudWatch > Synthetics Canaries
-   Search for and select your canary. The canary is named `comm_cmp_canary_prod`

From here, you can see all the details relating to the canary and the recent runs. To see detailed logs, select Log groups from the sidebar and select your canary. At the current moment, we are experiencing infrequent and inconsistent failures; this does not indicate a serious problem with loading ads, but an inherent problem with testing ads via a headless browser.

## Requirements

-   [Yarn](https://classic.yarnpkg.com/en/docs/install/)

## Development

Canaries are located in the src folder. To test changes, open a Pull Request and `actions-riff-raff` will add a comment to it with a link to deploy your branch to `CODE` which will update the test canary `comm_cmp_canary_code`. You can check on the progress of the Github Action (here)[https://github.com/guardian/commercial-canaries/actions/workflows/deploy.yaml]. If a run does not start automatically, then you can start in manually, as the workflow has a workflow_dispatch event trigger.

To check the progress of the update in Riffraff, go to the History tab and search for the project `frontend::commercial-canaries`.

### Manual

Alternatively, if automatic deployment is not working or you want faster feedback, you can locate the test canary in the AWS console, click "Edit", then paste your code over the existing code and click "Save".

## Deploying

Continuous deployment is set up using a combination of Github Actions and Riffraff.

### Process

A push to the main branch will trigger the Github Action `deploy.yaml`, which runs the script `create-artifacts.sh` to zip up the lambda functions. These need to be zipped because AWS expects to find a zip file containing a template when creating a canary. It will also run cdk commands which will run tests and generate the CloudFormation templates. Each zip file and CloudFormation template is uploaded to Riffraff using (actions-riff-raff)[https://github.com/guardian/actions-riff-raff]. Continuous deployment is set up in Riffraff for each AWS region. Riffraff will then upload the files to S3 and execute the CloudFormation script to update the necessary resources, including the canary code.

### Further information

Diagram [here](https://docs.google.com/presentation/d/1l8QFoq7siUWdJMRq_qc8vLcNf1iFhXH5aKx3Ok5xEu4/edit#slide=id.gb8f2b491c7_0_44)
