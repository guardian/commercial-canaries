var synthetics = require('Synthetics');
const log = require('SyntheticsLogger');

const pageLoadBlueprint = async function () {
    // INSERT URL here
    const URL = "https://www.theguardian.com/uk";

    let page = await synthetics.getPage();

    // clear cookies
    // const client = await page.target().createCDPSession();
    // await client.send('Network.clearBrowserCookies');

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

    //click on Yes I'm happy
    const frame = page.frames().find(f => f.url().startsWith('https://sourcepoint.theguardian.com'));
    await page.waitFor(500);
    await frame.click('button[title="Yes, I’m happy"]')

    //ads are loaded
    await page.waitForSelector('.ad-slot--top-above-nav .ad-slot__label');
    await page.waitForSelector('.ad-slot--top-above-nav .ad-slot__content iframe');
};

exports.handler = async () => {
    return await pageLoadBlueprint();
};