const synthetics = require('Synthetics');
const log = require('SyntheticsLogger');

const checkPage = async function (URL) {
    log.info(`Checking Page URL ${URL}`);

    let page = await synthetics.getPage();

    //clear cookies
    const client = await page.target().createCDPSession();
    await client.send('Network.clearBrowserCookies');

    const response = await page.goto(URL, {waitUntil: 'domcontentloaded', timeout: 30000});
    if (!response) {
        throw "Failed to load page!";
    }

    // wait for CMP
    await page.waitForSelector('[id*="sp_message_container"]');
    log.info('CMP loaded');

    //await synthetics.takeScreenshot('loaded', 'loaded');

    //Ads loaded before interacting with CMP
    // Uncomment when AUS house ads are fixed
    //await page.waitForSelector('.ad-slot--top-above-nav .ad-slot__content iframe');

    //click OK
    const frame = page.frames().find(f => f.url().startsWith('https://ccpa-notice.sp-prod.net'));
    await page.waitFor(2000);
    await frame.click('button[title="Continue"]')
};

const pageLoadBlueprint = async function () {
    // Check Front
    await checkPage("https://www.theguardian.com");

    // Check Article
    // await checkPage("https://www.theguardian.com/food/2020/dec/16/how-to-make-the-perfect-vegetarian-sausage-rolls-recipe-felicity-cloake");
};

exports.handler = async () => {
    return await pageLoadBlueprint();
};