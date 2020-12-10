const synthetics = require('Synthetics');
const log = require('SyntheticsLogger');

const pageLoadBlueprint = async function () {
    const URL = "https://www.theguardian.com/au";

    let page = await synthetics.getPage();

    //clear cookies
    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');

    const response = await page.goto(URL, {waitUntil: 'domcontentloaded', timeout: 30000});
    if (!response) {
        throw "Failed to load page!";
    }

    //If the response status code is not a 2xx success code
    if (response.status() < 200 || response.status() > 299) {
        throw "Failed to load page!";
    }

    // Ads loaded before interacting with CMP
    await page.waitForSelector('.ad-slot--top-above-nav .ad-slot__label');
    await page.waitForSelector('.ad-slot--top-above-nav .ad-slot__content iframe');

    // wait for CMP
    await page.waitForSelector('[id*="sp_message_container"]');
    log.info('CMP loaded');

    // click OK
    const frame = page.frames().find(f => f.url().startsWith('https://ccpa-notice.sp-prod.net'));
    await frame.click('button[title="Continue"]');
};

exports.handler = async () => {
    return await pageLoadBlueprint();
};