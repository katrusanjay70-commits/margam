export interface LocationPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  type: 'origin' | 'hospital' | 'junction';
}

export interface CityPreset {
  id: string;
  name: string;
  center: [number, number];
  zoom: number;
  origins: LocationPoint[];
  hospitals: LocationPoint[];
  junctions: LocationPoint[];
}

export const cityPresets: Record<string, CityPreset> = {
  hyderabad: {
    id: 'hyderabad',
    name: 'Hyderabad',
    center: [17.4325, 78.3885],
    zoom: 13,
    origins: [
      {
        id: 'hyd-cyber-towers',
        name: 'Cyber Towers, HITEC City',
        lat: 17.4504,
        lng: 78.3809,
        address: 'Hitec City Main Rd, Madhapur',
        type: 'origin',
      },
      {
        id: 'hyd-gachibowli-junc',
        name: 'Gachibowli Junction',
        lat: 17.4401,
        lng: 78.3489,
        address: 'Old Mumbai Hwy, Gachibowli',
        type: 'origin',
      },
      {
        id: 'hyd-jubilee-checkpost',
        name: 'Jubilee Hills Checkpost',
        lat: 17.4294,
        lng: 78.4116,
        address: 'Road No. 36, Jubilee Hills',
        type: 'origin',
      },
      {
        id: 'hyd-banjara-hills',
        name: 'Banjara Hills Rd No. 1',
        lat: 17.4168,
        lng: 78.4485,
        address: 'Taj Krishna Circle, Banjara Hills',
        type: 'origin',
      },
      {
        id: 'hyd-kukatpally-y',
        name: 'Kukatpally Y Junction',
        lat: 17.4851,
        lng: 78.4093,
        address: 'NH 65, Kukatpally',
        type: 'origin',
      },
    ],
    hospitals: [
      {
        id: 'hyd-apollo-hospital',
        name: 'Apollo Hospitals Jubilee Hills',
        lat: 17.4156,
        lng: 78.4124,
        address: 'Road No. 72, Film Nagar',
        type: 'hospital',
      },
      {
        id: 'hyd-aig-hospital',
        name: 'AIG Hospitals Gachibowli',
        lat: 17.4439,
        lng: 78.3664,
        address: 'Mindspace Rd, Gachibowli',
        type: 'hospital',
      },
      {
        id: 'hyd-care-hospital',
        name: 'Care Hospital Banjara Hills',
        lat: 17.4137,
        lng: 78.4481,
        address: 'Road No. 1, Banjara Hills',
        type: 'hospital',
      },
      {
        id: 'hyd-nims-hospital',
        name: 'NIMS Trauma Care Centre, Punjagutta',
        lat: 17.4222,
        lng: 78.4526,
        address: 'Punjagutta, Hyderabad',
        type: 'hospital',
      },
    ],
    junctions: [
      { id: 'j-mindspace', name: 'Mindspace Junction', lat: 17.4392, lng: 78.3808, type: 'junction' },
      { id: 'j-bio-diversity', name: 'Biodiversity Junction', lat: 17.4305, lng: 78.3698, type: 'junction' },
      { id: 'j-durgam-cheruvu', name: 'Cable Bridge Junction', lat: 17.4334, lng: 78.3912, type: 'junction' },
      { id: 'j-madhapur-ps', name: 'Madhapur Police Station Junction', lat: 17.4485, lng: 78.3905, type: 'junction' },
      { id: 'j-film-nagar', name: 'Film Nagar Cultural Junction', lat: 17.4198, lng: 78.4184, type: 'junction' },
    ],
  },
  bengaluru: {
    id: 'bengaluru',
    name: 'Bengaluru',
    center: [12.9716, 77.5946],
    zoom: 13,
    origins: [
      {
        id: 'blr-indiranagar',
        name: 'Indiranagar 100ft Road',
        lat: 12.9784,
        lng: 77.6408,
        address: 'Indiranagar, Bengaluru',
        type: 'origin',
      },
      {
        id: 'blr-mg-road',
        name: 'MG Road Trinity Circle',
        lat: 12.9729,
        lng: 77.6186,
        address: 'MG Road, Bengaluru',
        type: 'origin',
      },
      {
        id: 'blr-koramangala',
        name: 'Koramangala Sony Signal',
        lat: 12.9352,
        lng: 77.6245,
        address: '80 Feet Rd, Koramangala',
        type: 'origin',
      },
      {
        id: 'blr-whitefield',
        name: 'Whitefield ITPL Gate',
        lat: 12.9863,
        lng: 77.7308,
        address: 'ITPL Main Rd, Whitefield',
        type: 'origin',
      },
    ],
    hospitals: [
      {
        id: 'blr-manipal',
        name: 'Manipal Hospital Old Airport Rd',
        lat: 12.9582,
        lng: 77.6485,
        address: '98 HAL Old Airport Rd',
        type: 'hospital',
      },
      {
        id: 'blr-apollo',
        name: 'Apollo Hospital Bannerghatta',
        lat: 12.8942,
        lng: 77.5985,
        address: 'Bannerghatta Rd, Bengaluru',
        type: 'hospital',
      },
      {
        id: 'blr-fortis',
        name: 'Fortis Hospital Cunningham Rd',
        lat: 12.9902,
        lng: 77.5951,
        address: 'Cunningham Rd, Vasanth Nagar',
        type: 'hospital',
      },
    ],
    junctions: [
      { id: 'j-domlur', name: 'Domlur Flyover Junction', lat: 12.9609, lng: 77.6387, type: 'junction' },
      { id: 'j-command-hosp', name: 'Command Hospital Junction', lat: 12.9642, lng: 77.6315, type: 'junction' },
      { id: 'j-marathahalli', name: 'Marathahalli Bridge Junction', lat: 12.9555, lng: 77.7011, type: 'junction' },
    ],
  },
  mumbai: {
    id: 'mumbai',
    name: 'Mumbai',
    center: [19.0596, 72.8295],
    zoom: 13,
    origins: [
      {
        id: 'mum-bkc',
        name: 'Bandra Kurla Complex (BKC)',
        lat: 19.0665,
        lng: 72.8687,
        address: 'G Block, BKC, Bandra East',
        type: 'origin',
      },
      {
        id: 'mum-dadar',
        name: 'Dadar TT Circle',
        lat: 19.0178,
        lng: 72.8478,
        address: 'Dr Baba Saheb Ambedkar Rd, Dadar',
        type: 'origin',
      },
      {
        id: 'mum-andheri',
        name: 'Andheri Western Express Hwy',
        lat: 19.1197,
        lng: 72.8464,
        address: 'WEH, Andheri East',
        type: 'origin',
      },
    ],
    hospitals: [
      {
        id: 'mum-lilavati',
        name: 'Lilavati Hospital & Research Centre',
        lat: 19.0514,
        lng: 72.8294,
        address: 'A-791, Bandra Reclamation, Bandra West',
        type: 'hospital',
      },
      {
        id: 'mum-hinduja',
        name: 'Hinduja Hospital Mahim',
        lat: 19.0336,
        lng: 72.8398,
        address: 'Veer Savarkar Marg, Mahim',
        type: 'hospital',
      },
      {
        id: 'mum-kem',
        name: 'KEM Hospital & Medical College',
        lat: 19.0028,
        lng: 72.8427,
        address: 'Acharya Donde Marg, Parel',
        type: 'hospital',
      },
    ],
    junctions: [
      { id: 'j-bandra-reclamation', name: 'Bandra Reclamation Toll Junction', lat: 19.0435, lng: 72.8315, type: 'junction' },
      { id: 'j-kalanagar', name: 'Kalanagar Junction', lat: 19.0598, lng: 72.8512, type: 'junction' },
    ],
  },
  newyork: {
    id: 'newyork',
    name: 'New York City',
    center: [40.7549, -73.9840],
    zoom: 13,
    origins: [
      {
        id: 'nyc-times-sq',
        name: 'Times Square Plaza',
        lat: 40.7580,
        lng: -73.9855,
        address: 'Broadway & 45th St, Manhattan',
        type: 'origin',
      },
      {
        id: 'nyc-grand-central',
        name: 'Grand Central Terminal',
        lat: 40.7527,
        lng: -73.9772,
        address: '89 E 42nd St, New York',
        type: 'origin',
      },
      {
        id: 'nyc-columbus-circle',
        name: 'Columbus Circle / 59th St',
        lat: 40.7681,
        lng: -73.9819,
        address: 'Central Park West & 59th St',
        type: 'origin',
      },
    ],
    hospitals: [
      {
        id: 'nyc-bellevue',
        name: 'NYC Health + Hospitals Bellevue',
        lat: 40.7388,
        lng: -73.9749,
        address: '462 1st Ave, New York',
        type: 'hospital',
      },
      {
        id: 'nyc-mount-sinai',
        name: 'Mount Sinai Hospital Manhattan',
        lat: 40.7903,
        lng: -73.9530,
        address: '1468 Madison Ave, New York',
        type: 'hospital',
      },
      {
        id: 'nyc-presbyterian',
        name: 'NewYork-Presbyterian Weill Cornell',
        lat: 40.7651,
        lng: -73.9542,
        address: '525 E 68th St, New York',
        type: 'hospital',
      },
    ],
    junctions: [
      { id: 'j-fdr-34', name: 'FDR Drive & 34th St Exit', lat: 40.7424, lng: -73.9718, type: 'junction' },
      { id: 'j-queensboro', name: 'Queensboro Bridge Approach', lat: 40.7601, lng: -73.9625, type: 'junction' },
    ],
  },
};
