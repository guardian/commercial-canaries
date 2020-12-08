var synthetics = require('Synthetics');
const log = require('SyntheticsLogger');

const pageLoadBlueprint = async function () {
    const URL = "https://www.theguardian.com/uk";

    let page = await synthetics.getPage();

    const response = await page.goto(URL, {waitUntil: 'domcontentloaded', timeout: 30000});
    if (!response) {
        throw "Failed to load page!";
    }

    if (response.status() < 200 || response.status() > 299) {
        throw "Failed to load page!";
    }

    // wait for CMP
    await page.waitForSelector('[id*="sp_message_container"]');
    log.info('CMP loaded');

    // click on Yes I'm happy
    const frame = page.frames().find(f => f.url().startsWith('https://sourcepoint.theguardian.com'));
    await page.waitFor(500);
    await frame.click('button[title="Yes, I’m happy"]')

    // Ads are loaded
    await page.waitForSelector('.ad-slot--top-above-nav .ad-slot__label');
    await page.waitForSelector('.ad-slot--top-above-nav .ad-slot__content iframe');
};

exports.handler = async () => {
    return await pageLoadBlueprint();
};