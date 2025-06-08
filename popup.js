document.addEventListener('DOMContentLoaded', function() {
  // Get references to UI elements
  const fetchAllButton = document.getElementById('fetchAllButton');
  const nameValue = document.getElementById('nameValue');
  const dobValue = document.getElementById('dobValue');
  const degreeValue = document.getElementById('degreeValue');
  const progressValue = document.getElementById('progressValue');
  const status = document.getElementById('status');
  const termValue = document.getElementById('termValue');
  const courseList = document.getElementById('courseList');
  
  // Test bio fetch button
  const testDirectFetchButton = document.getElementById('testDirectFetchButton');
  const fetchTestResult = document.getElementById('fetchTestResult');
  
  // Test degree fetch button
  const testDegreeFetchButton = document.getElementById('testDegreeFetchButton');
  const degreeFetchTestResult = document.getElementById('degreeFetchTestResult');
  
  // Test schedule fetch button
  const testScheduleFetchButton = document.getElementById('testScheduleFetchButton');
  const scheduleFetchTestResult = document.getElementById('scheduleFetchTestResult');
  
  // Test financial aid fetch button
  const testFinancialAidFetchButton = document.getElementById('testFinancialAidFetchButton');
  const financialAidFetchTestResult = document.getElementById('financialAidFetchTestResult');
  const aidYearValue = document.getElementById('aidYearValue');
  const budgetValue = document.getElementById('budgetValue');
  const contributionValue = document.getElementById('contributionValue');
  const needValue = document.getElementById('needValue');
  const totalAidValue = document.getElementById('totalAidValue');
  const remainingNeedValue = document.getElementById('remainingNeedValue');
  
  // Add export button references
  const exportCSVBtn = document.getElementById('exportCSV');
  const exportJSONBtn = document.getElementById('exportJSON');
  const exportGoogleSheetBtn = document.getElementById('exportGoogleSheet');
  const exportStatus = document.getElementById('exportStatus');

  // Debug check if buttons exist
  console.log('Buttons found:', {
    fetchAll: !!fetchAllButton,
    bio: !!testDirectFetchButton,
    degree: !!testDegreeFetchButton,
    financial: !!testFinancialAidFetchButton,
    exportCSV: !!exportCSVBtn,
    exportJSON: !!exportJSONBtn,
    exportSheets: !!exportGoogleSheetBtn
  });
  
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
      // Schedule data changes are handled separately
      if (changes.scheduleData) {
        displayScheduleData(changes.scheduleData.newValue);
      }
      // Financial aid data changes
      if (changes.financialAidData) {
        updateFinancialAidDisplay(changes.financialAidData.newValue);
      }
    }
  });
  
  // Load any previously fetched data
  chrome.storage.local.get(['name', 'dob', 'degreeName', 'creditProgress', 'scheduleData', 'financialAidData'], function(result) {
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
    if (result.scheduleData) {
      displayScheduleData(result.scheduleData);
    }
    if (result.financialAidData) {
      updateFinancialAidDisplay(result.financialAidData);
    }
  });
  
  // Fetch All Information button
  if (fetchAllButton) {
    fetchAllButton.addEventListener('click', function() {
      status.textContent = 'Fetching all information...';
      fetchAllButton.disabled = true;
      
      // Send message to background script to do the fetch
      chrome.runtime.sendMessage({
        action: "extractAll" // We're keeping the message name for compatibility
      }, function(response) {
        if (response && response.started) {
          status.textContent = 'Fetch process started...';
        } else {
          status.textContent = 'Error starting fetch process.';
          fetchAllButton.disabled = false;
        }
      });
    });
  }
  
  // Listen for progress updates
  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.type === "extractionProgress") {
      status.textContent = message.status;
      
      // Re-enable the button when complete
      if (message.complete && fetchAllButton) {
        fetchAllButton.disabled = false;
      }
    }
  });
  
  // Test bio fetch button
  if (testDirectFetchButton) {
    testDirectFetchButton.addEventListener('click', function() {
      testDirectFetchButton.disabled = true;
      if (fetchTestResult) fetchTestResult.style.display = 'none';
      status.textContent = 'Fetching biographical information...';
      
      chrome.runtime.sendMessage({
        action: "testFetchBio"
      }, function(response) {
        testDirectFetchButton.disabled = false;
        
        if (response && response.success) {
          // Show the raw data in the test result area
          if (fetchTestResult) {
            const pre = fetchTestResult.querySelector('pre');
            if (pre) {
              pre.textContent = JSON.stringify(response.data, null, 2);
              fetchTestResult.style.display = 'block';
            }
          }
          status.textContent = 'Biographical information fetched successfully!';
          
          // Update the main display values
          if (response.data.formattedName && nameValue) {
            nameValue.textContent = response.data.formattedName;
            chrome.storage.local.set({ name: response.data.formattedName });
          }
          
          if (response.data.dob && dobValue) {
            dobValue.textContent = response.data.dob;
            chrome.storage.local.set({ dob: response.data.dob });
          }
        } else {
          status.textContent = 'Bio fetch failed: ' + (response?.error || 'Unknown error');
          if (fetchTestResult) {
            const pre = fetchTestResult.querySelector('pre');
            if (pre) {
              pre.textContent = 'Error: ' + (response?.error || 'Unknown error');
              fetchTestResult.style.display = 'block';
            }
          }
        }
      });
    });
  }

  // Test degree fetch button
  if (testDegreeFetchButton) {
    testDegreeFetchButton.addEventListener('click', function() {
      testDegreeFetchButton.disabled = true;
      if (degreeFetchTestResult) degreeFetchTestResult.style.display = 'none';
      status.textContent = 'Fetching degree information...';
      
      chrome.runtime.sendMessage({
        action: "testFetchDegree"
      }, function(response) {
        testDegreeFetchButton.disabled = false;
        
        if (response && response.success) {
          // Show the raw data in the test result area
          if (degreeFetchTestResult) {
            const pre = degreeFetchTestResult.querySelector('pre');
            if (pre) {
              pre.textContent = JSON.stringify(response.data, null, 2);
              degreeFetchTestResult.style.display = 'block';
            }
          }
          status.textContent = 'Degree information fetched successfully!';
          
          // Update the main display values
          if (response.data.extractedInfo && response.data.extractedInfo.degreeName && degreeValue) {
            degreeValue.textContent = response.data.extractedInfo.degreeName;
            chrome.storage.local.set({ degreeName: response.data.extractedInfo.degreeName });
          }
          
          if (response.data.extractedInfo && response.data.extractedInfo.creditProgress && progressValue) {
            progressValue.textContent = response.data.extractedInfo.creditProgress;
            chrome.storage.local.set({ creditProgress: response.data.extractedInfo.creditProgress });
          }
        } else {
          status.textContent = 'Degree fetch failed: ' + (response?.error || 'Unknown error');
          if (degreeFetchTestResult) {
            const pre = degreeFetchTestResult.querySelector('pre');
            if (pre) {
              pre.textContent = 'Error: ' + (response?.error || 'Unknown error');
              degreeFetchTestResult.style.display = 'block';
            }
          }
        }
      });
    });
  }
  
  // Test schedule fetch button
  if (testScheduleFetchButton) {
    testScheduleFetchButton.addEventListener('click', function() {
      testScheduleFetchButton.disabled = true;
      if (scheduleFetchTestResult) scheduleFetchTestResult.style.display = 'none';
      status.textContent = 'Fetching schedule information...';
      
      chrome.runtime.sendMessage({
        action: "testFetchSchedule"
      }, function(response) {
        testScheduleFetchButton.disabled = false;
        
        if (response && response.success) {
          // Show the raw data in the test result area
          if (scheduleFetchTestResult) {
            const pre = scheduleFetchTestResult.querySelector('pre');
            if (pre) {
              pre.textContent = JSON.stringify(response.data, null, 2);
              scheduleFetchTestResult.style.display = 'block';
            }
          }
          status.textContent = 'Schedule information fetched successfully!';
          
          // Update the schedule display
          if (response.data && response.data.scheduleInfo) {
            displayScheduleData(response.data.scheduleInfo);
            chrome.storage.local.set({ scheduleData: response.data.scheduleInfo });
          }
        } else {
          status.textContent = 'Schedule fetch failed: ' + (response?.error || 'Unknown error');
          if (scheduleFetchTestResult) {
            const pre = scheduleFetchTestResult.querySelector('pre');
            if (pre) {
              pre.textContent = 'Error: ' + (response?.error || 'Unknown error');
              scheduleFetchTestResult.style.display = 'block';
            }
          }
        }
      });
    });
  }
  
  // Test financial aid fetch button
  if (testFinancialAidFetchButton) {
    testFinancialAidFetchButton.addEventListener('click', function() {
      testFinancialAidFetchButton.disabled = true;
      if (financialAidFetchTestResult) financialAidFetchTestResult.style.display = 'none';
      status.textContent = 'Fetching financial aid information...';
      
      chrome.runtime.sendMessage({
        action: "testFetchFinancialAid"
      }, function(response) {
        testFinancialAidFetchButton.disabled = false;
        
        if (response && response.success) {
          // Show the raw data in the test result area
          if (financialAidFetchTestResult) {
            const pre = financialAidFetchTestResult.querySelector('pre');
            if (pre) {
              pre.textContent = JSON.stringify(response.data, null, 2);
              financialAidFetchTestResult.style.display = 'block';
            }
          }
          status.textContent = 'Financial aid information fetched successfully!';
          
          // Update the display with the data
          if (response.data && response.data.financialAidInfo) {
            updateFinancialAidDisplay(response.data.financialAidInfo);
            
            // Save to storage
            chrome.storage.local.set({
              financialAidData: response.data.financialAidInfo
            });
          }
        } else {
          status.textContent = 'Financial aid fetch failed: ' + (response?.error || 'Unknown error');
          if (financialAidFetchTestResult) {
            const pre = financialAidFetchTestResult.querySelector('pre');
            if (pre) {
              pre.textContent = 'Error: ' + (response?.error || 'Unknown error');
              financialAidFetchTestResult.style.display = 'block';
            }
          }
        }
      });
    });
  }
  
  // Add a helper function to format currency
  function formatCurrency(value) {
    if (value === null || value === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  }
  
  // Function to display schedule data in the popup
  function displayScheduleData(scheduleData) {
    console.log("Displaying schedule data:", scheduleData);
    
    // Display term
    if (scheduleData.currentTerm && termValue) {
      termValue.textContent = scheduleData.currentTerm;
    }
    
    // Clear and display courses
    if (courseList) {
      courseList.innerHTML = '';  // Clear existing content
      
      if (scheduleData.courses && scheduleData.courses.length > 0) {
        scheduleData.courses.forEach(course => {
          const courseDiv = document.createElement('div');
          courseDiv.className = 'course-item';
          
          // Basic course info
          courseDiv.innerHTML = `
            <strong>${course.subject}${course.catalogNumber}: ${course.description}</strong>
            <div class="small">Class #: ${course.classNumber}</div>
            <div class="small">Units: ${course.units}</div>
            <div class="small">Dates: ${course.startDate || 'N/A'} to ${course.endDate || 'N/A'}</div>
          `;
          
          // Add meetings if they exist
          if (course.meetings && course.meetings.length > 0) {
            const meetingsDiv = document.createElement('div');
            meetingsDiv.className = 'meetings-list';
            
            course.meetings.forEach(meeting => {
              const meetingDiv = document.createElement('div');
              meetingDiv.className = 'meeting-item';
              meetingDiv.innerHTML = `
                <div class="small">${meeting.days || 'N/A'}: ${meeting.startTime || 'N/A'} - ${meeting.endTime || 'N/A'}</div>
                <div class="small">Instructor: ${meeting.instructor || 'N/A'}</div>
                <div class="small">Location: ${meeting.location || 'N/A'}</div>
              `;
              meetingsDiv.appendChild(meetingDiv);
            });
            
            courseDiv.appendChild(meetingsDiv);
          }
          
          courseList.appendChild(courseDiv);
        });
      } else {
        courseList.innerHTML = '<p class="text-muted">No courses found</p>';
      }
    }
  }
  
  // Update financial aid display
  function updateFinancialAidDisplay(data) {
    // Update the main summary fields
    if (aidYearValue) aidYearValue.textContent = data.aidYear || 'N/A';
    if (budgetValue) budgetValue.textContent = formatCurrency(data.estimatedBudget);
    if (contributionValue) contributionValue.textContent = formatCurrency(data.familyContribution);
    if (needValue) needValue.textContent = formatCurrency(data.estimatedNeed);
    if (totalAidValue) totalAidValue.textContent = formatCurrency(data.totalAid);
    if (remainingNeedValue) remainingNeedValue.textContent = formatCurrency(data.remainingNeed);
    
    // Get the budget details container
    const budgetDetailsContainer = document.getElementById('budgetDetailsContainer');
    if (!budgetDetailsContainer || !data.budgetDetails) return;
    
    // Clear existing content
    budgetDetailsContainer.innerHTML = '';
    
    // Create the budget details UI
    if (data.budgetDetails.terms && data.budgetDetails.terms.length > 0) {
      // Add a description
      if (data.budgetDetails.messageTop) {
        const messageTop = document.createElement('p');
        messageTop.className = 'small';
        messageTop.textContent = data.budgetDetails.messageTop;
        budgetDetailsContainer.appendChild(messageTop);
      }
      
      // Create a table for each term
      data.budgetDetails.terms.forEach(term => {
        // Only show terms with items or non-zero total
        if ((term.items && term.items.length > 0) && term.termTotal > 0) {
          // Create term header
          const termHeader = document.createElement('h4');
          termHeader.className = 'term-header';
          termHeader.textContent = term.term;
          budgetDetailsContainer.appendChild(termHeader);
          
          // Create term table
          const table = document.createElement('table');
          table.className = 'budget-table';
          
          // Add header row
          const headerRow = document.createElement('tr');
          const descHeader = document.createElement('th');
          descHeader.textContent = 'Category';
          const amountHeader = document.createElement('th');
          amountHeader.textContent = 'Amount';
          headerRow.appendChild(descHeader);
          headerRow.appendChild(amountHeader);
          table.appendChild(headerRow);
          
          // Add item rows
          term.items.forEach(item => {
            if (item.description) {
              const row = document.createElement('tr');
              const descCell = document.createElement('td');
              descCell.textContent = item.description;
              const amountCell = document.createElement('td');
              amountCell.textContent = formatCurrency(item.amount);
              amountCell.className = 'amount';
              row.appendChild(descCell);
              row.appendChild(amountCell);
              table.appendChild(row);
            }
          });
          
          // Add term total row
          const totalRow = document.createElement('tr');
          totalRow.className = 'total-row';
          const totalLabelCell = document.createElement('td');
          totalLabelCell.textContent = 'Term Total';
          totalLabelCell.className = 'total-label';
          const totalAmountCell = document.createElement('td');
          totalAmountCell.textContent = formatCurrency(term.termTotal);
          totalAmountCell.className = 'total-amount';
          totalRow.appendChild(totalLabelCell);
          totalRow.appendChild(totalAmountCell);
          table.appendChild(totalRow);
          
          budgetDetailsContainer.appendChild(table);
        }
      });
      
      // Add the total cost row
      const totalCostDiv = document.createElement('div');
      totalCostDiv.className = 'total-cost';
      totalCostDiv.innerHTML = `<span class="label">Total Estimated Cost:</span> <span class="value">${formatCurrency(data.budgetDetails.totalCost)}</span>`;
      budgetDetailsContainer.appendChild(totalCostDiv);
      
      // Add bottom message if available
      if (data.budgetDetails.messageBottom) {
        const messageBottom = document.createElement('p');
        messageBottom.className = 'small';
        messageBottom.textContent = data.budgetDetails.messageBottom;
        budgetDetailsContainer.appendChild(messageBottom);
      }
    } else {
      budgetDetailsContainer.innerHTML = '<p>No detailed budget information available.</p>';
    }
  }
  
  // Add this to your existing storage loading code
  chrome.storage.local.get(['financialAidData'], function(result) {
    if (result.financialAidData) {
      updateFinancialAidDisplay(result.financialAidData);
    }
  });
  
  // Add export button event listeners
  if (exportCSVBtn) {
    exportCSVBtn.addEventListener('click', function() {
      console.log('CSV export clicked');
      this.disabled = true;
      exportToCSV().then(() => {
        console.log('CSV export completed');
        exportStatus.textContent = 'CSV exported successfully!';
        this.disabled = false;
      }).catch(error => {
        console.error('CSV export error:', error);
        exportStatus.textContent = 'Error exporting CSV: ' + error.message;
        this.disabled = false;
      });
    });
  }

  if (exportJSONBtn) {
    exportJSONBtn.addEventListener('click', function() {
      console.log('JSON export clicked');
      this.disabled = true;
      exportToJSON().then(() => {
        console.log('JSON export completed');
        exportStatus.textContent = 'JSON exported successfully!';
        this.disabled = false;
      }).catch(error => {
        console.error('JSON export error:', error);
        exportStatus.textContent = 'Error exporting JSON: ' + error.message;
        this.disabled = false;
      });
    });
  }

  if (exportGoogleSheetBtn) {
    exportGoogleSheetBtn.addEventListener('click', async function() {
      console.log('Google Sheets export clicked');
      this.disabled = true;
      exportStatus.textContent = 'Exporting to Google Sheets...';
      
      try {
        await exportToGoogleSheets();
        exportStatus.textContent = 'Successfully exported to Google Sheets!';
      } catch (error) {
        console.error('Export error:', error);
        exportStatus.textContent = 'Error exporting to Google Sheets: ' + error.message;
      } finally {
        this.disabled = false;
      }
    });
  }

  // Keep these helper functions outside the DOMContentLoaded listener
  async function getAllStoredData() {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (data) => {
        resolve({
          personalInfo: {
            name: data.name || 'N/A',
            dob: data.dob || 'N/A'
          },
          academicInfo: {
            degreeName: data.degreeName || 'N/A',
            creditProgress: data.creditProgress || 'N/A'
          },
          schedule: data.scheduleData || { currentTerm: 'N/A', courses: [] },
          financialAid: {
            aidYear: data.financialAidData?.aidYear || 'N/A',
            estimatedBudget: data.financialAidData?.estimatedBudget || 'N/A',
            familyContribution: data.financialAidData?.familyContribution || 'N/A',
            estimatedNeed: data.financialAidData?.estimatedNeed || 'N/A',
            totalAid: data.financialAidData?.totalAid || 'N/A',
            remainingNeed: data.financialAidData?.remainingNeed || 'N/A'
          }
        });
      });
    });
  }

  // Function to export data as CSV
  async function exportToCSV() {
    const data = await getAllStoredData();
    let csvContent = 'Category,Field,Value\n';
    
    // Personal Information
    csvContent += `Personal,Name,${data.personalInfo.name}\n`;
    csvContent += `Personal,Date of Birth,${data.personalInfo.dob}\n`;
    
    // Academic Information
    csvContent += `Academic,Degree,${data.academicInfo.degreeName}\n`;
    csvContent += `Academic,Credit Progress,${data.academicInfo.creditProgress}\n`;
    
    // Financial Aid
    csvContent += `Financial Aid,Aid Year,${data.financialAid.aidYear}\n`;
    csvContent += `Financial Aid,Estimated Budget,${data.financialAid.estimatedBudget}\n`;
    csvContent += `Financial Aid,Family Contribution,${data.financialAid.familyContribution}\n`;
    csvContent += `Financial Aid,Estimated Need,${data.financialAid.estimatedNeed}\n`;
    csvContent += `Financial Aid,Total Aid,${data.financialAid.totalAid}\n`;
    csvContent += `Financial Aid,Remaining Need,${data.financialAid.remainingNeed}\n`;
    
    // Schedule
    csvContent += `Schedule,Current Term,${data.schedule.currentTerm}\n`;
    data.schedule.courses?.forEach((course, index) => {
      csvContent += `Schedule,Course ${index + 1},${course.subject}${course.catalogNumber} - ${course.description}\n`;
      csvContent += `Schedule,Units,${course.units}\n`;
      course.meetings?.forEach((meeting, mIndex) => {
        csvContent += `Schedule,Meeting ${mIndex + 1},${meeting.days} ${meeting.startTime}-${meeting.endTime}\n`;
      });
    });
    
    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ctclink_data.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  // Function to export data as JSON
  async function exportToJSON() {
    const data = await getAllStoredData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ctclink_data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  // Function to export to Google Sheets
  async function exportToGoogleSheets() {
    try {
      console.log('Starting Google Sheets export...');
      const token = await new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
          if (chrome.runtime.lastError) {
            reject(new Error(`Authentication failed: ${chrome.runtime.lastError.message}`));
            return;
          }
          resolve(token);
        });
      });

      const data = await getAllStoredData();
      
      // Prepare all rows including schedule and financial aid data
      const rows = [
        // Headers
        {values: [
          {userEnteredValue: {stringValue: 'Category'}},
          {userEnteredValue: {stringValue: 'Field'}},
          {userEnteredValue: {stringValue: 'Value'}}
        ]},
        // Personal Info
        {values: [
          {userEnteredValue: {stringValue: 'Personal'}},
          {userEnteredValue: {stringValue: 'Name'}},
          {userEnteredValue: {stringValue: data.personalInfo.name}}
        ]},
        {values: [
          {userEnteredValue: {stringValue: 'Personal'}},
          {userEnteredValue: {stringValue: 'DOB'}},
          {userEnteredValue: {stringValue: data.personalInfo.dob}}
        ]},
        // Academic Info
        {values: [
          {userEnteredValue: {stringValue: 'Academic'}},
          {userEnteredValue: {stringValue: 'Degree'}},
          {userEnteredValue: {stringValue: data.academicInfo.degreeName}}
        ]},
        {values: [
          {userEnteredValue: {stringValue: 'Academic'}},
          {userEnteredValue: {stringValue: 'Progress'}},
          {userEnteredValue: {stringValue: data.academicInfo.creditProgress}}
        ]},
        // Schedule Info
        {values: [
          {userEnteredValue: {stringValue: 'Schedule'}},
          {userEnteredValue: {stringValue: 'Term'}},
          {userEnteredValue: {stringValue: data.schedule.currentTerm}}
        ]}
      ];

      // Add courses
      if (data.schedule.courses) {
        data.schedule.courses.forEach((course, index) => {
          rows.push({
            values: [
              {userEnteredValue: {stringValue: 'Course ' + (index + 1)}},
              {userEnteredValue: {stringValue: 'Name'}},
              {userEnteredValue: {stringValue: `${course.subject}${course.catalogNumber} - ${course.description}`}}
            ]
          });
          rows.push({
            values: [
              {userEnteredValue: {stringValue: 'Course ' + (index + 1)}},
              {userEnteredValue: {stringValue: 'Units'}},
              {userEnteredValue: {stringValue: course.units.toString()}}
            ]
          });
          if (course.meetings) {
            course.meetings.forEach((meeting, mIndex) => {
              rows.push({
                values: [
                  {userEnteredValue: {stringValue: 'Course ' + (index + 1)}},
                  {userEnteredValue: {stringValue: `Meeting ${mIndex + 1}`}},
                  {userEnteredValue: {stringValue: `${meeting.days} ${meeting.startTime}-${meeting.endTime}, ${meeting.location}`}}
                ]
              });
            });
          }
        });
      }

      // Financial Aid Info
      rows.push(
        {values: [
          {userEnteredValue: {stringValue: 'Financial Aid'}},
          {userEnteredValue: {stringValue: 'Aid Year'}},
          {userEnteredValue: {stringValue: data.financialAid.aidYear}}
        ]},
        {values: [
          {userEnteredValue: {stringValue: 'Financial Aid'}},
          {userEnteredValue: {stringValue: 'Estimated Budget'}},
          {userEnteredValue: {stringValue: data.financialAid.estimatedBudget}}
        ]},
        {values: [
          {userEnteredValue: {stringValue: 'Financial Aid'}},
          {userEnteredValue: {stringValue: 'Family Contribution'}},
          {userEnteredValue: {stringValue: data.financialAid.familyContribution}}
        ]},
        {values: [
          {userEnteredValue: {stringValue: 'Financial Aid'}},
          {userEnteredValue: {stringValue: 'Estimated Need'}},
          {userEnteredValue: {stringValue: data.financialAid.estimatedNeed}}
        ]},
        {values: [
          {userEnteredValue: {stringValue: 'Financial Aid'}},
          {userEnteredValue: {stringValue: 'Total Aid'}},
          {userEnteredValue: {stringValue: data.financialAid.totalAid}}
        ]},
        {values: [
          {userEnteredValue: {stringValue: 'Financial Aid'}},
          {userEnteredValue: {stringValue: 'Remaining Need'}},
          {userEnteredValue: {stringValue: data.financialAid.remainingNeed}}
        ]}
      );

      const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          properties: {
            title: 'CTCLink Data Export'
          },
          sheets: [{
            properties: {
              title: 'Student Data',
              gridProperties: {
                frozenRowCount: 1
              }
            },
            data: [{
              startRow: 0,
              startColumn: 0,
              rowData: rows
            }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const result = await response.json();
      window.open(`https://docs.google.com/spreadsheets/d/${result.spreadsheetId}`);
      return true;

    } catch (error) {
      console.error('Detailed export error:', error);
      throw error;
    }
  }
});