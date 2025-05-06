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

function extractAllInformation() {
  // First navigate to profile page
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.runtime.sendMessage({
      type: "extractionProgress", 
      status: "Navigating to profile page...",
      complete: false
    });
    
    chrome.tabs.update(tabs[0].id, {
      url: 'https://csprd.ctclink.us/psp/csprd/EMPLOYEE/SA/s/WEBLIB_HCX_PF.H_BIO_INFO.FieldFormula.IScript_Main'
    });
    
    // Wait for profile page to load
    chrome.tabs.onUpdated.addListener(function profileListener(tabId, changeInfo, tab) {
      if (tabId === tabs[0].id && changeInfo.status === 'complete') {
        // Remove this listener
        chrome.tabs.onUpdated.removeListener(profileListener);
        
        // Wait for content to load
        setTimeout(function() {
          chrome.runtime.sendMessage({
            type: "extractionProgress", 
            status: "Extracting profile information...",
            complete: false
          });
          
          // Extract profile info
          chrome.tabs.sendMessage(tabs[0].id, {action: "extractInfo"}, function(result) {
            if (result) {
              // Save results to storage
              if (result.name) {
                chrome.storage.local.set({name: result.name});
              }
              if (result.dob) {
                chrome.storage.local.set({dob: result.dob});
              }
              
              chrome.runtime.sendMessage({
                type: "extractionProgress", 
                status: "Profile extracted! Moving to degree page...",
                complete: false
              });
              
              // Move to degree page
              chrome.tabs.update(tabs[0].id, {
                url: 'https://csprd.ctclink.us/psp/csprd/EMPLOYEE/SA/s/WEBLIB_HCX_RE.H_DEGREE_PROGRESS.FieldFormula.IScript_Main'
              });
              
              // Wait for degree page to load
              chrome.tabs.onUpdated.addListener(function degreeListener(tabId, changeInfo, tab) {
                if (tabId === tabs[0].id && changeInfo.status === 'complete') {
                  // Remove this listener
                  chrome.tabs.onUpdated.removeListener(degreeListener);
                  
                  // Wait for content to load
                  setTimeout(function() {
                    chrome.runtime.sendMessage({
                      type: "extractionProgress", 
                      status: "Extracting degree information...",
                      complete: false
                    });
                    
                    // Extract degree info
                    chrome.tabs.sendMessage(tabs[0].id, {action: "extractInfo"}, function(result) {
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
                          status: "Profile extracted, but degree info failed.",
                          complete: true
                        });
                      }
                    });
                  }, 1500);
                }
              });
            } else {
              chrome.runtime.sendMessage({
                type: "extractionProgress", 
                status: "Profile extraction failed. Try using individual buttons.",
                complete: true
              });
            }
          });
        }, 1500);
      }
    });
  });
}