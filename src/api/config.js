/**
 * Trimble Connect regional hosts. North America is the master/default region.
 * Mirrors https://app.connect.trimble.com/tc/api/2.0/regions — refresh against that
 * endpoint when Trimble adds a region.
 */
export const REGIONS = [
  { id: 'northAmerica', baseUrl: 'https://app.connect.trimble.com' },
  { id: 'europe', baseUrl: 'https://app21.connect.trimble.com' },
  { id: 'unitedKingdom', baseUrl: 'https://app22.connect.trimble.com' },
  { id: 'asiaPacific', baseUrl: 'https://app31.connect.trimble.com' },
  { id: 'australia', baseUrl: 'https://app32.connect.trimble.com' },
];

const ALIASES = {
  na: 'northAmerica',
  us: 'northAmerica',
  northamerica: 'northAmerica',
  'north-america': 'northAmerica',
  eu: 'europe',
  europe: 'europe',
  europa: 'europe',
  uk: 'unitedKingdom',
  gb: 'unitedKingdom',
  'eu-gb': 'unitedKingdom',
  unitedkingdom: 'unitedKingdom',
  'united-kingdom': 'unitedKingdom',
  ap: 'asiaPacific',
  asia: 'asiaPacific',
  asiapacific: 'asiaPacific',
  aus: 'australia',
  'ap-au': 'australia',
  australia: 'australia',
};

export const normalizeRegion = (regionName) => {
  const key = String(regionName || '').toLowerCase().trim();
  return ALIASES[key] || 'northAmerica';
};

export const getBaseUrlForRegion = (regionName) => {
  const id = normalizeRegion(regionName);
  return REGIONS.find((region) => region.id === id).baseUrl;
};

/** User profiles are global and always served from the master region. */
export const GLOBAL_BASE_URL = 'https://app.connect.trimble.com';
