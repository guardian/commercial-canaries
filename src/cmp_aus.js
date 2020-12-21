const synthetics = require('Synthetics');
const log = require('SyntheticsLogger');

const pageLoadBlueprint = async function () {

    // INSERT URL here
    const URL = "https://www.theguardian.com/crosswords";

    let page = await synthetics.getPage();

    //clear cookies
    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');

    //You can customize the wait condition here. For instance,
    //using 'networkidle2' may be less restrictive.
    const response = await page.goto(URL, {waitUntil: 'domcontentloaded', timeout: 30000});
    if (!response) {
        throw "Failed to load page!";
    }

    //If the response status code is not a 2xx success code
    if (response.status() < 200 || response.status() > 299) {
        throw "Failed to load page!";
    }

    // wait for CMP
    await page.waitForSelector('[id*="sp_message_container"]');
    log.info('CMP loaded');

    //await synthetics.takeScreenshot('loaded', 'loaded');

    //Ads loaded before interacting with CMP
    await page.waitForSelector('.ad-slot--top-above-nav .ad-slot__content iframe');
    //await page.waitFor(1000);
    //click OK
    const frame = page.frames().find(f => f.url().startsWith('https://ccpa-notice.sp-prod.net'));
    await synthetics.takeScreenshot('CMP', 'Visible');
    await frame.click('button[title="Continue"]');

};

exports.handler = async () => {
    return await pageLoadBlueprint();
};