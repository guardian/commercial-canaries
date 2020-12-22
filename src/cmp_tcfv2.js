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

    // wait for CMP
    await page.waitForSelector('[id*="sp_message_container"]');
    log.info('CMP loaded');

    //click on Yes I'm happy

    const frame = page.frames().find(f => f.url().startsWith('https://sourcepoint.theguardian.com'));
    await page.waitFor(500);
    await frame.click('button[title="Yes, I’m happy"]')


    //ads are loaded
    await page.waitForSelector('.ad-slot--top-above-nav .ad-slot__content iframe');
}

const pageLoadBlueprint = async function () {
    // Check Front
    await checkPage("https://www.theguardian.com");
};

exports.handler = async () => {
    return await pageLoadBlueprint();
};
