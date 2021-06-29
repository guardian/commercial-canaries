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

    //If the response status code is not a 2xx success code
    if (response.status() < 200 || response.status() > 299) {
        throw "Failed to load page!";
    }

    //Ads loaded before interacting with CMP
    await page.waitForSelector('.ad-slot--top-above-nav .ad-slot__content iframe');

    // wait for CMP
    await page.waitForSelector('[id*="sp_message_container"]');
    log.info('CMP loaded');

    //click Do not sell my information
    const frame = page.frames().find(f => f.url().startsWith('https://ccpa-notice.sp-prod.net'));
    await frame.click('button[title="Do not sell my personal information"]');

    // Reload page
    const reloadResponse = await page.reload({
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    if (!reloadResponse) {
      throw "Failed to refresh page!";
    }

    // Check top-above-nav on page after clicking do not sell and then reloading
    await page.waitForSelector(
      ".ad-slot--top-above-nav .ad-slot__content iframe"
    );

    log.info("Ads on page after do-not-sell and reload");
};

const pageLoadBlueprint = async function () {
    // Check Front
    await checkPage("https://www.theguardian.com/us");

    // Check Article
    await checkPage("https://www.theguardian.com/food/2020/dec/16/how-to-make-the-perfect-vegetarian-sausage-rolls-recipe-felicity-cloake");
};

exports.handler = async () => {
    return await pageLoadBlueprint();
};