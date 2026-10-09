/**
 * Centralized Google Maps Platform API Key Service
 * Manages user-configured Google Maps API keys with persistence and validation
 */

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'margam_google_maps_api_key';
const EVENT_NAME = 'margam-maps-key-changed';

// Placeholders that indicate an unconfigured key
const INVALID_PLACEHOLDERS = new Set([
  '',
  'MY_GOOGLE_MAPS_API_KEY',
  'AIzaSyAp41VXvJEUA4JYW6BYRS4725SK5DAaJeE', // Default unbilled placeholder
  'YOUR_API_KEY',
  'undefined',
  'null',
]);

export function getMapsApiKey(): string {
  // 1. Check local storage (user-provided in UI)
  try {
    const local = localStorage.getItem(STORAGE_KEY)?.trim();
    if (local && !INVALID_PLACEHOLDERS.has(local)) {
      return local;
    }
  } catch {
    // Ignore localStorage access restrictions
  }

  // 2. Check Vite environment variables
  const envKey = (
    import.meta.env.VITE_USER_GOOGLE_MAPS_KEY ||
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    ''
  ).trim();

  if (envKey && !INVALID_PLACEHOLDERS.has(envKey)) {
    return envKey;
  }

  return '';
}

export function hasValidMapsApiKey(): boolean {
  return getMapsApiKey().length > 10;
}

export function setMapsApiKey(key: string): void {
  const cleanKey = key.trim();
  try {
    if (cleanKey && !INVALID_PLACEHOLDERS.has(cleanKey)) {
      localStorage.setItem(STORAGE_KEY, cleanKey);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore localStorage errors
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: cleanKey }));
  }
}

export function clearMapsApiKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: '' }));
  }
}

/**
 * Validates a Google Maps API Key against the server validation proxy
 */
export async function validateMapsApiKey(key: string): Promise<{ valid: boolean; message: string }> {
  const trimmed = key.trim();
  if (!trimmed || trimmed.length < 15) {
    return { valid: false, message: 'API key is too short or invalid format.' };
  }

  try {
    const res = await fetch('/api/validate-maps-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: trimmed }),
    });

    const data = await res.json();
    return {
      valid: data.valid,
      message: data.message || (data.valid ? 'API key verified successfully!' : 'Validation failed.'),
    };
  } catch {
    // If server check fails, perform basic heuristic
    if (trimmed.startsWith('AIza') && trimmed.length >= 35) {
      return { valid: true, message: 'Key format matches Google API key pattern.' };
    }
    return { valid: false, message: 'Could not verify API key with Google servers.' };
  }
}

/**
 * React hook to reactively subscribe to API key changes
 */
export function useMapsApiKey() {
  const [apiKey, setKey] = useState<string>(() => getMapsApiKey());

  useEffect(() => {
    const handleUpdate = () => {
      setKey(getMapsApiKey());
    };

    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  return {
    apiKey,
    hasKey: apiKey.length > 10,
    setKey: setMapsApiKey,
    clearKey: clearMapsApiKey,
  };
}
