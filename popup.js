document.addEventListener('DOMContentLoaded', function() {
  const extractButton = document.getElementById('extractButton');
  const extractAllButton = document.getElementById('extractAllButton');
  const goToProfileButton = document.getElementById('goToProfileButton');
  const goToDegreeButton = document.getElementById('goToDegreeButton');
  const nameValue = document.getElementById('nameValue');
  const dobValue = document.getElementById('dobValue');
  const degreeValue = document.getElementById('degreeValue');
  const progressValue = document.getElementById('progressValue');
  const status = document.getElementById('status');
  
  // Listen for storage changes to update UI in real-time
  chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'local') {
      if (changes.name) {
        nameValue.textContent = changes.name.newValue;
      }
      if (changes.dob) {
        dobValue.textContent = changes.dob.newValue;
      }
      if (changes.degreeName) {
        degreeValue.textContent = changes.degreeName.newValue;
      }
      if (changes.creditProgress) {
        progressValue.textContent = changes.creditProgress.newValue;
      }
    }
  });
  
  // Load any previously extracted data
  chrome.storage.local.get(['name', 'dob', 'degreeName', 'creditProgress'], function(result) {
    if (result.name) {
      nameValue.textContent = result.name;
    }
    if (result.dob) {
      dobValue.textContent = result.dob;
    }
    if (result.degreeName) {
      degreeValue.textContent = result.degreeName;
    }
    if (result.creditProgress) {
      progressValue.textContent = result.creditProgress;
    }
  });
  
  // Extract information button
  extractButton.addEventListener('click', function() {
    status.textContent = 'Extracting information...';
    
    // Check if we're on the right page
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "checkPage"}, function(response) {
        if (response) {
          if (response.isProfilePage) {
            // Extract profile info
            chrome.tabs.sendMessage(tabs[0].id, {action: "extractInfo"}, function(result) {
              if (result) {
                if (result.name) {
                  nameValue.textContent = result.name;
                  chrome.storage.local.set({name: result.name});
                }
                if (result.dob) {
                  dobValue.textContent = result.dob;
                  chrome.storage.local.set({dob: result.dob});
                }
                status.textContent = 'Profile information extracted!';
              } else {
                status.textContent = 'Could not extract profile information.';
              }
            });
          } else if (response.isDegreeProgressPage) {
            // Extract degree info
            chrome.tabs.sendMessage(tabs[0].id, {action: "extractInfo"}, function(result) {
              if (result) {
                if (result.degreeName) {
                  degreeValue.textContent = result.degreeName;
                  chrome.storage.local.set({degreeName: result.degreeName});
                }
                if (result.creditProgress) {
                  progressValue.textContent = result.creditProgress;
                  chrome.storage.local.set({creditProgress: result.creditProgress});
                }
                status.textContent = 'Degree information extracted!';
              } else {
                status.textContent = 'Could not extract degree information.';
              }
            });
          } else {
            status.textContent = 'Not on a supported page. Please navigate to Profile or Degree Progress.';
          }
        } else {
          status.textContent = 'Could not check current page. Try refreshing.';
        }
      });
    });
  });
  
  // Extract All Information button
  extractAllButton.addEventListener('click', function() {
    status.textContent = 'Starting full extraction...';
    extractAllButton.disabled = true;
    
    // First navigate to profile page
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.update(tabs[0].id, {
        url: 'https://csprd.ctclink.us/psp/csprd/EMPLOYEE/SA/s/WEBLIB_HCX_PF.H_BIO_INFO.FieldFormula.IScript_Main'
      });
      
      // Wait for page to load and extract profile info
      chrome.tabs.onUpdated.addListener(function profileListener(tabId, changeInfo, tab) {
        if (tabId === tabs[0].id && changeInfo.status === 'complete') {
          // Remove this listener once it fires
          chrome.tabs.onUpdated.removeListener(profileListener);
          
          // Small delay to ensure page content is fully loaded
          setTimeout(function() {
            // Extract profile info
            chrome.tabs.sendMessage(tabs[0].id, {action: "extractInfo"}, function(result) {
              if (result) {
                if (result.name) {
                  nameValue.textContent = result.name;
                  chrome.storage.local.set({name: result.name});
                }
                if (result.dob) {
                  dobValue.textContent = result.dob;
                  chrome.storage.local.set({dob: result.dob});
                }
                status.textContent = 'Profile information extracted! Moving to degree page...';
                
                // Now navigate to degree progress page
                chrome.tabs.update(tabs[0].id, {
                  url: 'https://csprd.ctclink.us/psp/csprd/EMPLOYEE/SA/s/WEBLIB_HCX_RE.H_DEGREE_PROGRESS.FieldFormula.IScript_Main'
                });
                
                // Wait for degree page to load and extract degree info
                chrome.tabs.onUpdated.addListener(function degreeListener(tabId, changeInfo, tab) {
                  if (tabId === tabs[0].id && changeInfo.status === 'complete') {
                    // Remove this listener once it fires
                    chrome.tabs.onUpdated.removeListener(degreeListener);
                    
                    // Small delay to ensure page content is fully loaded
                    setTimeout(function() {
                      // Extract degree info
                      chrome.tabs.sendMessage(tabs[0].id, {action: "extractInfo"}, function(result) {
                        if (result) {
                          if (result.degreeName) {
                            // Update UI immediately
                            degreeValue.textContent = result.degreeName;
                            chrome.storage.local.set({degreeName: result.degreeName});
                          }
                          if (result.creditProgress) {
                            // Update UI immediately
                            progressValue.textContent = result.creditProgress;
                            chrome.storage.local.set({creditProgress: result.creditProgress});
                          }
                          status.textContent = 'All information extracted successfully!';
                        } else {
                          status.textContent = 'Complete: Profile extracted, but degree info failed.';
                        }
                        extractAllButton.disabled = false;
                      });
                    }, 1500);
                  }
                });
              } else {
                status.textContent = 'Profile extraction failed. Try using individual buttons.';
                extractAllButton.disabled = false;
              }
            });
          }, 1500);
        }
      });
    });
  });
  
  // Go to profile page button
  goToProfileButton.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.update(tabs[0].id, {
        url: 'https://csprd.ctclink.us/psp/csprd/EMPLOYEE/SA/s/WEBLIB_HCX_PF.H_BIO_INFO.FieldFormula.IScript_Main'
      });
      window.close();
    });
  });
  
  // Go to degree progress page button
  goToDegreeButton.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.update(tabs[0].id, {
        url: 'https://csprd.ctclink.us/psp/csprd/EMPLOYEE/SA/s/WEBLIB_HCX_RE.H_DEGREE_PROGRESS.FieldFormula.IScript_Main'
      });
      window.close();
    });
  });
});