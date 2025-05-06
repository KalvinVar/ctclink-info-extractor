// This script runs automatically when a matching page is loaded
console.log("ctcLink Extension active!");

// Define function to extract profile information
function extractProfileInfo() {
  // Result object
  const result = {
    name: null,
    dob: null
  };
  
  console.log("Starting profile extraction");
  
  // Wait a bit longer for the page to fully load
  setTimeout(() => {
    try {
      console.log("Delayed extraction starting...");
      
      // SPECIFIC TARGETED EXTRACTION based on actual HTML structure
      
      // Look for preferred name or primary name containers
      const nameContainers = document.querySelectorAll('div.d-flex.align-items-center.justify-content-between');
      console.log("Found containers:", nameContainers.length);
      
      for (const container of nameContainers) {
        console.log("Container text:", container.textContent);
        if (container.textContent.includes('Preferred Name:') || container.textContent.includes('Primary Name:')) {
          // Get the paragraph element that has the name
          const nameElement = container.querySelector('p.cx-MuiTypography-root.mr-2.cx-MuiTypography-body1');
          if (nameElement) {
            const nameText = nameElement.textContent.trim();
            console.log("Found name in container:", nameText);
            result.name = nameText;
            break;
          }
        }
      }
      
      // Look for DOB container
      const dobContainers = document.querySelectorAll('div.d-flex.align-items-center.justify-content-between');
      
      for (const container of dobContainers) {
        if (container.textContent.includes('Date of Birth:')) {
          // Get the paragraph element that has the DOB
          const dobElement = container.querySelector('p.cx-MuiTypography-root.mr-2.cx-MuiTypography-body1');
          if (dobElement) {
            const dobText = dobElement.textContent.trim();
            console.log("Found DOB in container:", dobText);
            result.dob = dobText;
            break;
          }
        }
      }
      
      // If we still don't have name or DOB, try searching inside iframes
      if (!result.name || !result.dob) {
        console.log("Trying to find elements inside iframes...");
        const iframes = document.querySelectorAll('iframe');
        console.log("Found", iframes.length, "iframes");
        
        for (let i = 0; i < iframes.length; i++) {
          try {
            const iframeDoc = iframes[i].contentDocument || iframes[i].contentWindow.document;
            console.log(`Checking iframe ${i}...`);
            
            // Look for name in iframe
            if (!result.name) {
              const nameContainers = iframeDoc.querySelectorAll('div.d-flex.align-items-center.justify-content-between');
              
              for (const container of nameContainers) {
                if (container.textContent.includes('Preferred Name:') || container.textContent.includes('Primary Name:')) {
                  const nameElement = container.querySelector('p.cx-MuiTypography-root.mr-2.cx-MuiTypography-body1');
                  if (nameElement) {
                    result.name = nameElement.textContent.trim();
                    console.log("Found name in iframe:", result.name);
                    break;
                  }
                }
              }
            }
            
            // Look for DOB in iframe
            if (!result.dob) {
              const dobContainers = iframeDoc.querySelectorAll('div.d-flex.align-items-center.justify-content-between');
              
              for (const container of dobContainers) {
                if (container.textContent.includes('Date of Birth:')) {
                  const dobElement = container.querySelector('p.cx-MuiTypography-root.mr-2.cx-MuiTypography-body1');
                  if (dobElement) {
                    result.dob = dobElement.textContent.trim();
                    console.log("Found DOB in iframe:", result.dob);
                    break;
                  }
                }
              }
            }
            
            if (result.name && result.dob) {
              break; // Found both, no need to check more iframes
            }
          } catch (e) {
            console.error(`Error accessing iframe ${i}:`, e);
          }
        }
      }
      
      // If still not found, try more general selectors
      if (!result.name) {
        console.log("Trying more general selectors for name...");
        // Try to find any element that might contain the name
        const potentialNameElements = document.querySelectorAll('p, span, div');
        
        for (const element of potentialNameElements) {
          const text = element.textContent.trim();
          if ((text.startsWith('Mr ') || text.startsWith('Ms ') || text.startsWith('Mrs ')) && 
              text.length > 5 && 
              text !== 'General Info' && 
              text !== 'Class Information') {
            result.name = text;
            console.log("Found name with general selector:", text);
            break;
          }
        }
      }
      
      // Update storage with what we found
      if (result.name || result.dob) {
        chrome.storage.local.set(result);
        console.log("Updated storage with profile info:", result);
      }
      
      console.log("Profile extraction results:", result);
    } catch (e) {
      console.error("Error during profile extraction:", e);
    }
  }, 3000); // Increased delay to 3 seconds
  
  return result;
}

// Define function to extract degree information
function extractDegreeInfo() {
  // Result object
  const result = {
    degreeName: null,
    creditProgress: null
  };
  
  try {
    console.log("Starting degree info extraction");
    
    // First, try to click the "View All" button to reveal hidden data
    let clickedButton = false;
    
    // Look for the View All button in the main document
    const viewAllButtons = Array.from(document.querySelectorAll('button.cx-MuiButtonBase-root'));
    for (let button of viewAllButtons) {
      if (button.textContent.includes('View All')) {
        console.log("Found View All button in main document, clicking...");
        button.click();
        clickedButton = true;
        // Give some time for the UI to update
        break;
      }
    }
    
    // If button not found in main document, look in iframes
    if (!clickedButton) {
      const iframes = document.querySelectorAll('iframe');
      for (let i = 0; i < iframes.length; i++) {
        try {
          const iframeDoc = iframes[i].contentDocument || iframes[i].contentWindow.document;
          const iframeButtons = Array.from(iframeDoc.querySelectorAll('button.cx-MuiButtonBase-root'));
          
          for (let button of iframeButtons) {
            if (button.textContent.includes('View All')) {
              console.log(`Found View All button in iframe ${i}, clicking...`);
              button.click();
              clickedButton = true;
              break;
            }
          }
          
          if (clickedButton) break;
        } catch (e) {
          console.error(`Error accessing iframe ${i}:`, e);
        }
      }
    }
    
    // Wait a bit for the UI to update after clicking the button
    setTimeout(() => {
      // Find the degree name (h2 heading)
      let degreeElement = document.querySelector('h2.cx-MuiTypography-root.cx-MuiTypography-h2[style*="font-weight: 600"]');
      if (degreeElement) {
        result.degreeName = degreeElement.textContent.trim();
        console.log("Found degree name:", result.degreeName);
      }
      
      // Find the credit progress (div with h2 and colorTextSecondary classes)
      let progressElement = document.querySelector('div.cx-MuiTypography-root.cx-MuiTypography-h2.cx-MuiTypography-colorTextSecondary');
      if (progressElement) {
        result.creditProgress = progressElement.textContent.trim();
        console.log("Found credit progress:", result.creditProgress);
      }
      
      // If we couldn't find elements directly, try iframes
      if (!result.degreeName || !result.creditProgress) {
        const iframes = document.querySelectorAll('iframe');
        
        for (let i = 0; i < iframes.length; i++) {
          try {
            const iframeDoc = iframes[i].contentDocument || iframes[i].contentWindow.document;
            
            // Try to find degree name in iframe
            if (!result.degreeName) {
              const degreeElement = iframeDoc.querySelector('h2.cx-MuiTypography-root.cx-MuiTypography-h2[style*="font-weight: 600"]');
              if (degreeElement) {
                result.degreeName = degreeElement.textContent.trim();
                console.log("Found degree name in iframe:", result.degreeName);
              }
            }
            
            // Try to find credit progress in iframe
            if (!result.creditProgress) {
              const progressElement = iframeDoc.querySelector('div.cx-MuiTypography-root.cx-MuiTypography-h2.cx-MuiTypography-colorTextSecondary');
              if (progressElement) {
                result.creditProgress = progressElement.textContent.trim();
                console.log("Found credit progress in iframe:", result.creditProgress);
              }
            }
            
            // If we found both, break out of the loop
            if (result.degreeName && result.creditProgress) {
              break;
            }
          } catch (e) {
            console.error('Error accessing iframe:', e);
          }
        }
      }
      
      // Update the storage with what we found
      chrome.storage.local.set({
        degreeName: result.degreeName,
        creditProgress: result.creditProgress
      });
      
      console.log("Degree extraction completed:", result);
    }, 1000); // Wait 1 second for UI to update
    
  } catch (e) {
    console.error('Error extracting degree info:', e);
  }
  
  return result;
}

// Listen for messages from the extension
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "checkPage") {
    // Check if we're on the profile page or degree progress page
    const isProfilePage = window.location.href.includes('H_BIO_INFO');
    const isDegreeProgressPage = window.location.href.includes('H_DEGREE_PROGRESS');
    sendResponse({isProfilePage: isProfilePage, isDegreeProgressPage: isDegreeProgressPage});
  }
  
  if (request.action === "extractInfo") {
    // If we're on the profile page
    if (window.location.href.includes('WEBLIB_HCX_PF.H_BIO_INFO')) {
      let result = {};
      
      // Delay extraction to ensure page is fully loaded
      setTimeout(() => {
        try {
          // Look for preferred name or primary name containers
          const nameContainers = document.querySelectorAll('div.d-flex.align-items-center.justify-content-between');
          console.log("Found containers:", nameContainers.length);
          
          for (const container of nameContainers) {
            console.log("Container text:", container.textContent);
            if (container.textContent.includes('Preferred Name:') || container.textContent.includes('Primary Name:')) {
              // Get the paragraph element that has the name
              const nameElement = container.querySelector('p.cx-MuiTypography-root.mr-2.cx-MuiTypography-body1');
              if (nameElement) {
                const nameText = nameElement.textContent.trim();
                console.log("Found name in container:", nameText);
                result.name = nameText;
                break;
              }
            }
          }
          
          // Look for DOB container
          const dobContainers = document.querySelectorAll('div.d-flex.align-items-center.justify-content-between');
          
          for (const container of dobContainers) {
            if (container.textContent.includes('Date of Birth:')) {
              // Get the paragraph element that has the DOB
              const dobElement = container.querySelector('p.cx-MuiTypography-root.mr-2.cx-MuiTypography-body1');
              if (dobElement) {
                const dobText = dobElement.textContent.trim();
                console.log("Found DOB in container:", dobText);
                result.dob = dobText;
                break;
              }
            }
          }
          
          // Try iframe search if needed
          if (!result.name || !result.dob) {
            const iframes = document.querySelectorAll('iframe');
            for (let i = 0; i < iframes.length; i++) {
              try {
                const iframeDoc = iframes[i].contentDocument || iframes[i].contentWindow.document;
                
                // Look for name in iframe
                if (!result.name) {
                  const nameContainers = iframeDoc.querySelectorAll('div.d-flex.align-items-center.justify-content-between');
                  
                  for (const container of nameContainers) {
                    if (container.textContent.includes('Preferred Name:') || container.textContent.includes('Primary Name:')) {
                      const nameElement = container.querySelector('p.cx-MuiTypography-root.mr-2.cx-MuiTypography-body1');
                      if (nameElement) {
                        result.name = nameElement.textContent.trim();
                        console.log("Found name in iframe:", result.name);
                        break;
                      }
                    }
                  }
                }
                
                // Look for DOB in iframe
                if (!result.dob) {
                  const dobContainers = iframeDoc.querySelectorAll('div.d-flex.align-items-center.justify-content-between');
                  
                  for (const container of dobContainers) {
                    if (container.textContent.includes('Date of Birth:')) {
                      const dobElement = container.querySelector('p.cx-MuiTypography-root.mr-2.cx-MuiTypography-body1');
                      if (dobElement) {
                        result.dob = dobElement.textContent.trim();
                        console.log("Found DOB in iframe:", result.dob);
                        break;
                      }
                    }
                  }
                }
              } catch (e) {
                console.error(`Error accessing iframe ${i}:`, e);
              }
            }
          }
          
          console.log("Extraction result:", result);
          sendResponse(result);
        } catch (e) {
          console.error("Error during extraction:", e);
          sendResponse({error: e.toString()});
        }
      }, 2000);
      
      return true; // Keep the message channel open for async response
    }
    
    // Else if we're on the degree progress page
    if (window.location.href.includes('H_DEGREE_PROGRESS')) {
      const degreeInfo = extractDegreeInfo();
      sendResponse(degreeInfo);
    } else {
      sendResponse({error: "Not on a supported page"});
    }
    return true; // Keep the message channel open for async response
  }
});

// Auto-extraction when on a supported page
(function() {
  // Wait for the page to fully load
  window.addEventListener('load', function() {
    // Only auto-extract if enabled in settings
    chrome.storage.local.get(['autoExtract'], function(result) {
      if (result.autoExtract !== false) { // Default to true if not set
        setTimeout(function() {
          if (window.location.href.includes('H_BIO_INFO')) {
            const profileInfo = extractProfileInfo();
            chrome.storage.local.set(profileInfo);
          } else if (window.location.href.includes('H_DEGREE_PROGRESS')) {
            const degreeInfo = extractDegreeInfo();
            chrome.storage.local.set(degreeInfo);
          }
        }, 2000);
      }
    });
  });
})();
