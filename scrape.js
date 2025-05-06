const { Builder, By, Key, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');
const path = require('path');

// File to store cookies
const cookiesFile = path.join(__dirname, 'cookies.json');

(async function example() {
  // Set up Chrome options for faster loading
  const options = new chrome.Options();
  options.addArguments('--start-maximized');
  options.addArguments('--disable-extensions'); // Disable extensions for faster loading
  options.addArguments('--disable-infobars');  // Disable infobars for faster loading
  options.addArguments('--disable-dev-shm-usage'); // Overcome limited resource issues
  options.addArguments('--no-sandbox'); // Bypass OS security model for faster startup
  
  // Create user data directory to maintain profile
  const userDataDir = path.join(__dirname, 'chrome-profile');
  options.addArguments(`user-data-dir=${userDataDir}`);

  let driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  try {
    // Check if cookies exist
    let hasCookies = false;
    if (fs.existsSync(cookiesFile)) {
      try {
        const cookies = JSON.parse(fs.readFileSync(cookiesFile, 'utf8'));
        if (cookies && cookies.length > 0) {
          hasCookies = true;
        }
      } catch (e) {
        console.log('Error reading cookies file:', e.message);
      }
    }

    // If we have cookies, try going directly to the profile page
    if (hasCookies) {
      console.log('Found saved session, trying to use it...');
      
      // Go directly to the profile page instead of navigating through the steps
      console.log('Navigating directly to profile page...');
      await driver.get('https://csprd.ctclink.us/psp/csprd/EMPLOYEE/SA/s/WEBLIB_HCX_PF.H_BIO_INFO.FieldFormula.IScript_Main');
      
      // Use a shorter wait time and then check if we're on the right page
      await driver.sleep(3000);
      
      // Check current URL to see where we ended up
      const currentUrl = await driver.getCurrentUrl();
      console.log('Current URL after navigation:', currentUrl);
      
      // Handle different scenarios based on where we landed
      if (currentUrl.includes('login') || currentUrl.includes('signin')) {
        console.log('Session expired, need to log in again');
        hasCookies = false;
        
        // Navigate to login page
        await driver.get('https://gateway.ctclink.us');
        console.log('Please log in manually...');
        console.log('Waiting for login to complete...');
        
        // Wait for login to complete
        await driver.wait(until.urlContains('ptprd.ctclink.us'), 120000);
        
        // Save cookies after successful login
        const cookies = await driver.manage().getCookies();
        fs.writeFileSync(cookiesFile, JSON.stringify(cookies));
        console.log('Saved session cookies for future use');
        
        // Check if we're on the homepage
        const homepageUrl = await driver.getCurrentUrl();
        if (homepageUrl.includes('tab=CTC_OC_HP')) {
          console.log('Landed on the homepage, clicking on Student Center...');
          
          try {
            // Try to find and click the Student Center link
            await driver.wait(until.elementLocated(By.linkText('Student Center')), 10000);
            await driver.findElement(By.linkText('Student Center')).click();
            await driver.sleep(3000);
          } catch (e) {
            console.log('Could not find Student Center link, trying alternative navigation');
            // Try an alternative approach - direct navigation
            await driver.get('https://ptprd.ctclink.us/psp/ptprd_newwin/EMPLOYEE/EMPL/s/WEBLIB_CTC_EO.EPQ_FIELD1.FieldFormula.IScript_Homepage_Nav?HP_NODENAME=SA&PORTALPARAM_PTCNAV=CTC_STDNT_HOMEPAGE_RD_FL&EOPP.SCNode=EMPL&EOPP.SCPortal=EMPLOYEE&EOPP.SCName=CTC_TAC_SS_NC&EOPP.SCLabel=CTC_TAC_SS_NC&EOPP.SCPTcname=&FolderPath=PORTAL_ROOT_OBJECT.PORTAL_BASE_DATA.CO_NAVIGATION_COLLECTIONS.CTC_TAC_SS_NC.CTC_S201907100824564480684471&IsFolder=false');
            await driver.sleep(3000);
          }
        }
        
        // Now go directly to the profile page
        console.log('Navigating to profile page...');
        await driver.get('https://csprd.ctclink.us/psp/csprd/EMPLOYEE/SA/s/WEBLIB_HCX_PF.H_BIO_INFO.FieldFormula.IScript_Main');
      } else if (currentUrl.includes('tab=CTC_OC_HP')) {
        // We're on the homepage
        console.log('Landed on the homepage, navigating to Student Center...');
        
        try {
          // Try to find and click the Student Center link
          await driver.wait(until.elementLocated(By.linkText('Student Center')), 10000);
          await driver.findElement(By.linkText('Student Center')).click();
          await driver.sleep(3000);
        } catch (e) {
          console.log('Could not find Student Center link, trying alternative navigation');
          // Try an alternative approach - direct navigation
          await driver.get('https://ptprd.ctclink.us/psp/ptprd_newwin/EMPLOYEE/EMPL/s/WEBLIB_CTC_EO.EPQ_FIELD1.FieldFormula.IScript_Homepage_Nav?HP_NODENAME=SA&PORTALPARAM_PTCNAV=CTC_STDNT_HOMEPAGE_RD_FL&EOPP.SCNode=EMPL&EOPP.SCPortal=EMPLOYEE&EOPP.SCName=CTC_TAC_SS_NC&EOPP.SCLabel=CTC_TAC_SS_NC&EOPP.SCPTcname=&FolderPath=PORTAL_ROOT_OBJECT.PORTAL_BASE_DATA.CO_NAVIGATION_COLLECTIONS.CTC_TAC_SS_NC.CTC_S201907100824564480684471&IsFolder=false');
          await driver.sleep(3000);
        }
        
        // Now navigate to the profile page
        console.log('Navigating to profile page...');
        await driver.get('https://csprd.ctclink.us/psp/csprd/EMPLOYEE/SA/s/WEBLIB_HCX_PF.H_BIO_INFO.FieldFormula.IScript_Main');
      }
      // If we're not on the homepage or login, we should be on the right page or close to it
    } else {
      // Navigate to the login page
      console.log('No saved session, navigating to login page...');
      await driver.get('https://gateway.ctclink.us');
      
      console.log('Please log in manually...');
      console.log('Waiting for login to complete...');
      
      // Wait for login to complete
      await driver.wait(until.urlContains('ptprd.ctclink.us'), 120000);
      
      // Save cookies after successful login
      const cookies = await driver.manage().getCookies();
      fs.writeFileSync(cookiesFile, JSON.stringify(cookies));
      console.log('Saved session cookies for future use');
      
      // Now go directly to the profile page
      console.log('Navigating to profile page...');
      await driver.get('https://csprd.ctclink.us/psp/csprd/EMPLOYEE/SA/s/WEBLIB_HCX_PF.H_BIO_INFO.FieldFormula.IScript_Main');
    }
    
    // Wait for page to load using a dynamic wait instead of fixed sleep
    try {
      // Wait for the content to be ready - look for either an iframe or a specific element
      await driver.wait(until.elementLocated(By.css('iframe, p.cx-MuiTypography-root')), 10000);
    } catch (e) {
      console.log('Timed out waiting for page content, but continuing anyway');
    }
    
    // Check for iframes
    let foundName = null;
    let foundBirthDate = null;
    
    const iframes = await driver.findElements(By.css('iframe'));
    if (iframes.length > 0) {
      console.log(`Found ${iframes.length} iframes on the page`);
      
      // Try to switch to each iframe and look for the element
      for (let i = 0; i < iframes.length; i++) {
        try {
          console.log(`Switching to iframe ${i}`);
          await driver.switchTo().frame(i);
          
          try {
            // Try using more specific selectors
            const nameElements = await driver.findElements(By.css('p.cx-MuiTypography-root'));
            
            if (nameElements.length > 0) {
              // Process elements in parallel for speed
              const promises = nameElements.map(async (el, j) => {
                const text = await el.getText();
                
                if (text && text.includes('Varona')) {
                  // Found the name
                  foundName = text.replace(/^Mr\s+/i, '').trim();
                  console.log('Found name in iframe:', foundName);
                }
                
                // Check if this might be a birth date
                if (text && text.match(/\d+\/\d+\/\d+/)) {
                  foundBirthDate = text.trim();
                  console.log('Found birth date in iframe:', foundBirthDate);
                }
              });
              
              // Wait for all checks to complete
              await Promise.all(promises);
              
              // If we found both name and birth date, we can exit early
              if (foundName && foundBirthDate) {
                console.log('Found all required information, breaking out of search');
                break;
              }
            }
            
            // If we still don't have the birth date, look more specifically
            if (!foundBirthDate) {
              const birthContainers = await driver.findElements(By.css('div.d-flex.align-items-center.justify-content-between'));
              
              for (let j = 0; j < birthContainers.length; j++) {
                const containerText = await birthContainers[j].getText();
                
                if (containerText.includes('Date of Birth')) {
                  console.log('Found birth date container');
                  
                  // Try to extract just the date
                  try {
                    const dateElement = await birthContainers[j].findElement(By.css('p.cx-MuiTypography-root.mr-2'));
                    foundBirthDate = await dateElement.getText();
                    console.log('Found birth date in iframe:', foundBirthDate);
                    break;
                  } catch (e) {
                    console.log('Could not find specific date element in container');
                  }
                }
              }
            }
          } catch (innerError) {
            console.log(`Error searching in iframe ${i}:`, innerError.message);
          }
          
          // Switch back to the main content
          await driver.switchTo().defaultContent();
          
          // If we found both name and birth date, we can exit early
          if (foundName && foundBirthDate) {
            break;
          }
        } catch (frameError) {
          console.log(`Error switching to iframe ${i}:`, frameError.message);
          try {
            await driver.switchTo().defaultContent();
          } catch (e) {
            console.log('Error switching back to default content');
          }
        }
      }
    }
    
    console.log('Final name:', foundName);
    console.log('Final birth date:', foundBirthDate);

    // Create a simpler HTML display that's less likely to have errors
    try {
      await driver.executeScript(`
        // Create elements using simpler approach
        var div = document.createElement('div');
        div.style.position = 'fixed';
        div.style.top = '0';
        div.style.left = '0';
        div.style.width = '100%';
        div.style.height = '100%';
        div.style.backgroundColor = 'rgba(0,0,0,0.7)';
        div.style.zIndex = '10000';
        
        // Create content div
        var content = document.createElement('div');
        content.style.position = 'absolute';
        content.style.top = '50%';
        content.style.left = '50%';
        content.style.transform = 'translate(-50%, -50%)';
        content.style.backgroundColor = 'white';
        content.style.padding = '20px';
        content.style.borderRadius = '10px';
        content.style.textAlign = 'left';
        
        // Add heading
        var heading = document.createElement('h2');
        heading.textContent = 'Extracted Information';
        content.appendChild(heading);
        
        // Add name
        var namePara = document.createElement('p');
        var nameStrong = document.createElement('strong');
        nameStrong.textContent = 'Name: ';
        namePara.appendChild(nameStrong);
        namePara.appendChild(document.createTextNode('${foundName || "Not found"}'));
        content.appendChild(namePara);
        
        // Add DOB
        var dobPara = document.createElement('p');
        var dobStrong = document.createElement('strong');
        dobStrong.textContent = 'DOB: ';
        dobPara.appendChild(dobStrong);
        dobPara.appendChild(document.createTextNode('${foundBirthDate || "Not found"}'));
        content.appendChild(dobPara);
        
        // Add click to dismiss
        var instruction = document.createElement('p');
        instruction.textContent = 'Click anywhere to dismiss';
        instruction.style.marginTop = '20px';
        instruction.style.fontSize = '12px';
        instruction.style.textAlign = 'center';
        content.appendChild(instruction);
        
        div.appendChild(content);
        document.body.appendChild(div);
        
        // Add click listener
        div.addEventListener('click', function() {
          document.body.removeChild(div);
        });
      `);
      
      console.log('Displayed information overlay');
      
      // Only wait 5 seconds before closing
      await driver.sleep(5000);
    } catch (displayError) {
      console.log('Error displaying overlay:', displayError.message);
      
      // Write to console output instead as a last resort
      console.log('\n=== EXTRACTED INFORMATION ===');
      console.log(`Name: ${foundName || 'Not found'}`);
      console.log(`DOB: ${foundBirthDate || 'Not found'}`);
      console.log('============================\n');
      
      await driver.sleep(3000);
    }
  } finally {
    await driver.quit();
  }
})();
