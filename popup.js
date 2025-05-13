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
  
  // Test direct fetch button
  const testDirectFetchButton = document.getElementById('testDirectFetchButton');
  const fetchTestResult = document.getElementById('fetchTestResult');
  
  // Update the test button handler to also update the UI values

  testDirectFetchButton.addEventListener('click', function() {
    testDirectFetchButton.disabled = true;
    fetchTestResult.style.display = 'none';
    status.textContent = 'Testing direct fetch via background...';
    
    // Send message to background script to do the fetch
    chrome.runtime.sendMessage({
      action: "testFetchBio"
    }, function(response) {
      testDirectFetchButton.disabled = false;
      
      if (response && response.success) {
        // Show the raw data in the test result area
        fetchTestResult.querySelector('pre').textContent = JSON.stringify(response.data, null, 2);
        fetchTestResult.style.display = 'block';
        status.textContent = 'Direct fetch successful!';
        
        // Also update the main display values
        if (response.data.formattedName) {
          document.getElementById('nameValue').textContent = response.data.formattedName;
          // Also save to storage for persistence
          chrome.storage.local.set({ name: response.data.formattedName });
        }
        
        if (response.data.dob) {
          document.getElementById('dobValue').textContent = response.data.dob;
          // Also save to storage for persistence
          chrome.storage.local.set({ dob: response.data.dob });
        }
      } else {
        status.textContent = 'Direct fetch failed: ' + (response?.error || 'Unknown error');
        if (response?.error) {
          fetchTestResult.querySelector('pre').textContent = 'Error: ' + response.error;
          fetchTestResult.style.display = 'block';
        }
      }
    });
  });

  // Test degree fetch button
  const testDegreeFetchButton = document.getElementById('testDegreeFetchButton');
  const degreeFetchTestResult = document.getElementById('degreeFetchTestResult');

  testDegreeFetchButton.addEventListener('click', function() {
    testDegreeFetchButton.disabled = true;
    degreeFetchTestResult.style.display = 'none';
    status.textContent = 'Testing degree fetch...';
    
    chrome.runtime.sendMessage({
      action: "testFetchDegree"
    }, function(response) {
      testDegreeFetchButton.disabled = false;
      
      if (response && response.success) {
        // Show the raw data in the test result area
        degreeFetchTestResult.querySelector('pre').textContent = JSON.stringify(response.data, null, 2);
        degreeFetchTestResult.style.display = 'block';
        status.textContent = 'Degree fetch successful!';
        
        // Also update the main display values
        if (response.data.extractedInfo.degreeName) {
          document.getElementById('degreeValue').textContent = response.data.extractedInfo.degreeName;
          // Also save to storage for persistence
          chrome.storage.local.set({ degreeName: response.data.extractedInfo.degreeName });
        }
        
        if (response.data.extractedInfo.creditProgress) {
          document.getElementById('progressValue').textContent = response.data.extractedInfo.creditProgress;
          // Also save to storage for persistence
          chrome.storage.local.set({ creditProgress: response.data.extractedInfo.creditProgress });
        }
      } else {
        status.textContent = 'Degree fetch failed: ' + (response?.error || 'Unknown error');
        if (response?.error) {
          degreeFetchTestResult.querySelector('pre').textContent = 'Error: ' + response.error;
          degreeFetchTestResult.style.display = 'block';
        }
      }
    });
  });
});

// Update the fetchBiographicalData function

function fetchBiographicalData() {
  return new Promise((resolve, reject) => {
    console.log("Starting direct fetch...");
    
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
      console.log("Fetch response received:", response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status} ${response.statusText}`);
      }
      
      return response.text();
    })
    .then(html => {
      console.log("HTML response length:", html.length);
      
      // Check if we actually got HTML content
      if (!html || html.length < 100) {
        throw new Error("Empty or very short response received");
      }
      
      // Parse the HTML response to extract the window.highpoint object
      const scriptStartMarker = 'window.highpoint = ';
      const scriptStart = html.indexOf(scriptStartMarker);
      
      console.log("Script marker position:", scriptStart);
      
      if (scriptStart === -1) {
        console.log("First 200 chars of response:", html.substring(0, 200));
        throw new Error("Could not find highpoint data in response");
      }
      
      // Find the object start and end
      const dataStart = scriptStart + scriptStartMarker.length;
      let braceCount = 0;
      let dataEnd = dataStart;
      
      // Find where the JSON object ends
      let foundFirstBrace = false;
      for (let i = dataStart; i < Math.min(html.length, dataStart + 50000); i++) {
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
      
      console.log("JSON parsing: braceCount=", braceCount, "dataLength=", (dataEnd - dataStart));
      
      if (!foundFirstBrace || braceCount !== 0) {
        throw new Error("Malformed JSON data in response");
      }
      
      // Extract the JSON data and parse it
      const jsonData = html.substring(dataStart, dataEnd);
      console.log("JSON data length:", jsonData.length);
      
      try {
        const highpointData = JSON.parse(jsonData);
        console.log("Successfully parsed JSON data");
        
        // Return the result
        return {
          rawData: highpointData,
          formattedName: formatNameFromData(highpointData),
          dob: extractDOBFromData(highpointData)
        };
      } catch (jsonError) {
        console.error("JSON parse error:", jsonError);
        console.log("First 100 chars of JSON data:", jsonData.substring(0, 100));
        throw new Error("Failed to parse JSON: " + jsonError.message);
      }
    })
    .then(result => {
      console.log("Final result:", result);
      resolve(result);
    })
    .catch(error => {
      console.error("Error in fetch operation:", error);
      reject(error.message);
    });
  });
  
  // Helper functions remain the same...
}