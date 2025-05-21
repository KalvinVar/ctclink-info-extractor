// Initialize default settings
chrome.runtime.onInstalled.addListener(function() {
  chrome.storage.local.set({
    autoExtract: true
  });
});

// Listen for the extractAll message from popup
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === "extractAll") {
    // Start the extraction process using direct fetch
    fetchAllInformation();
    sendResponse({started: true});
    return true; // Keep the message channel open for async response
  }
});

// Update the testFetchBio message handler
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === "testFetchBio") {
    console.log("Background script received test bio fetch request");
    
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
        rawDOB: highpointData.BIO_INFO?.BIRTHDATE || null,
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

// Function to fetch degree data directly
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
    fetchDegreeData()
      .then(result => {
        sendResponse({
          success: true, 
          data: {
            extractedInfo: result
          }
        });
      })
      .catch(error => {
        sendResponse({
          success: false, 
          error: error.message || "Unknown error"
        });
      });
    
    return true; // Keep the message channel open for async response
  }
});

// Function to fetch schedule data
function fetchScheduleData() {
  return new Promise((resolve, reject) => {
    console.log("Starting schedule fetch from Drop Classes page...");
    
    // Direct fetch to the Drop Classes page
    fetch("https://csprd.ctclink.us/psc/csprd/EMPLOYEE/SA/s/WEBLIB_HCX_EN.H_DROP_CLASSES.FieldFormula.IScript_Main", {
      method: "GET",
      credentials: "include",
      headers: {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "sec-ch-ua": "\"Chromium\";v=\"136\", \"Google Chrome\";v=\"136\", \"Not.A/Brand\";v=\"99\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Windows\"",
        "sec-fetch-dest": "iframe",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1"
      },
      referrer: "https://csprd.ctclink.us/psp/csprd/EMPLOYEE/SA/s/WEBLIB_HCX_EN.H_DROP_CLASSES.FieldFormula.IScript_Main?",
      referrerPolicy: "strict-origin-when-cross-origin"
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.text();
    })
    .then(html => {
      // Look for the window.highpoint object in the HTML
      const scriptStartMarker = 'window.highpoint = ';
      const scriptStart = html.indexOf(scriptStartMarker);
      
      if (scriptStart === -1) {
        throw new Error("Could not find highpoint data in Drop Classes page");
      }
      
      // Extract the JSON data
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
      
      // Extract and parse the JSON data
      const jsonData = html.substring(dataStart, dataEnd);
      const highpointData = JSON.parse(jsonData);
      
      console.log("Successfully extracted schedule data from Drop Classes page");
      
      // Process the schedule data into a consistent format
      return processScheduleData(highpointData);
    })
    .then(processedData => {
      resolve(processedData);
    })
    .catch(error => {
      console.error("Error fetching schedule from Drop Classes page:", error);
      reject(error);
    });
  });
  
  // Process the schedule data into a consistent format
  function processScheduleData(data) {
    console.log("Processing schedule data");
    
    const result = {
      currentTerm: data.term_descr || null,
      courses: []
    };
    
    // Extract course information - only include enrolled courses with class_type E
    if (data.courses && Array.isArray(data.courses)) {
      console.log(`Processing ${data.courses.length} courses`);
      
      data.courses.forEach(course => {
        if (course.class_type === "E") {
          const courseMeetings = [];
          
          // Process meetings if they exist and not "ARR"
          if (course.meetings && Array.isArray(course.meetings)) {
            course.meetings.forEach(meeting => {
              // Skip meetings with days = "ARR"
              if (meeting.days && meeting.days !== "ARR") {
                courseMeetings.push({
                  days: meeting.days,
                  startTime: meeting.start_time ? formatTime(meeting.start_time) : null,
                  endTime: meeting.end_time ? formatTime(meeting.end_time) : null,
                  instructor: meeting.instructor || null,
                  location: meeting.facility_descr || null,
                  room: meeting.room || null,
                  startDate: meeting.start_dt || null,
                  endDate: meeting.end_dt || null
                });
              }
            });
          }
          
          // Add course to the result
          result.courses.push({
            classNumber: course.class_number,
            description: course.description,
            subject: course.subject,
            catalogNumber: course.catalog_number,
            units: course.units_taken,
            startDate: course.withdraw_dates && course.withdraw_dates[0] ? 
                     course.withdraw_dates[0].class_start_date : null,
            endDate: course.withdraw_dates && course.withdraw_dates[0] ? 
                   course.withdraw_dates[0].end_date : null,
            meetings: courseMeetings
          });
        }
      });
    }
    
    console.log(`Extracted ${result.courses.length} enrolled courses successfully`);
    return result;
  }
  
  // Helper function to format time strings (17.00.00.000000-08:00 -> 5:00 PM)
  function formatTime(timeStr) {
    if (!timeStr) return null;
    
    try {
      // Extract hours and minutes
      const match = timeStr.match(/(\d+)\.(\d+)\./);
      if (!match) return timeStr;
      
      const hours = parseInt(match[1]);
      const minutes = match[2];
      
      // Format as 12-hour time with AM/PM
      let period = "AM";
      let hour12 = hours;
      
      if (hours >= 12) {
        period = "PM";
        hour12 = hours === 12 ? 12 : hours - 12;
      }
      if (hours === 0) {
        hour12 = 12;
      }
      
      return `${hour12}:${minutes} ${period}`;
    } catch (e) {
      console.error("Error formatting time:", e);
      return timeStr; // Return original if formatting fails
    }
  }
}

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

// Function to extract DOB from data
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

  // Try to find DOB in PERS_DATA_EFFDT if it exists
  if (data.PERS_DATA_EFFDT) {
    const birthdate = data.PERS_DATA_EFFDT.BIRTHDATE || 
                     data.PERS_DATA_EFFDT.BIRTH_DATE || 
                     data.PERS_DATA_EFFDT.DOB;
    if (birthdate) {
      const usDatePattern = /(\d{1,2})\/(\d{1,2})\/(\d{4})/;
      const isoDatePattern = /(\d{4})-(\d{2})-(\d{2})/;
      
      if (usDatePattern.test(birthdate)) {
        return birthdate;
      } else if (isoDatePattern.test(birthdate)) {
        // Convert from YYYY-MM-DD to MM/DD/YYYY
        const match = birthdate.match(isoDatePattern);
        return `${match[2]}/${match[3]}/${match[1]}`;
      }
    }
  }
  
  // Deep scan for dates as last resort
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

// Function to fetch all information using direct API calls
function fetchAllInformation() {
  chrome.runtime.sendMessage({
    type: "extractionProgress", 
    status: "Fetching biographical information...",
    complete: false
  });
  
  // Step 1: Fetch bio data
  fetchBiographicalData()
    .then(bioData => {
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
      return fetchDegreeData().then(degreeData => {
        // Save degree results to storage
        if (degreeData.degreeName) {
          chrome.storage.local.set({degreeName: degreeData.degreeName});
        }
        if (degreeData.creditProgress) {
          chrome.storage.local.set({creditProgress: degreeData.creditProgress});
        }
        
        // Step 3: Fetch schedule data
        chrome.runtime.sendMessage({
          type: "extractionProgress", 
          status: "Degree information fetched! Moving to course schedule...",
          complete: false
        });
        
        return fetchScheduleData();
      });
    })
    .then(scheduleData => {
      // Save schedule results to storage
      chrome.storage.local.set({scheduleData: scheduleData});
      
      chrome.runtime.sendMessage({
        type: "extractionProgress", 
        status: "Schedule information fetched! Moving to financial aid information...",
        complete: false
      });
      
      // Step 4: Fetch financial aid data
      return fetchFinancialAidData();
    })
    .then(financialAidData => {
      // Save financial aid results to storage
      chrome.storage.local.set({financialAidData: financialAidData});
      
      chrome.runtime.sendMessage({
        type: "extractionProgress", 
        status: "All information extracted successfully!",
        complete: true
      });
    })
    .catch(error => {
      console.error("Error in fetchAllInformation:", error);
      chrome.runtime.sendMessage({
        type: "extractionProgress", 
        status: `Error: ${error.message}`,
        complete: true
      });
    });
}

// Function to fetch bio data directly
function fetchBiographicalData() {
  return new Promise((resolve, reject) => {
    console.log("Starting direct bio fetch...");
    
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
      
      // Format the result
      const result = {
        name: formatNameFromData(highpointData),
        dob: extractDOBFromData(highpointData)
      };
      
      console.log("Extracted data from direct fetch:", result);
      resolve(result);
    })
    .catch(error => {
      console.error("Error fetching bio data:", error);
      reject(error);
    });
  });
}

function convertISOtoUS(isoDate) {
  const match = isoDate.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[2]}/${match[3]}/${match[1]}`; // MM/DD/YYYY
  }
  return isoDate;
}

// Handle schedule fetch requests
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === "testFetchSchedule") {
    console.log("Background script received schedule fetch request");
    
    // Directly fetch schedule info
    fetchScheduleData()
      .then(data => {
        console.log("Returned schedule data:", data);
        
        // Return to the popup
        sendResponse({
          success: true, 
          data: { scheduleInfo: data }
        });
      })
      .catch(error => {
        console.error("Schedule fetch error:", error);
        sendResponse({
          success: false,
          error: error.message || "Unknown error fetching schedule"
        });
      });
    
    return true; // Keep the message channel open for async response
  }
});

// Enhanced function to fetch financial aid data with detailed budget
function fetchFinancialAidData() {
  return new Promise((resolve, reject) => {
    console.log("Starting financial aid data fetch...");
    let summaryData = {};
    
    // Step 1: Fetch the main financial aid summary
    fetch("https://csprd.ctclink.us/psc/csprd/EMPLOYEE/SA/s/WEBLIB_HCX_FA.H_FIN_AID_SUMMARY.FieldFormula.IScript_Main", {
      method: "GET",
      credentials: "include",
      headers: {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "sec-fetch-dest": "iframe",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "upgrade-insecure-requests": "1"
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.text();
    })
    .then(html => {
      // Extract the window.highpoint object from the HTML
      const scriptStartMarker = 'window.highpoint = ';
      const scriptStart = html.indexOf(scriptStartMarker);
      
      if (scriptStart === -1) {
        throw new Error("Could not find highpoint data in financial aid page");
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
        throw new Error("Malformed JSON data in financial aid response");
      }
      
      // Extract the JSON data and parse it
      const jsonData = html.substring(dataStart, dataEnd);
      const highpointData = JSON.parse(jsonData);
      
      // Find the current year's financial aid data (the first one in the list)
      const currentYearData = highpointData.aid_years && highpointData.aid_years.length > 0 
                             ? highpointData.aid_years[0] : null;
      
      if (!currentYearData || !currentYearData.summary) {
        throw new Error("No financial aid data found for current year");
      }
      
      // Extract the specific data points
      summaryData = {
        aidYear: currentYearData.descr,
        aidYearValue: currentYearData.aid_year, // Store for the next request
        institutionDescr: currentYearData.institution_descr,
        estimatedBudget: currentYearData.summary.est_fa_budget || 0,
        familyContribution: currentYearData.summary.fam_contribution || 0,
        estimatedNeed: currentYearData.summary.est_need || 0,
        totalAid: currentYearData.summary.total_aid || 0,
        remainingNeed: currentYearData.summary.remain_need || 0
      };
      
      console.log("Extracted financial aid summary data:", summaryData);
      
      // Step 2: Now fetch the detailed budget information
      return fetch(`https://csprd.ctclink.us/psc/csprd/EMPLOYEE/SA/s/WEBLIB_HCX_FA.H_FIN_AID_SUMMARY.FieldFormula.IScript_EstimatedFABudget?aid_year=${summaryData.aidYearValue}`, {
        method: "GET",
        credentials: "include",
        headers: {
          "accept": "application/json",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin"
        }
      });
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error fetching budget details! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(budgetData => {
      console.log("Fetched budget details:", budgetData);
      
      // Combine the summary data with the detailed budget data
      const result = {
        ...summaryData,
        budgetDetails: {
          terms: [],
          totalCost: 0
        }
      };
      
      // Extract the budget details if available
      if (budgetData.fa_budget && budgetData.fa_budget.terms) {
        result.budgetDetails.terms = budgetData.fa_budget.terms.map(term => ({
          term: term.descr,
          items: term.budget_items.map(item => ({
            description: item.descr,
            amount: item.amount
          })),
          termTotal: term.total
        }));
        
        result.budgetDetails.totalCost = budgetData.fa_budget.total_cost || 0;
        result.budgetDetails.messageTop = budgetData.fa_budget.message_top || "";
        result.budgetDetails.messageBottom = budgetData.fa_budget.message_bottom || "";
      }
      
      console.log("Combined financial aid data:", result);
      resolve(result);
    })
    .catch(error => {
      console.error("Error fetching financial aid data:", error);
      
      // If we have at least the summary data, return that instead of failing completely
      if (Object.keys(summaryData).length > 0) {
        console.log("Returning partial financial aid data (summary only)");
        resolve(summaryData);
      } else {
        reject(error);
      }
    });
  });
}

// Add message handler for financial aid fetch
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === "testFetchFinancialAid") {
    console.log("Background script received financial aid fetch request");
    
    // Directly fetch financial aid info
    fetchFinancialAidData()
      .then(result => {
        sendResponse({
          success: true, 
          data: { financialAidInfo: result }
        });
      })
      .catch(error => {
        sendResponse({
          success: false, 
          error: error.message || "Unknown error"
        });
      });
    
    return true; // Keep the message channel open for async response
  }
});