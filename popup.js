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
});