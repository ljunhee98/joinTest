import puppeteer from 'puppeteer';
const MAX_USER_INDEX = 100;

const [,,targetUrl, userIndex] = process.argv;


function getCurrentTime() {
  const now = new Date();
  const pad = n => n.toString().padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

if (!targetUrl || (userIndex < 0 || userIndex > MAX_USER_INDEX)) {
  console.error('Usage: node joinTestUser.js <targetUrl> <userIndex> (0 = host, 1-100 = guest)');
  process.exit(1);
}

const userMode = (userIndex == 0) ? 'Host' : 'Guest';
const userName = userMode + '-' + userIndex;


console.log(`[${getCurrentTime()}][${process.pid}][${userName}] instance started`);

(async () => {
  const browser = await puppeteer.launch({ headless: (userMode == 'Host' ? false : 'new'), args: ['--window-size=1920,1080'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Automatically accept alert dialogs
  page.on('dialog', async dialog => {
    //console.log(`[${getCurrentTime()}][${process.pid}][${userName}] Alert detected: ${dialog.message()}`);
    await dialog.accept();
  });

  // open the target url
  await page.goto(targetUrl, { waitUntil: 'networkidle0' });

  // Wait for the join button to be present in the DOM
  try {
    const startTime = new Date();

    await page.waitForSelector('#btn-join', { timeout: 60*1000 });

    const endTime = new Date();
    const elapsedTime = (endTime - startTime) / 1000; // Convert to seconds
    console.log(`[${getCurrentTime()}][${process.pid}][${userName}] Join button found after ${elapsedTime.toFixed(2)} seconds`);

  } catch (e) {
    // Check if a div containing the text '회의를 시작 실패' is visible
    const [failDiv] = await page.$x("//div[contains(., '회의를 시작 실패')]");
    if (failDiv) {
        console.log(`[${getCurrentTime()}][${process.pid}][${userName}] '회의를 시작 실패' after failing to find #btn-join`);
    }
    else {
      console.log(`[${getCurrentTime()}][${process.pid}][${userName}] did not find join button within 60 seconds`);
    }
    await page.screenshot({ path: `./screenshots/${userName}-${getCurrentTime()}.png` });

    // Close the browser and exit
    await browser.close();
    console.log(`[${getCurrentTime()}][${process.pid}][${userName}] closing browser`);
    process.exit(0);
  }

  // Calculate and log elapsed time


  // Put userName into the input field with id 'display-name' if userName is defined
  if (typeof userName !== 'undefined' && userName) {
    await page.waitForSelector('#display-name');
    await page.focus('#display-name');
    await page.keyboard.type(userName, { delay: 10 });
    await page.keyboard.press('Tab');
    //sole.log(`[${getCurrentTime()}][${process.pid}][${userName}] set userName in #display-name input`);
  }

  await new Promise(res => setTimeout(res, 100));

  // Click the join button
  await page.click('#btn-join');
  console.log(`[${getCurrentTime()}][${process.pid}][${userName}] click join button`);

  // Wait for the exit button to be present in the DOM
  await page.waitForSelector('#btn-exit');


  // Check for a button with a descendant div labeled '참가자' and click it if found
  const [participantsBtn] = await page.$x("//button[.//div[contains(., '참가자')]]");
  if (participantsBtn) {
    await participantsBtn.click();
    //console.log(`[${getCurrentTime()}][${process.pid}][${userName}] clicked participants button with '참가자' label`);
  }

 

  // Wait for a random time between 10 and 1800 seconds before clicking the exit button
  const waitMs = Math.floor(Math.random() * (1800*1000 - 10*1000 + 1)) + 10*1000;
  const checkInterval = 2000; // Check every 2 seconds
  let waited = 0;
  while (waited < waitMs) {
    // Check for and click the 'Accept' button if it is displayed
    const [acceptBtn] = await page.$x("//button[contains(., '수락')]");
    if (acceptBtn) {
      await acceptBtn.click();
      console.log(`[${getCurrentTime()}][${process.pid}][${userName}] clicked 'Accept' button`);
    }
    const sleep = Math.min(checkInterval, waitMs - waited);
    if (sleep > 0) {
      await new Promise(res => setTimeout(res, sleep));
      waited += sleep;
    } else {
      break;
    }
  }
  // Click the exit button
  await page.click('#btn-exit');
  

  // Wait for the confirmation button and click it (wait up to 3 seconds, do not raise error if not found)
  try {
    await page.waitForSelector('#btn-exit-yes', { timeout: 3000 });
    await page.click('#btn-exit-yes');
    console.log(`[${getCurrentTime()}][${process.pid}][${userName}] clicked exit confirmation button`);

    // Wait for the "Go to Home" button to appear using XPath
    const [goHomeBtn] = await page.$x("//button[contains(., 'Go to Home')]");
    if (goHomeBtn) {
      await goHomeBtn.click();
    } else {
      await new Promise(res => setTimeout(res, 30000));
    }

  } catch (e) {
    console.log(`[${getCurrentTime()}][${process.pid}][${userName}] did not find exit confirmation button within 3 seconds`);
  }

  // Check for a button labeled '회의 종료' and click it if found
  const [endMeetingBtn] = await page.$x("//button[contains(., '회의 종료')]");
  if (endMeetingBtn) {
    await endMeetingBtn.click();
    console.log(`[${getCurrentTime()}][${process.pid}][${userName}] clicked '회의 종료' button`);
  }

  
  // Now close the browser
  await browser.close();
  console.log(`[${getCurrentTime()}][${process.pid}][${userName}] closing browser`);


})(); 