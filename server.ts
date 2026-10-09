import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
  try {
    aiClient = new GoogleGenAI({ apiKey });
  } catch (err) {
    console.warn('Failed to initialize GoogleGenAI with key:', err);
  }
}

// POST /api/driver-guidance - AI Emergency Ambulance Driver Copilot
app.post('/api/driver-guidance', async (req, res) => {
  try {
    const {
      origin = 'Origin Station',
      destination = 'Emergency Hospital',
      distanceKm = 5.2,
      remainingDistanceKm = 4.1,
      speedKmh = 65,
      etaMin = 6,
      corridorActive = true,
      heavyTraffic = false,
      blocked = false,
      priority = 'Critical (Code Red)',
      queryType = 'tactical_briefing',
      driverQuestion = '',
      currentPhase = 'running',
    } = req.body;

    if (aiClient) {
      try {
        const prompt = `You are MARGAM AI Copilot, a high-priority emergency vehicle navigation and tactical driving advisory system communicating directly with the driver and paramedic of AMBULANCE-01.
Current situation:
- Origin: ${origin}
- Destination: ${destination}
- Road distance remaining: ${remainingDistanceKm} km (out of ${distanceKm} km total)
- Current speed: ${speedKmh} km/h
- ETA to hospital: ${etaMin} minutes
- Transit Phase: ${currentPhase}
- Green signal corridor: ${corridorActive ? 'ENGAGED & PREEMPTING SIGNALS' : 'STANDBY'}
- Traffic congestion: ${heavyTraffic ? 'HIGH CONGESTION' : 'MODERATE / MANAGED'}
- Incident / Blockage on path: ${blocked ? 'ROAD INCIDENT DETECTED - DETOUR ENGAGED' : 'PATH CLEAR'}
- Patient Priority: ${priority}
- Request type: ${queryType}
${driverQuestion ? `- Driver's specific radio question: "${driverQuestion}"` : ''}

Provide a JSON object with:
1. "primaryDirective": One concise, urgent, tactical command for the driver (maximum 15 words, e.g. "Maintain center lane at 65 km/h; upcoming intersection S-2 is holding green.")
2. "speedAdvisory": Recommended transit speed advice (e.g. "Optimal speed 65 km/h — clear corridor ahead" or "Reduce to 40 km/h for detour curve")
3. "lanePositioning": Best lane choice (e.g. "Hold center-left lane to bypass bus lane merge")
4. "hazardAlert": Immediate road hazard, merge warning, or pedestrian zone
5. "patientStabilityNote": Clinical transit advice for driver (smooth linear braking, G-force avoidance)
6. "spokenCallout": A natural, spoken audio announcement for hands-free driver audio dispatch (under 25 words).
7. "turnInstructions": An array of 3 to 5 chronological step maneuvers for the driver along this route. Each item must have:
   - "instruction": concise driving direction (e.g. "Depart station via Main Arterial", "Continue straight through Green Wave junction S-2", "Take right bypass onto Expressway", "Decelerate smoothly at Hospital Emergency Bay 2")
   - "distance": string distance (e.g. "300m", "1.2 km", "400m")
   - "action": one of "depart" | "straight" | "turn-left" | "turn-right" | "detour" | "arrive"
${driverQuestion ? '8. "driverAnswer": Direct, helpful in-vehicle answer to the driver\'s question (under 30 words).' : ''}

Respond ONLY with valid JSON.`;

        const geminiPromise = aiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        });
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4500));
        const response: any = await Promise.race([geminiPromise, timeoutPromise]);

        if (response && response.text) {
          try {
            const parsed = JSON.parse(response.text);
            return res.json({ success: true, guidance: parsed, source: 'gemini' });
          } catch {
            // Fall through to fallback
          }
        }
      } catch (geminiErr) {
        console.warn('Gemini request failed, using tactical engine fallback:', geminiErr);
      }
    }

    // High-quality situational tactical fallback
    const fallbackGuidance = {
      primaryDirective: blocked
        ? 'Detour active: Turn right into Parallel Express Avenue in 150m to bypass blockage.'
        : corridorActive
        ? `Maintain center corridor at ${speedKmh} km/h. Traffic signals preempted green to ${destination}.`
        : `Navigate arterial corridor toward ${destination}. Siren active, maintain defensive clearance.`,
      speedAdvisory: blocked
        ? 'Decelerate to 45 km/h through detour transition curve.'
        : corridorActive
        ? `Optimal emergency cruise at ${speedKmh} km/h — green wave active.`
        : 'Hold 50 km/h due to cross-traffic awareness.',
      lanePositioning: 'Maintain center lane to ensure visibility for merging civilian traffic.',
      hazardAlert: blocked
        ? 'Caution: Incident response vehicles operating on previous main lane.'
        : heavyTraffic
        ? 'Civilian vehicles yielding to right shoulder at upcoming flyover.'
        : 'All major intersection signals holding green for AMBULANCE-01.',
      patientStabilityNote: 'Maintain smooth linear braking when approaching hospital trauma intake bay.',
      spokenCallout: blocked
        ? `Driver alert: Detour engaged around road obstruction. Proceed at 45 km per hour into bypass.`
        : `Green corridor engaged to ${destination}. Clear for ${speedKmh} kilometers per hour.`,
      turnInstructions: [
        {
          instruction: `Depart origin from ${origin} with sirens and optical beacons active`,
          distance: '200m',
          action: 'depart',
        },
        {
          instruction: blocked
            ? 'Execute detour: Veer right onto Secondary Ring Arterial'
            : 'Pass through Signal Node S-1 with preemption active',
          distance: '850m',
          action: blocked ? 'detour' : 'straight',
        },
        {
          instruction: corridorActive
            ? 'Maintain corridor alignment through automated Green Wave zone'
            : 'Proceed with defensive horn at major intersection',
          distance: '1.4 km',
          action: 'straight',
        },
        {
          instruction: `Arrive at ${destination} Trauma Care Center Intake Bay 2`,
          distance: '300m',
          action: 'arrive',
        },
      ],
      driverAnswer: driverQuestion
        ? `Advisory for "${driverQuestion}": Emergency corridor has highest preemption priority. Maintain active speed and defensive horn clearance.`
        : undefined,
    };

    return res.json({ success: true, guidance: fallbackGuidance, source: 'local_engine' });
  } catch (error) {
    console.error('Driver guidance error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate guidance',
    });
  }
});

// Polyline decoder for Google Routes API
function decodeGooglePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([Number((lat / 1e5).toFixed(5)), Number((lng / 1e5).toFixed(5))]);
  }
  return points;
}

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// GET /api/maps-status - Check if Google Maps API key is configured
app.get('/api/maps-status', (_req, res) => {
  const hasEnvKey = Boolean(
    process.env.VITE_USER_GOOGLE_MAPS_KEY ||
    (process.env.VITE_GOOGLE_MAPS_API_KEY && process.env.VITE_GOOGLE_MAPS_API_KEY !== 'MY_GOOGLE_MAPS_API_KEY')
  );
  res.json({ configured: hasEnvKey });
});

// POST /api/validate-maps-key - Test user-entered Google Maps API key
app.post('/api/validate-maps-key', async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 15) {
      return res.json({ valid: false, message: 'Invalid API key format.' });
    }

    // Test the key against Google Geocoding API with a lightweight test query
    const testUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=Hyderabad&key=${encodeURIComponent(apiKey)}`;
    const testRes = await fetch(testUrl);
    const data = await testRes.json();

    if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
      return res.json({ valid: true, message: 'Google Maps API Key is active and authorized!' });
    }

    if (data.status === 'REQUEST_DENIED') {
      return res.json({
        valid: false,
        message: data.error_message || 'API key request denied. Please ensure Billing is enabled on the Google Cloud project and Maps JavaScript API is activated.',
      });
    }

    if (data.status === 'OVER_QUERY_LIMIT') {
      return res.json({
        valid: false,
        message: 'Google Maps API quota exceeded on this key.',
      });
    }

    return res.json({
      valid: false,
      message: data.error_message || `Google Maps returned status: ${data.status}`,
    });
  } catch (err: any) {
    return res.json({ valid: false, message: `Could not verify key: ${err.message}` });
  }
});

// GET /api/geocode - Server-side geocoding proxy (supports Google Geocoding & Nominatim fallback)
app.get('/api/geocode', async (req, res) => {
  try {
    const query = String(req.query.q || '').trim();
    if (!query) {
      return res.json({ results: [] });
    }

    const apiKey =
      (req.headers['x-goog-api-key'] as string) ||
      (req.query.apiKey as string) ||
      process.env.VITE_USER_GOOGLE_MAPS_KEY ||
      process.env.VITE_GOOGLE_MAPS_API_KEY;

    // 1. If valid Google API key available, query Google Geocoding API
    if (apiKey && apiKey !== 'MY_GOOGLE_MAPS_API_KEY' && apiKey.length > 20) {
      try {
        const gUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`;
        const gRes = await fetch(gUrl);
        if (gRes.ok) {
          const gData = await gRes.json();
          if (gData.status === 'OK' && gData.results && gData.results.length > 0) {
            const parsed = gData.results.slice(0, 5).map((r: any) => ({
              name: r.formatted_address.split(',')[0],
              displayName: r.formatted_address,
              lat: r.geometry.location.lat,
              lng: r.geometry.location.lng,
            }));
            return res.json({ results: parsed, source: 'google' });
          }
        }
      } catch {
        // Fall through to Nominatim
      }
    }

    // 2. Fallback to OpenStreetMap Nominatim with proper User-Agent
    const osmUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`;
    const osmRes = await fetch(osmUrl, {
      headers: {
        'User-Agent': 'MARGAM-Emergency-Traffic-Platform/1.0',
        'Accept-Language': 'en',
      },
    });

    if (osmRes.ok) {
      const osmData = await osmRes.json();
      const parsed = osmData.map((item: any) => ({
        name: item.name || item.display_name.split(',')[0],
        displayName: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      }));
      return res.json({ results: parsed, source: 'osm' });
    }

    return res.json({ results: [] });
  } catch (err: any) {
    console.warn('Geocode proxy error:', err.message);
    return res.json({ results: [] });
  }
});

// POST /api/compute-route - Google Routes API (New) with Live Traffic Awareness & Road Availability
app.post('/api/compute-route', async (req, res) => {
  try {
    const { startLat, startLng, endLat, endLng, avoidPoint, apiKey: bodyApiKey } = req.body;

    if (!startLat || !startLng || !endLat || !endLng) {
      return res.status(400).json({ success: false, error: 'Missing coordinates' });
    }

    const mapsKey =
      bodyApiKey ||
      (req.headers['x-goog-api-key'] as string) ||
      process.env.VITE_USER_GOOGLE_MAPS_KEY ||
      process.env.VITE_GOOGLE_MAPS_API_KEY ||
      '';

    if (!mapsKey || mapsKey === 'MY_GOOGLE_MAPS_API_KEY') {
      return res.status(200).json({
        success: false,
        error: 'No valid Google Maps API Key configured',
        requiresKey: true,
      });
    }

    // Build Routes API request body with traffic awareness
    const requestBody: any = {
      origin: { location: { latLng: { latitude: Number(startLat), longitude: Number(startLng) } } },
      destination: { location: { latLng: { latitude: Number(endLat), longitude: Number(endLng) } } },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      computeAlternativeRoutes: true,
      languageCode: 'en-US',
    };

    // If an avoid point is specified and we need an explicit detour waypoint
    if (avoidPoint && avoidPoint.lat && avoidPoint.lng) {
      const dLat = Number(endLat) - Number(startLat);
      const dLng = Number(endLng) - Number(startLng);
      // Perpendicular shift to force routing on parallel roadway
      const detourLat = (Number(startLat) + Number(endLat)) / 2 - dLng * 0.35;
      const detourLng = (Number(startLng) + Number(endLng)) / 2 + dLat * 0.35;

      requestBody.intermediates = [
        {
          location: {
            latLng: {
              latitude: Number(detourLat.toFixed(5)),
              longitude: Number(detourLng.toFixed(5)),
            },
          },
        },
      ];
    }

    const gmpRes = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': mapsKey,
        'X-Goog-FieldMask':
          'routes.description,routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps.navigationInstruction,routes.legs.steps.distanceMeters,routes.legs.steps.staticDuration',
      },
      body: JSON.stringify(requestBody),
    });

    if (gmpRes.ok) {
      const data = await gmpRes.json();
      if (data.routes && data.routes.length > 0) {
        // If avoidPoint, pick the route furthest from blockage if alternatives exist
        let chosenRoute = data.routes[0];

        if (avoidPoint && data.routes.length > 1) {
          let maxMinDist = -1;
          for (const r of data.routes) {
            if (!r.polyline?.encodedPolyline) continue;
            const pts = decodeGooglePolyline(r.polyline.encodedPolyline);
            let minDistToAvoid = Infinity;
            for (const pt of pts) {
              const d = getDistanceMeters(pt[0], pt[1], avoidPoint.lat, avoidPoint.lng);
              if (d < minDistToAvoid) minDistToAvoid = d;
            }
            if (minDistToAvoid > maxMinDist) {
              maxMinDist = minDistToAvoid;
              chosenRoute = r;
            }
          }
        }

        const encoded = chosenRoute.polyline?.encodedPolyline;
        if (encoded) {
          const coords = decodeGooglePolyline(encoded);
          const distKm = Math.round(((chosenRoute.distanceMeters || 0) / 1000) * 10) / 10;
          const durationSeconds = parseInt(chosenRoute.duration?.replace('s', '') || '300', 10);
          const durationMin = Math.max(1, Math.round(durationSeconds / 60));

          const steps: Array<{
            instruction: string;
            distanceMeters: number;
            durationSeconds: number;
            name: string;
          }> = [];

          if (chosenRoute.legs && chosenRoute.legs[0]?.steps) {
            chosenRoute.legs[0].steps.forEach((s: any) => {
              const text =
                s.navigationInstruction?.instructions?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() ||
                'Continue along arterial';
              const sSec = parseInt(s.staticDuration?.replace('s', '') || '30', 10);
              steps.push({
                instruction: text,
                distanceMeters: s.distanceMeters || 0,
                durationSeconds: sSec,
                name: text.split('\n')[0].slice(0, 32),
              });
            });
          }

          return res.json({
            success: true,
            source: 'google',
            coordinates: coords,
            distanceKm: distKm,
            durationMin,
            steps,
            description: chosenRoute.description || 'Google Traffic-Aware Route',
          });
        }
      }
    }

    const errData = await gmpRes.json().catch(() => ({}));
    return res.status(200).json({
      success: false,
      error: errData.error?.message || 'Google Routes returned no routes for this query',
    });
  } catch (err: any) {
    console.warn('Google Routes compute-route handled error:', err.message);
    return res.status(200).json({ success: false, error: err.message });
  }
});

// Configure Vite in development
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const port = parseInt(process.env.PORT || '3000', 10);

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`MARGAM Full-Stack Server running on port ${port}`);
  });
}

startServer();
