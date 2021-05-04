# aws-canaries


> Guardian AWS Synthetics Canaries

### Requirements

1. [Node 14](https://nodejs.org/en/download/) ([nvm](https://github.com/nvm-sh/nvm))
2. [Yarn](https://classic.yarnpkg.com/en/docs/install/)

### Manual Update

There are currently 3 canary tests running that check the CMP is loaded successfully and ads are 
loaded at the right time in US, AUS and UK respectively.

File | AWS Region |  Canary configuration name | 
--- | --- | --- | 
`src/cmp_tcfv2`  | eu-west-1  | commercial_cmp_tcfv2 | 
`src/cmp_ccpa`  | us-west-1  | commercial_cmp_us |  
`src/cmp_aus`  | ap-southeast-2  | commercial_cmp_aus |   

Login to AWS frontend via Janus, and replace the code via the build in Script Editor

### Automatic Update

This is a work in progress

Current situation:

Team city picks up `riffraff.yaml`, zips canaries with `./bash.sh`
Riffraff uploads artifacts to S3 and creates cloudformation stack from template.yaml e.g `cmp_tcfv2.yaml`.
Cloudformation reads the zip form S3 as specified in the yaml file and the canary gets created.

Current issue: the canary can't read it's source code from S3, but can output logs in S3.

Diagram [here](https://docs.google.com/presentation/d/1l8QFoq7siUWdJMRq_qc8vLcNf1iFhXH5aKx3Ok5xEu4/edit#slide=id.gb8f2b491c7_0_44) - ask commercial if you need access to it
