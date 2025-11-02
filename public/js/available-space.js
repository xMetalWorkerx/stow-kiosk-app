// Get floor number from URL query parameter (default to 1)
const floor = new URLSearchParams(window.location.search).get('floor') || '1';

let spaceData = null;    // Holds the structured space data (aisles, emptyBins, bestSections)
let lastFetch = 0;       // Timestamp of the last successful data fetch
let hasActiveQueue = false; // Flag indicating if any Active Queue stations exist on this floor
let overallAvailability = {}; // Object to store overall availability per bin type { Library: %, Library Deep: % }
let binTypeColors = {}; // Object to store color category per bin type { Library: 'green'/'yellow'/'red', ... }

// WebSocket connection for real-time updates
let ws = null;
let isConnected = false;

// Initialize the WebSocket connection
function initializeWebSocket() {
    // Close existing connection if any
    if (ws) {
        ws.close();
    }
    
    // Create a new WebSocket connection
    ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
    
    // Connection opened
    ws.addEventListener('open', (event) => {
        console.log('WebSocket connection established');
        isConnected = true;
        updateConnectionStatus(true);
    });
    
    // Listen for messages
    ws.addEventListener('message', (event) => {
        try {
            const message = JSON.parse(event.data);
            handleWebSocketMessage(message);
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    });
    
    // Connection closed
    ws.addEventListener('close', (event) => {
        console.log('WebSocket connection closed');
        isConnected = false;
        updateConnectionStatus(false);
        
        // Try to reconnect after a delay with exponential backoff
        setTimeout(initializeWebSocket, 5000);
    });
    
    // Connection error
    ws.addEventListener('error', (event) => {
        console.error('WebSocket error:', event);
        isConnected = false;
        updateConnectionStatus(false);
    });
}

// Handle WebSocket messages
function handleWebSocketMessage(message) {
    if (message.type === 'availableSpaceUpdate') {
        updateAvailableSpaceUI(message.data);
    } else if (message.type === 'info') {
        console.log('WebSocket info:', message.message);
    }
}

// Update available space UI from WebSocket data
function updateAvailableSpaceUI(data) {
    const cell = document.querySelector(`[data-space-id='${data.id}']`);
    if (cell) {
        cell.innerHTML = `<span class="bin-percent ${getBinColorClass(data.percent)}">${data.percent}%</span>`;
        
        // Add highlighting effect for updated cells
        cell.classList.add('updated');
        setTimeout(() => {
            cell.classList.remove('updated');
        }, 2000);
    }
}

// Update connection status indicator
function updateConnectionStatus(connected) {
    const statusDot = document.querySelector('.status-dot');
    if (statusDot) {
        statusDot.style.backgroundColor = connected ? 'var(--success-green)' : 'var(--error-red)';
        statusDot.title = connected ? 'Connected' : 'Disconnected - Attempting to reconnect...';
    }
}

// Get the color class based on the bin percentage
function getBinColorClass(percent) {
    if (percent < 50) return 'bin-color-green';
    if (percent < 80) return 'bin-color-yellow';
    if (percent <= 100) return 'bin-color-red';
    return 'bin-color-unknown';
}

// --- WebSocket Event Handlers ---
ws.onopen = () => {
  console.log('WebSocket connection established for Available Space.');
  // Optional: Request initial data immediately via WS if backend supports it
};

ws.onmessage = (event) => {
  try {
    const message = JSON.parse(event.data);
    if (message.type === 'stations') {
      // Check if any station on this floor has status 'AQ'
      const currentAQStatus = message.data.some(s => s.status === 'AQ');
      if (currentAQStatus !== hasActiveQueue) {
          console.log(`Active Queue status changed to: ${currentAQStatus}`);
          hasActiveQueue = currentAQStatus;
          // Re-check if data needs fetching based on the new AQ status and last fetch time
          checkFetchData(); 
      }
    }
    // TODO: Handle direct space data updates via WS if implemented later
    // else if (message.type === 'spaceUpdate') { ... }
  } catch (error) {
      console.error("Error processing WebSocket message:", error);
  }
};

ws.onerror = (error) => {
    console.error('WebSocket Error:', error);
};

ws.onclose = () => {
    console.log('WebSocket connection closed.');
    // TODO: Implement reconnection logic if desired
};

// --- Data Fetching and Processing ---

// Calculates overall availability percentage for each bin type
function calculateOverallAvailability(aisles) {
    const totals = {}; // { Library: { available: 0, count: 0 }, ... }

    aisles.forEach(aisle => {
        Object.values(aisle.sections).forEach(section => {
            Object.values(section).forEach(bin => {
                if (!totals[bin.type]) {
                    totals[bin.type] = { available: 0, count: 0 };
                }
                totals[bin.type].available += bin.availability;
                totals[bin.type].count += 1;
            });
        });
    });

    const averages = {};
    for (const type in totals) {
        if (totals[type].count > 0) {
            averages[type] = Math.round(totals[type].available / totals[type].count);
        } else {
            averages[type] = 0;
        }
    }
    console.log("Overall Average Availability:", averages);
    return averages;
}

// Determines color category based on overall availability percentage
function determineBinTypeColors(availabilityAverages) {
    const colors = {};
    for (const type in availabilityAverages) {
        const avg = availabilityAverages[type];
        // Inverted logic: Low availability = green
        if (avg < 25) {        // 0-24% available = Green (nearly full)
            colors[type] = 'green';
        } else if (avg < 50) { // 25-49% available = Yellow
            colors[type] = 'yellow';
        } else {              // 50-100% available = Red (mostly empty)
            colors[type] = 'red';
        }
    }
     console.log("Bin Type Colors:", colors);
    return colors;
}

// Generates random space data as a fallback if the dummy server is unavailable
function generateRandomSpaceData(floor) {
  const numAisles = 25;
  const aisles = Array.from({ length: numAisles }, (_, i) => ({
    id: i + 1, // Keep internal ID as 1-25 for now, headers are separate
    sections: {
      100: { top: { type: 'Library', availability: Math.floor(Math.random() * 100) },
             middle: { type: 'Library Deep', availability: Math.floor(Math.random() * 100) },
             bottom: { type: 'Library', availability: Math.floor(Math.random() * 100) } },
      200: { top: { type: 'Library Deep', availability: Math.floor(Math.random() * 100) },
             middle: { type: 'Library', availability: Math.floor(Math.random() * 100) },
             bottom: { type: 'Library Deep', availability: Math.floor(Math.random() * 100) } },
      300: { top: { type: 'Library', availability: Math.floor(Math.random() * 100) },
             middle: { type: 'Library Deep', availability: Math.floor(Math.random() * 100) },
             bottom: { type: 'Library', availability: Math.floor(Math.random() * 100) } },
      400: { top: { type: 'Library Deep', availability: Math.floor(Math.random() * 100) },
             middle: { type: 'Library', availability: Math.floor(Math.random() * 100) },
             bottom: { type: 'Library Deep', availability: Math.floor(Math.random() * 100) } },
      500: { top: { type: 'Library', availability: Math.floor(Math.random() * 100) },
             middle: { type: 'Library Deep', availability: Math.floor(Math.random() * 100) },
             bottom: { type: 'Library', availability: Math.floor(Math.random() * 100) } },
      600: { top: { type: 'Library Deep', availability: Math.floor(Math.random() * 100) },
             middle: { type: 'Library', availability: Math.floor(Math.random() * 100) },
             bottom: { type: 'Library Deep', availability: Math.floor(Math.random() * 100) } },
      700: { top: { type: 'Library', availability: Math.floor(Math.random() * 100) },
             middle: { type: 'Library Deep', availability: Math.floor(Math.random() * 100) },
             bottom: { type: 'Library', availability: Math.floor(Math.random() * 100) } },
      800: { top: { type: 'Library Deep', availability: Math.floor(Math.random() * 100) },
             middle: { type: 'Library', availability: Math.floor(Math.random() * 100) },
             bottom: { type: 'Library Deep', availability: Math.floor(Math.random() * 100) } },
    }
  }));

  const emptyBins = [];
  aisles.forEach(aisle => {
    Object.entries(aisle.sections).forEach(([section, bins]) => {
      ['top', 'middle', 'bottom'].forEach(position => {
        if (bins[position].availability === 100) {
          emptyBins.push({ aisle: aisle.id, section, position, type: bins[position].type });
        }
      });
    });
  });

  const bestSections = {
    Library: { aisle: 1, section: '100', availability: 0 },
    'Library Deep': { aisle: 1, section: '100', availability: 0 }
  };
  aisles.forEach(aisle => {
    Object.entries(aisle.sections).forEach(([section, bins]) => {
      ['top', 'middle', 'bottom'].forEach(position => {
        const bin = bins[position];
        if (bestSections[bin.type] && bin.availability > bestSections[bin.type].availability) {
          bestSections[bin.type] = { aisle: aisle.id, section, availability: bin.availability };
        }
      });
    });
  });

  return { aisles, emptyBins, bestSections };
}

// Fetches space data from the backend API or generates random data
async function fetchSpaceData() {
  console.log('Fetching space data...');
  const numAislesExpected = 25;
  const columnHeaders = ['148', '146', '144', '142', '140', '138', '136', '134', '132', '130', '128', '126', '124', '122', '120', '118', '116', '114', '112', '110', '108', '106', '104', '102', '100'];

  try {
    // Attempt to fetch from the backend API endpoint
    const response = await fetch(`/api/space?floor=${floor}`);
    if (!response.ok) throw new Error(`Server response not OK: ${response.statusText}`);
    spaceData = await response.json();
    lastFetch = Date.now(); // Update last fetch time on success

    // **Important:** Add validation/padding if API data doesn't match 25 aisles
    if (!spaceData.aisles || spaceData.aisles.length !== numAislesExpected) {
        console.warn(`API returned ${spaceData.aisles?.length || 0} aisles, expected ${numAislesExpected}. Falling back to generated data.`);
        // Potentially force fallback or pad the data structure here if needed
        // For now, we'll let the fallback handle it if the API is inconsistent.
        throw new Error('API aisle count mismatch'); // Force fallback for now
    }

    // Calculate overall availability and colors AFTER fetching
    overallAvailability = calculateOverallAvailability(spaceData.aisles || []);
    binTypeColors = determineBinTypeColors(overallAvailability);
  } catch (error) {
    // If fetch fails, log a warning and generate random data
    console.warn('Backend API fetch failed or data mismatch. Generating random space data:', error.message);
    spaceData = generateRandomSpaceData(floor); // Will now generate 25 aisles
    lastFetch = Date.now(); // Update last fetch time even on fallback
    // Also calculate for random data
    overallAvailability = calculateOverallAvailability(spaceData.aisles || []);
    binTypeColors = determineBinTypeColors(overallAvailability);
  }
  renderSpaceData(); // Render the fetched or generated data
}

// Checks if data needs to be re-fetched based on the refresh interval
function checkFetchData() {
  const now = Date.now();
  // Adjust refresh interval: 15 min if AQ present, 60 min otherwise
  const interval = hasActiveQueue ? 15 * 60 * 1000 : 60 * 60 * 1000;
  // Fetch data if the interval has passed since the last fetch
  if (!lastFetch || now - lastFetch > interval) {
    fetchSpaceData();
  }
}

// --- Rendering Functions ---

// Renders the main space grid according to the new layout
function renderSpaceGrid() {
  if (!spaceData || !spaceData.aisles) {
      console.warn("No aisle data available to render grid.");
      const container = document.getElementById('space-grid-container');
      if (container) container.innerHTML = '<p class="loading-message">Loading space data...</p>';
      return;
  }
  const container = document.getElementById('space-grid-container');
  container.innerHTML = ''; // Clear previous grid
  const numAisles = spaceData.aisles.length; // Use actual data length
  const columnHeaders = ['148', '146', '144', '142', '140', '138', '136', '134', '132', '130', '128', '126', '124', '122', '120', '118', '116', '114', '112', '110', '108', '106', '104', '102', '100'];

  // Set CSS variable for the number of AISLE columns
  container.style.setProperty('--num-aisles', numAisles);
  container.style.gridTemplateColumns = `auto repeat(${numAisles}, 1fr) auto`;

  const sections = ['100', '200', '300', '400', '500', '600', '700', '800'];
  const positions = ['top', 'middle', 'bottom']; // Keep for data access order

  // 1. Create Aisle Header Row
  const headerRow = document.createElement('div');
  headerRow.className = 'grid-header-row';
  // Add empty top-left corner cell
  const cornerCell = document.createElement('div');
  cornerCell.className = 'grid-cell header-cell corner-cell';
  headerRow.appendChild(cornerCell);
  // Add Aisle header cells using the new headers
  columnHeaders.forEach((headerText, index) => {
    // Ensure we don't try to add more headers than we have aisles in the data
    if (index >= numAisles) return;
    const headerCell = document.createElement('div');
    headerCell.className = 'grid-cell header-cell aisle-header';
    headerCell.textContent = headerText;

    // Add classes for middle separation to headers too
    if (index === 11) { // Column '126' header
      headerCell.classList.add('cell-before-gap');
    }
    if (index === 12) { // Column '124' header
      headerCell.classList.add('cell-after-gap');
    }

    headerRow.appendChild(headerCell);
  });
  // Add empty top-right corner cell
  const cornerCellRight = document.createElement('div');
  cornerCellRight.className = 'grid-cell header-cell corner-cell corner-cell-right';
  headerRow.appendChild(cornerCellRight);

  container.appendChild(headerRow);

  // 2. Create Data Rows (Section by Section, Position by Position)
  sections.forEach((sectionId) => {
    positions.forEach((posKey, posIndex) => {
      const dataRow = document.createElement('div');
      dataRow.className = 'grid-data-row';

      // Shade sections 100, 300, 500, 700
      const sectionNum = parseInt(sectionId);
      if (sectionNum === 100 || sectionNum === 300 || sectionNum === 500 || sectionNum === 700) {
        dataRow.classList.add('shaded-section-row');
      }

      // Add Section Header Cell ONLY for the first position (top) of each section
      if (posIndex === 0) {
        const sectionHeaderCell = document.createElement('div');
        sectionHeaderCell.className = 'grid-cell header-cell section-header section-label-cell'; // Added section-label-cell
        sectionHeaderCell.textContent = sectionId; // Just the section number
        // Add grid-row span via style or class for CSS targeting
        sectionHeaderCell.style.gridRow = `span ${positions.length}`;
        // sectionHeaderCell.style.alignSelf = 'center'; // Prefer CSS for this
        dataRow.appendChild(sectionHeaderCell);
      } else {
        // For middle and bottom rows, we don't add the section header cell again
        // because the first one spans. The grid layout handles the alignment.
      }

      // Add Data Cells for this row
      spaceData.aisles.forEach((aisle, aisleIndex) => {
        // Make sure we have a corresponding header
        const headerIndex = aisleIndex; // Assuming aisleIndex matches header position
        if (headerIndex >= columnHeaders.length) return;

        const binData = aisle.sections[sectionId]?.[posKey];
        const dataCell = document.createElement('div');
        dataCell.className = 'grid-cell data-cell';

        // Add classes for middle separation (around header '124', which is index 12)
        if (headerIndex === 11) { // Column '126'
          dataCell.classList.add('cell-before-gap');
        }
        if (headerIndex === 12) { // Column '124'
          dataCell.classList.add('cell-after-gap');
        }

        if (binData) {
          const percentageSpan = document.createElement('span');
          percentageSpan.className = 'bin-percent';
          percentageSpan.textContent = `${binData.availability}%`;
          percentageSpan.title = `${binData.type} (${posKey}) - ${binData.availability}%`; // Keep type/pos in tooltip

          // Determine and apply color class based on individual availability
          let colorClass = 'bin-color-unknown';
          // Inverted logic: Low availability = green
          if (binData.availability < 25) {        // 0-24% available = Green
            colorClass = 'bin-color-green';
          } else if (binData.availability < 50) { // 25-49% available = Yellow
            colorClass = 'bin-color-yellow';
          } else if (binData.availability >= 50) { // 50-100% available = Red
            colorClass = 'bin-color-red';
          }
          percentageSpan.classList.add(colorClass);

          // Add bin type class (might be used for subtle styling later)
          const typeClass = binData.type.toLowerCase().replace(' ', '-');
          dataCell.classList.add(`bin-type-${typeClass}`);

          dataCell.appendChild(percentageSpan);
        } else {
          dataCell.textContent = '-';
          dataCell.classList.add('no-data');
        }
        dataRow.appendChild(dataCell);
      });

      // Add Right-Side Section Header Cell ONLY for the first position (top) of each section
      if (posIndex === 0) {
        const sectionHeaderCellRight = document.createElement('div');
        sectionHeaderCellRight.className = 'grid-cell header-cell section-header section-label-cell'; // Use same classes
        sectionHeaderCellRight.textContent = sectionId;
        sectionHeaderCellRight.style.gridRow = `span ${positions.length}`;
        // sectionHeaderCellRight.style.alignSelf = 'center'; // Handled by CSS
        dataRow.appendChild(sectionHeaderCellRight);
      }

      container.appendChild(dataRow);
    });

    // **Insert mid-grid header row after section 400**
    if (sectionId === '400') {
      const midHeaderRow = document.createElement('div');
      midHeaderRow.className = 'grid-mid-header-row';

      // Add empty mid-left corner cell
      const midCornerCellLeft = document.createElement('div');
      midCornerCellLeft.className = 'grid-cell header-cell mid-corner-cell';
      midHeaderRow.appendChild(midCornerCellLeft);

      // Add repeating Aisle header cells
      columnHeaders.forEach((headerText) => {
        const midHeaderCell = document.createElement('div');
        midHeaderCell.className = 'grid-cell header-cell mid-aisle-header';
        midHeaderCell.textContent = headerText;
        midHeaderRow.appendChild(midHeaderCell);
      });

      // Add empty mid-right corner cell
      const midCornerCellRight = document.createElement('div');
      midCornerCellRight.className = 'grid-cell header-cell mid-corner-cell';
      midHeaderRow.appendChild(midCornerCellRight);

      container.appendChild(midHeaderRow);
    }

    // No need for extra separator rows, handled by cell borders now
  });

  // **Add Bottom Header Row**
  const bottomHeaderRow = document.createElement('div');
  bottomHeaderRow.className = 'grid-bottom-header-row';

  // Add empty bottom-left corner cell
  const bottomCornerCellLeft = document.createElement('div');
  bottomCornerCellLeft.className = 'grid-cell header-cell bottom-corner-cell';
  bottomHeaderRow.appendChild(bottomCornerCellLeft);

  // Add repeating Aisle header cells
  columnHeaders.forEach((headerText) => {
    const bottomHeaderCell = document.createElement('div');
    bottomHeaderCell.className = 'grid-cell header-cell bottom-aisle-header';
    bottomHeaderCell.textContent = headerText;
    bottomHeaderRow.appendChild(bottomHeaderCell);
  });

  // Add empty bottom-right corner cell
  const bottomCornerCellRight = document.createElement('div');
  bottomCornerCellRight.className = 'grid-cell header-cell bottom-corner-cell';
  bottomHeaderRow.appendChild(bottomCornerCellRight);

  container.appendChild(bottomHeaderRow);
}

// Renders the additional info boxes (Empty Bins, Best Sections)
function renderInfoBoxes() {
  if (!spaceData) return;

  // Render Empty Bins
  const emptyBinsContainer = document.getElementById('empty-bins');
  if (emptyBinsContainer) {
      emptyBinsContainer.innerHTML = '<h3>Nearby Empty Bins</h3>';
      if (spaceData.emptyBins && spaceData.emptyBins.length > 0) {
          const list = document.createElement('ul');
          spaceData.emptyBins.slice(0, 5).forEach(bin => { // Limit display
              const item = document.createElement('li');
              item.textContent = `A${bin.aisle} S${bin.section} ${bin.position.charAt(0).toUpperCase()} (${bin.type})`;
              list.appendChild(item);
          });
          emptyBinsContainer.appendChild(list);
      } else {
          emptyBinsContainer.innerHTML += '<p>None nearby.</p>';
      }
  }

  // Render Overall Availability (Replaces Best Sections)
  const overallAvailabilityContainer = document.getElementById('best-sections'); // Re-use the element
  if (overallAvailabilityContainer) {
      overallAvailabilityContainer.innerHTML = '<h3>Overall Availability</h3>';
      if (overallAvailability && Object.keys(overallAvailability).length > 0) {
          const list = document.createElement('ul');
          Object.entries(overallAvailability).forEach(([type, avg]) => {
              const item = document.createElement('li');
              const color = binTypeColors[type] || 'unknown';
              // Use innerHTML to allow for swatch styling
              item.innerHTML = `<span class="color-swatch ${color}"></span> ${type}: <strong>${avg}%</strong>`;
              item.title = `Overall Avg Category: ${color}`; // Tooltip for color
              list.appendChild(item);
          });
          overallAvailabilityContainer.appendChild(list);
      } else {
           overallAvailabilityContainer.innerHTML += '<p>No data.</p>';
      }
  }
}

// Main render function called after fetching data
function renderSpaceData() {
  if (!spaceData) {
      console.warn("renderSpaceData called but spaceData is null.");
      // Optionally display a loading or error message on the page
      const container = document.getElementById('space-grid-container');
      if (container) container.innerHTML = '<p class="loading-message">Loading space data...</p>';
      return;
  }
  console.log("Rendering space data...");
  renderSpaceGrid();
  renderInfoBoxes();
}

// --- Initial Load & Interval Check ---

document.addEventListener('DOMContentLoaded', () => {
    // Initialize WebSocket connection
    initializeWebSocket();
    
    // Rest of your existing initialization code...
}); 