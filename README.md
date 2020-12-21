# aws-canaries


> Guardian AWS Synthetics Canaries

### Requirements

1. [Node 14](https://nodejs.org/en/download/) ([nvm](https://github.com/nvm-sh/nvm))
2. [Yarn](https://classic.yarnpkg.com/en/docs/install/)

### Manual Update

There are currently 3 canary tests running that check the CMP is loaded successfully and ads are 
loaded at the right time in US, AUS and UK respectively.

Code | AWS Region | Canary configuration name | 
| :---:   | :---:   | :-: | :-: |
| `src/cmp_tcfv2` | eu-west-1 | commercial_cmp_tcfv2 | 
| `src/cmp_ccpa`  | us-west-1 | commercial_cmp_us | 
| `src/cmp_aus` | ap-southeast-2 | commercial_cmp_aus | 

Login to AWS frontend via Janus, and replace the code via the build in Script Editor

### Automatic Update

This is a work in progress
