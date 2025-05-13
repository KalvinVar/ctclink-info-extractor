// Initialize default settings
chrome.runtime.onInstalled.addListener(function() {
  chrome.storage.local.set({
    autoExtract: true
  });
});

// Listen for navigation to ctcLink pages
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  // Safely check if we have a tab with a valid URL
  if (tab && changeInfo.status === 'complete') {
    try {
      // Only proceed if URL exists and is a string
      if (tab.url && typeof tab.url === 'string') {
        // Now safely check the URL
        if (tab.url.indexOf('ctclink.us') > -1) {
          // Check if this is the profile page or degree progress page
          if (tab.url.indexOf('H_BIO_INFO') > -1) {
            // Notify that we're on the profile page
            chrome.action.setBadgeText({text: 'BIO', tabId: tabId});
            chrome.action.setBadgeBackgroundColor({color: '#4CAF50', tabId: tabId});
          } else if (tab.url.indexOf('H_DEGREE_PROGRESS') > -1) {
            // Notify that we're on the degree progress page
            chrome.action.setBadgeText({text: 'DEG', tabId: tabId});
            chrome.action.setBadgeBackgroundColor({color: '#2196F3', tabId: tabId});
          } else {
            // Clear badge when not on a supported page
            chrome.action.setBadgeText({text: '', tabId: tabId});
          }
        }
      }
    } catch (e) {
      console.error('Error in tab URL processing:', e);
    }
  }
});

// Listen for the extractAll message from popup
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === "extractAll") {
    // Start the extraction process
    extractAllInformation();
    sendResponse({started: true});
    return true; // Keep the message channel open for async response
  }
});

// Update the testFetchBio message handler
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === "testFetchBio") {
    console.log("Background script received test fetch request");
    
    fetch("https://csprd.ctclink.us/psc/csprd/EMPLOYEE/SA/s/WEBLIB_HCX_PF.H_BIO_INFO.FieldFormula.IScript_Main", {
      method: "GET",
      credentials: "include",
      headers: {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "sec-fetch-dest": "iframe",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin"
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.text();
    })
    .then(html => {
      // Parse the HTML to extract the window.highpoint object
      const scriptStartMarker = 'window.highpoint = ';
      const scriptStart = html.indexOf(scriptStartMarker);
      
      if (scriptStart === -1) {
        throw new Error("Could not find highpoint data in response");
      }
      
      // Find the object start and end
      const dataStart = scriptStart + scriptStartMarker.length;
      let braceCount = 0;
      let dataEnd = dataStart;
      
      // Find where the JSON object ends
      let foundFirstBrace = false;
      for (let i = dataStart; i < html.length; i++) {
        if (html[i] === '{') {
          if (!foundFirstBrace) foundFirstBrace = true;
          braceCount++;
        } else if (html[i] === '}') {
          braceCount--;
          if (foundFirstBrace && braceCount === 0) {
            dataEnd = i + 1;
            break;
          }
        }
      }
      
      if (!foundFirstBrace || braceCount !== 0) {
        throw new Error("Malformed JSON data in response");
      }
      
      // Extract the JSON data and parse it
      const jsonData = html.substring(dataStart, dataEnd);
      const highpointData = JSON.parse(jsonData);
      
      // Format the name and DOB
      const formattedName = formatNameFromData(highpointData);
      const dob = extractDOBFromData(highpointData);
      
      console.log("Formatted data:", { formattedName, dob });
      
      // Format the data for response
      const formattedData = {
        rawData: highpointData,
        formattedName: formattedName,
        dob: dob,
        rawDOB: highpointData.BIO_INFO?.BIRTHDATE || null, // Add raw date for debugging
        convertedDOB: highpointData.BIO_INFO?.BIRTHDATE ? convertISOtoUS(highpointData.BIO_INFO.BIRTHDATE) : null
      };
      
      sendResponse({success: true, data: formattedData});
    })
    .catch(error => {
      console.error("Error in background fetch:", error);
      sendResponse({success: false, error: error.message});
    });
    
    return true; // Keep the message channel open for async response
  }
});

// Add a new function to fetch degree data directly

function fetchDegreeData() {
  return new Promise((resolve, reject) => {
    // Fetch degree progress data directly from the API endpoint
    fetch("https://csprd.ctclink.us/psc/csprd/EMPLOYEE/SA/s/WEBLIB_HCX_RE.H_DEGREE_PROGRESS.FieldFormula.IScript_DegreeProgress?acad_career=UGRD&institution=WA030", {
      method: "GET",
      credentials: "include",
      headers: {
        "accept": "application/json",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin"
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log("Degree data:", data);
      
      const result = {
        degreeName: null,
        creditProgress: null
      };
      
      // Extract degree name from the first group
      if (data.groups && data.groups.length > 0) {
        const degreeGroup = data.groups[0];
        if (degreeGroup.label) {
          result.degreeName = degreeGroup.label;
        }
        
        // Extract credit progress from the requirements_descr or from units data
        if (degreeGroup.units_required && degreeGroup.units_taken) {
          const required = degreeGroup.units_required;
          const taken = degreeGroup.units_taken;
          result.creditProgress = `${taken}/${required}`;
        }
      }
      
      // If we couldn't find it in groups, look at the graph data
      if (!result.creditProgress && data.graph_data && data.graph_data.length > 0) {
        const completeData = data.graph_data.find(item => item.descr.includes("Complete"));
        if (completeData && completeData.percent) {
          result.creditProgress = `${completeData.percent}%`;
        }
      }
      
      console.log("Extracted degree data:", result);
      resolve(result);
    })
    .catch(error => {
      console.error("Error fetching degree data:", error);
      reject(error);
    });
  });
}

// Add message handler for testing the direct degree fetch
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === "testFetchDegree") {
    console.log("Background script received test degree fetch request");
    
    // Directly fetch degree info
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.scripting.executeScript({
        target: {tabId: tabs[0].id},
        function: fetchDegreeData
      }, (results) => {
        if (results && results[0] && results[0].result) {
          sendResponse({
            success: true, 
            data: {
              extractedInfo: results[0].result
            }
          });
        } else {
          sendResponse({
            success: false, 
            error: results && results[0] && results[0].error 
              ? results[0].error 
              : "Unknown error"
          });
        }
      });
    });
    
    return true; // Keep the message channel open for async response
  }
});

// Helper functions
function formatNameFromData(data) {
  if (!data || !data.NAMES) return null;
  
  // Try preferred name first
  const preferredName = data.NAMES.find(name => name.NAME_TYPE === "PRF");
  if (preferredName && preferredName.NAME_PARTS) {
    const prefix = preferredName.NAME_PARTS.find(part => part.name_part === "NAME_PREFIX")?.name_part_value || '';
    const firstName = preferredName.NAME_PARTS.find(part => part.name_part === "FIRST_NAME")?.name_part_value || '';
    const middleName = preferredName.NAME_PARTS.find(part => part.name_part === "MIDDLE_NAME")?.name_part_value || '';
    const lastName = preferredName.NAME_PARTS.find(part => part.name_part === "LAST_NAME")?.name_part_value || '';
    
    const name = [prefix, firstName, middleName, lastName].filter(Boolean).join(' ').trim();
    if (name) return name;
  }
  
  // Fall back to primary name
  const primaryName = data.NAMES.find(name => name.NAME_TYPE === "PRI");
  if (primaryName && primaryName.NAME_PARTS) {
    const prefix = primaryName.NAME_PARTS.find(part => part.name_part === "NAME_PREFIX")?.name_part_value || '';
    const firstName = primaryName.NAME_PARTS.find(part => part.name_part === "FIRST_NAME")?.name_part_value || '';
    const middleName = primaryName.NAME_PARTS.find(part => part.name_part === "MIDDLE_NAME")?.name_part_value || '';
    const lastName = primaryName.NAME_PARTS.find(part => part.name_part === "LAST_NAME")?.name_part_value || '';
    
    return [prefix, firstName, middleName, lastName].filter(Boolean).join(' ').trim();
  }
  
  return null;
}

// Update the extractDOBFromData function

function extractDOBFromData(data) {
  // Check for PERSONAL_DATA.BIRTHDATE 
  if (data.PERSONAL_DATA && data.PERSONAL_DATA.BIRTHDATE) {
    return data.PERSONAL_DATA.BIRTHDATE;
  }
  
  // Check for BIO_INFO.BIRTHDATE (new format found in the data)
  if (data.BIO_INFO && data.BIO_INFO.BIRTHDATE) {
    // Convert from YYYY-MM-DD to MM/DD/YYYY format
    const match = data.BIO_INFO.BIRTHDATE.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[2]}/${match[3]}/${match[1]}`; // MM/DD/YYYY
    }
    return data.BIO_INFO.BIRTHDATE;
  }
  
  // Check for any other DOB field in BIO_INFO
  if (data.BIO_INFO && data.BIO_INFO.DOB) {
    return data.BIO_INFO.DOB;
  }

  // Look for date strings that match common date formats
  const usDatePattern = /(\d{1,2})\/(\d{1,2})\/(\d{4})/;
  const isoDatePattern = /(\d{4})-(\d{2})-(\d{2})/;
  
  // Try to find DOB in PERS_DATA_EFFDT if it exists
  if (data.PERS_DATA_EFFDT) {
    const birthdate = data.PERS_DATA_EFFDT.BIRTHDATE || 
                      data.PERS_DATA_EFFDT.BIRTH_DATE || 
                      data.PERS_DATA_EFFDT.DOB;
    if (birthdate) {
      if (usDatePattern.test(birthdate)) {
        return birthdate;
      } else if (isoDatePattern.test(birthdate)) {
        // Convert from YYYY-MM-DD to MM/DD/YYYY
        const match = birthdate.match(isoDatePattern);
        return `${match[2]}/${match[3]}/${match[1]}`;
      }
    }
  }
  
  // Deep scan all properties for date-like values
  return findDateInObject(data);
}

// Helper function to recursively search for date patterns
function findDateInObject(obj, path = "") {
  if (!obj || typeof obj !== 'object') return null;
  
  const usDatePattern = /(\d{1,2})\/(\d{1,2})\/(\d{4})/;
  const isoDatePattern = /(\d{4})-(\d{2})-(\d{2})/;
  const currentYear = new Date().getFullYear();
  
  // Check if the current object has birthdate-related keys
  const birthdateKeys = ['BIRTHDATE', 'DOB', 'BIRTH_DATE', 'DATE_OF_BIRTH'];
  
  for (const key of birthdateKeys) {
    if (obj[key] && typeof obj[key] === 'string') {
      if (usDatePattern.test(obj[key])) {
        return obj[key];
      } else if (isoDatePattern.test(obj[key])) {
        // Convert from YYYY-MM-DD to MM/DD/YYYY
        const match = obj[key].match(isoDatePattern);
        return `${match[2]}/${match[3]}/${match[1]}`;
      }
    }
  }
  
  // Recursively check all properties
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      const foundDate = findDateInObject(obj[key], `${path}.${key}`);
      if (foundDate) return foundDate;
    } else if (typeof obj[key] === 'string') {
      // Check if value looks like a date
      if (usDatePattern.test(obj[key])) {
        const match = obj[key].match(usDatePattern);
        const year = parseInt(match[3]);
        // Only consider dates that are likely birthdates (more than 16 years ago)
        if (year < currentYear - 16 && year > currentYear - 100) {
          return obj[key];
        }
      } else if (isoDatePattern.test(obj[key])) {
        const match = obj[key].match(isoDatePattern);
        const year = parseInt(match[1]);
        if (year < currentYear - 16 && year > currentYear - 100) {
          // Convert from YYYY-MM-DD to MM/DD/YYYY
          return `${match[2]}/${match[3]}/${match[1]}`;
        }
      }
    }
  }
  
  return null;
}

function extractAllInformation() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.runtime.sendMessage({
      type: "extractionProgress", 
      status: "Fetching biographical information...",
      complete: false
    });
    
    // Step 1: Fetch bio data
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      function: fetchBiographicalData
    }, (bioResults) => {
      if (bioResults && bioResults[0] && bioResults[0].result) {
        const bioData = bioResults[0].result;
        
        // Save bio results to storage
        if (bioData.name) {
          chrome.storage.local.set({name: bioData.name});
        }
        if (bioData.dob) {
          chrome.storage.local.set({dob: bioData.dob});
        }
        
        chrome.runtime.sendMessage({
          type: "extractionProgress", 
          status: "Biographical information fetched! Moving to degree data...",
          complete: false
        });
        
        // Step 2: Fetch degree data directly
        chrome.scripting.executeScript({
          target: {tabId: tabs[0].id},
          function: fetchDegreeData
        }, (degreeResults) => {
          if (degreeResults && degreeResults[0] && degreeResults[0].result) {
            const degreeData = degreeResults[0].result;
            
            // Save degree results to storage
            if (degreeData.degreeName) {
              chrome.storage.local.set({degreeName: degreeData.degreeName});
            }
            if (degreeData.creditProgress) {
              chrome.storage.local.set({creditProgress: degreeData.creditProgress});
            }
            
            chrome.runtime.sendMessage({
              type: "extractionProgress", 
              status: "All information extracted successfully!",
              complete: true
            });
          } else {
            chrome.runtime.sendMessage({
              type: "extractionProgress", 
              status: "Bio info extracted, but degree info failed. Trying fallback...",
              complete: false
            });
            
            // Fall back to navigation approach for degree info
            navigateToDegreePage(tabs[0].id);
          }
        });
      } else {
        // Fallback to traditional page navigation approach if direct fetch fails
        chrome.runtime.sendMessage({
          type: "extractionProgress", 
          status: "Direct bio fetch failed, trying navigation approach...",
          complete: false
        });
        
        navigateToProfilePage(tabs[0].id);
      }
    });
  });
}

// This function will be injected into the page to fetch bio data
function fetchBiographicalData() {
  return new Promise((resolve, reject) => {
    fetch("https://csprd.ctclink.us/psc/csprd/EMPLOYEE/SA/s/WEBLIB_HCX_PF.H_BIO_INFO.FieldFormula.IScript_Main", {
      method: "GET",
      credentials: "include",
      headers: {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "sec-fetch-dest": "iframe",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin"
      }
    })
    .then(response => response.text())
    .then(html => {
      // Parse the HTML response to extract the window.highpoint object
      const scriptStartMarker = 'window.highpoint = ';
      const scriptStart = html.indexOf(scriptStartMarker);
      
      if (scriptStart === -1) {
        throw new Error("Could not find highpoint data in response");
      }
      
      // Find the object start and end
      const dataStart = scriptStart + scriptStartMarker.length;
      let braceCount = 0;
      let dataEnd = dataStart;
      
      // Find where the JSON object ends
      for (let i = dataStart; i < html.length; i++) {
        if (html[i] === '{') {
          braceCount++;
        } else if (html[i] === '}') {
          braceCount--;
          if (braceCount === 0) {
            dataEnd = i + 1;
            break;
          }
        }
      }
      
      if (braceCount !== 0) {
        throw new Error("Malformed JSON data in response");
      }
      
      // Extract the JSON data and parse it
      const jsonData = html.substring(dataStart, dataEnd);
      const highpointData = JSON.parse(jsonData);
      
      // Format the name from the data
      const result = {
        name: null,
        dob: null
      };
      
      // Find preferred name
      const preferredName = highpointData.NAMES.find(name => name.NAME_TYPE === "PRF");
      if (preferredName && preferredName.NAME_PARTS) {
        // Construct the full name from parts
        const prefix = preferredName.NAME_PARTS.find(part => part.name_part === "NAME_PREFIX")?.name_part_value || '';
        const firstName = preferredName.NAME_PARTS.find(part => part.name_part === "FIRST_NAME")?.name_part_value || '';
        const middleName = preferredName.NAME_PARTS.find(part => part.name_part === "MIDDLE_NAME")?.name_part_value || '';
        const lastName = preferredName.NAME_PARTS.find(part => part.name_part === "LAST_NAME")?.name_part_value || '';
        
        // Construct full name
        result.name = [prefix, firstName, middleName, lastName].filter(Boolean).join(' ').trim();
      }
      
      // If no preferred name, try primary name
      if (!result.name) {
        const primaryName = highpointData.NAMES.find(name => name.NAME_TYPE === "PRI");
        if (primaryName && primaryName.NAME_PARTS) {
          const prefix = primaryName.NAME_PARTS.find(part => part.name_part === "NAME_PREFIX")?.name_part_value || '';
          const firstName = primaryName.NAME_PARTS.find(part => part.name_part === "FIRST_NAME")?.name_part_value || '';
          const middleName = primaryName.NAME_PARTS.find(part => part.name_part === "MIDDLE_NAME")?.name_part_value || '';
          const lastName = primaryName.NAME_PARTS.find(part => part.name_part === "LAST_NAME")?.name_part_value || '';
          
          result.name = [prefix, firstName, middleName, lastName].filter(Boolean).join(' ').trim();
        }
      }
      
      // Try to get DOB from window.highpoint if available
      if (highpointData.PERSONAL_DATA && highpointData.PERSONAL_DATA.BIRTHDATE) {
        result.dob = highpointData.PERSONAL_DATA.BIRTHDATE;
      }
      
      // Check for BIO_INFO.BIRTHDATE (in ISO format)
      if (!result.dob && highpointData.BIO_INFO && highpointData.BIO_INFO.BIRTHDATE) {
        // Convert from YYYY-MM-DD to MM/DD/YYYY format
        const match = highpointData.BIO_INFO.BIRTHDATE.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
          result.dob = `${match[2]}/${match[3]}/${match[1]}`; // MM/DD/YYYY
        } else {
          result.dob = highpointData.BIO_INFO.BIRTHDATE;
        }
      }
      
      // Look for DOB in another part of the structure if not found above
      if (!result.dob && highpointData.BIO_INFO) {
        result.dob = highpointData.BIO_INFO.DOB || null;
      }
      
      console.log("Extracted data from direct fetch:", result);
      resolve(result);
    })
    .catch(error => {
      console.error("Error fetching bio data:", error);
      reject(error);
    });
  });
}

// Fallback to traditional page navigation if fetch fails
function navigateToProfilePage(tabId) {
  chrome.tabs.update(tabId, {
    url: 'https://csprd.ctclink.us/psp/csprd/EMPLOYEE/SA/s/WEBLIB_HCX_PF.H_BIO_INFO.FieldFormula.IScript_Main'
  });
  
  // Continue with your original navigation-based code
  chrome.tabs.onUpdated.addListener(function profileListener(tabId, changeInfo, tab) {
    if (tabId === tabId && changeInfo.status === 'complete') {
      // Remove this listener
      chrome.tabs.onUpdated.removeListener(profileListener);
      
      // Wait for content to load
      setTimeout(function() {
        chrome.tabs.sendMessage(tabId, {action: "extractInfo"}, function(result) {
          // Continue with existing extraction process...
        });
      }, 2000);
    }
  });
}

// Fallback for degree page navigation
function navigateToDegreePage(tabId) {
  chrome.tabs.update(tabId, {
    url: 'https://csprd.ctclink.us/psp/csprd/EMPLOYEE/SA/s/WEBLIB_HCX_RE.H_DEGREE_PROGRESS.FieldFormula.IScript_Main'
  });
  
  chrome.tabs.onUpdated.addListener(function degreeListener(updatedTabId, changeInfo, tab) {
    if (updatedTabId === tabId && changeInfo.status === 'complete') {
      // Remove this listener
      chrome.tabs.onUpdated.removeListener(degreeListener);
      
      // Wait for content to load
      setTimeout(function() {
        chrome.tabs.sendMessage(tabId, {action: "extractInfo"}, function(result) {
          if (result) {
            if (result.degreeName) {
              chrome.storage.local.set({degreeName: result.degreeName});
            }
            if (result.creditProgress) {
              chrome.storage.local.set({creditProgress: result.creditProgress});
            }
            
            chrome.runtime.sendMessage({
              type: "extractionProgress", 
              status: "All information extracted successfully!",
              complete: true
            });
          } else {
            chrome.runtime.sendMessage({
              type: "extractionProgress", 
              status: "Extraction failed.",
              complete: true
            });
          }
        });
      }, 1500);
    }
  });
}

function convertISOtoUS(isoDate) {
  const match = isoDate.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[2]}/${match[3]}/${match[1]}`; // MM/DD/YYYY
  }
  return isoDate;
}