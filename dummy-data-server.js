/*
 * Dummy Data Server for Stow Kiosk Available Space Screen
 * Provides simulated space availability data on port 3001.
 * Used when real backend data source is unavailable or for testing.
 * - Endpoint: GET /api/space?floor=<floor_number>
 * - Returns random availability data structured as { aisles, emptyBins, bestSections }.
 * - Run separately using `npm run dummy-data`.
 */
const express = require('express');
const app = express();
const PORT = 3001;

app.use(express.json());

// Generates random space data for a given floor
const generateSpaceData = (floor) => {
  // Generate 12 aisles with random availability for different bin types/positions
  const aisles = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
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

  // Calculate nearby empty bins (100% availability)
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

  // Determine the best sections (highest availability) for each bin type
  const bestSections = {
    Library: { aisle: 1, section: '100', availability: 0 },
    'Library Deep': { aisle: 1, section: '100', availability: 0 }
  };
  aisles.forEach(aisle => {
    Object.entries(aisle.sections).forEach(([section, bins]) => {
      ['top', 'middle', 'bottom'].forEach(position => {
        const bin = bins[position];
        if (bin.availability > bestSections[bin.type].availability) {
          bestSections[bin.type] = { aisle: aisle.id, section, availability: bin.availability };
        }
      });
    });
  });

  return { aisles, emptyBins, bestSections };
};

// API endpoint to get space data
app.get('/api/space', (req, res) => {
  const floor = req.query.floor || '1';
  res.json(generateSpaceData(floor));
});

app.listen(PORT, () => {
  console.log(`Dummy data server running on port ${PORT}`);
}); 