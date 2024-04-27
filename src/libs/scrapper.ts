import chromium from '@sparticuz/chromium-min';
import puppeteer from 'puppeteer';
import { reduceTokensFromHtml } from './string';

export const scrapMainContent = async (url: string) => {
  const isLocal = !process.env.AWS_EXECUTION_ENV;

  const browser = await puppeteer.launch(
    isLocal
      ? undefined
      : {
          args: chromium.args,
          executablePath: await chromium.executablePath(
            'https://github.com/Sparticuz/chromium/releases/download/v119.0.2/chromium-v119.0.2-pack.tar'
          ),
        }
  );

  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle0' });
  } catch (e) {
    await browser.close();
    return null;
  }

  const result = await page.evaluate(() => {
    const selectorsToRemove = ['script', 'nav', 'header', 'footer', 'img'];
    selectorsToRemove.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => element.remove());
    });

    return document.body.innerHTML;
  });

  await browser.close();

  return reduceTokensFromHtml(result);
};
