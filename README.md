# aws-canaries

The Canary monitoring is a series of lambda scripts that run a headless browser and load the site, and check it behaves as expected.
These checks run every minute in 4 different regions, Canada, Australia, the US, and Ireland.

They're hosted on the frontend AWS account.

The code for the canaries is here:
<https://github.com/guardian/aws-canaries>

Alert notifications are sent to commercial.canaries@guardian.co.uk, and another notification on recovery.

- On **failure** the email subjects look like this: `ALARM: "US CMP failed" in US West (N. California)`
- On **recovery** the email subject looks like this: `OK: "US CMP failed" in US West (N. California)`

When you are logged into the AWS account for frontend via [Janus](https://janus.gutools.co.uk/) you can see more detailed status information or the raw output from the Lambda run that failed.
A [combined dashboard of the status checks](https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#dashboards:name=Commercial-Canaries;start=PT3H) is also available.

You can also find it the status by logging into the frontend AWS console, and navigating to CloudWatch > Application Monitoring > Synthetics Canaries, although this is region-by-region and you'll switch regions at the top of the screen to see each one.


### Requirements

1. [Node 14](https://nodejs.org/en/download/) ([nvm](https://github.com/nvm-sh/nvm))
2. [Yarn](https://classic.yarnpkg.com/en/docs/install/)

### What we check

**US (CCPA)**

1. Load a front
2. Check ads _do_ load before banner is interacted with
3. Check the banner shows
4. Click the button in the banner
5. Check the banner goes away
6. refresh the page (without clearing cookies)
7. Check ads have loaded
8. Load an article page
9. check ads have loaded
10. clear cookies. reload the page
11. Check ads load before banner is interacted with
12. check the banner shows

**Canada**

Same as Ireland

**Aus**

Same as US, except we use the "Continue" banner button rather "Do not sell my information"

**TCFv2 (Ireland and Canada)**

1. Load a front
2. Check that _no_ ads load before banner is interacted with
3. Check the banner shows
4. Click on "yes I'm happy" in the banner
5. Check the banner goes away
6. Check that ads load.
7. refresh the page (without clearing cookies)
8. Check ads have loaded, and no banner is shown.
9. Load an article page
10. check ads have loaded, and no banner is shown.
11. Clear cookies. reload the page
12. Check that _no_ ads load before banner is interacted with
13. Check the banner shows

### Manual Update

There are currently 4 canary tests running that check the CMP is loaded successfully and ads are loaded at the right time in US, Canada, AUS and UK respectively.

Note that US and Canada canaries currently use the same source file but are deployed as two separate canaries in two different regions. Even though Canada also operates under TCFV2 we use another canary to monitor this region separately as it has different possible failure modes, as ads are controlled by a third party.

| File            | AWS Region     | Canary configuration name |
| --------------- | -------------- | ------------------------- |
| `src/cmp_tcfv2` | eu-west-1      | commercial_cmp_tcfv2      |
| `src/cmp_ccpa`  | us-west-1      | commercial_cmp_us         |
| `src/cmp_tcfv2` | ca-central-1   | commercial_cmp_ca         |
| `src/cmp_aus`   | ap-southeast-2 | commercial_cmp_aus        |

Login to AWS frontend via Janus, and replace the code via the built in Script Editor

### Automatic Update

This is a work in progress

Current situation:

Team city picks up `riffraff.yaml`, zips canaries with `./bash.sh`
Riffraff uploads artifacts to S3 and creates cloudformation stack from template.yaml e.g `cmp_tcfv2.yaml`.
Cloudformation reads the zip form S3 as specified in the yaml file and the canary gets created.

Current issue: the canary can't read it's source code from S3, but can output logs in S3.

Diagram [here](https://docs.google.com/presentation/d/1l8QFoq7siUWdJMRq_qc8vLcNf1iFhXH5aKx3Ok5xEu4/edit#slide=id.gb8f2b491c7_0_44) - ask commercial if you need access to it
