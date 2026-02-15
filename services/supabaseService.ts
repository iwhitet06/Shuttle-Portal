/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';
import { AppData, User, Location, LogEntry, BusCheckIn, Message, UserRole, UserStatus, LocationType, TripStatus, UserPermissions, RouteType } from '../types';

// Initialize Supabase Client
// Safely access environment variables to prevent runtime crashes if import.meta.env is undefined
const getEnvVar = (key: string, fallback: string = '') => {
  try {
    // Vite replacement target
    if (import.meta && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
  } catch (e) {
    // Ignore errors accessing import.meta
  }
  return fallback;
};

// Use provided fallbacks if env vars are missing during dev/preview
const supabaseUrl = getEnvVar('VITE_SUPABASE_URL', 'https://onuihnhwiozeyphrfofk.supabase.co');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9udWlobmh3aW96ZXlwaHJmb2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExODM4MTgsImV4cCI6MjA4Njc1OTgxOH0.mu9ivIid8ZBZnCHabFswkVYPksk15Nldkjd135Ec0eU');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase Environment Variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- CONSTANTS FOR SEEDING ---

const INITIAL_LOCATIONS_DATA: Omit<Location, 'id'>[] = [
  // Hotels
  { name: 'Courtyard by Marriott Los Angeles Hacienda Heights/Orange County', type: LocationType.HOTEL, isActive: true, address: '1905 S Azusa Ave, Hacienda Heights, CA 91745' },
  { name: 'SpringHill Suites by Marriott Valencia', type: LocationType.HOTEL, isActive: true, address: '27505 Wayne Mills Pl, Valencia, CA 91355' },
  { name: 'Hampton Inn Los Angeles/Santa Clarita', type: LocationType.HOTEL, isActive: true, address: '25259 The Old Road, Stevenson Ranch CA 91381' },
  { name: 'Courtyard by Marriott Los Angeles Monterey Park', type: LocationType.HOTEL, isActive: true, address: '555 N Atlantic Blvd, Monterey Park, CA 91754' },
  { name: 'W Hollywood', type: LocationType.HOTEL, isActive: true, address: '6250 Hollywood Blvd, Hollywood, CA 90028' },
  { name: 'Courtyard by Marriott Los Angeles Pasadena/Old Town', type: LocationType.HOTEL, isActive: true, address: '180 N Fair Oaks Ave, Pasadena, CA 91103' },
  { name: 'Courtyard by Marriott Los Angeles Sherman Oaks', type: LocationType.HOTEL, isActive: true, address: '15433 Ventura Blvd, Sherman Oaks, CA 91403' },
  { name: 'Newport Beach Marriott Bayview', type: LocationType.HOTEL, isActive: true, address: '500 Bayview Cir, Newport Beach, CA 92660' },
  { name: 'Sheraton Universal Hotel', type: LocationType.HOTEL, isActive: true, address: '333 Universal Hollywood Dr, Universal City, CA 91608' },
  { name: 'Hampton Inn by Hilton North Hollywood', type: LocationType.HOTEL, isActive: true, address: '11350 Burbank Blvd, North Hollywood, CA 91601' },
  { name: 'Sheraton Gateway Los Angeles Hotel', type: LocationType.HOTEL, isActive: true, address: '6101 W Century Blvd, Los Angeles, CA 90045' },
  { name: 'Courtyard by Marriott Ventura Simi Valley', type: LocationType.HOTEL, isActive: true, address: '191 Cochran St, Simi Valley, CA 93065' },
  { name: 'DoubleTree by Hilton Hotel Ontario Airport', type: LocationType.HOTEL, isActive: true, address: '222 N Vineyard Ave, Ontario, CA 91764' },
  { name: 'Courtyard by Marriott Bakersfield', type: LocationType.HOTEL, isActive: true, address: '3601 Marriott Dr, Bakersfield, CA 93308' },
  { name: 'Courtyard by Marriott Long Beach Airport', type: LocationType.HOTEL, isActive: true, address: '3841 N Lakewood Blvd, Long Beach, CA 90808' },
  { name: 'Los Angeles Airport Marriott', type: LocationType.HOTEL, isActive: true, address: '5855 W Century Blvd, Los Angeles, CA 90045, USA' },
  { name: 'Marina Del Rey Marriott', type: LocationType.HOTEL, isActive: true, address: '4100 Admiralty Way, Marina Del Rey, CA 90292' },
  { name: 'Hilton Garden Inn Dana Point Doheny Beach', type: LocationType.HOTEL, isActive: true, address: '34402 Pacific Coast Hwy, Dana Point, CA 92629' },
  { name: 'Hotel Indigo Los Angeles Downtown, an IHG Hotel', type: LocationType.HOTEL, isActive: true, address: '899 Francisco St, Los Angeles, CA 90017' },
  { name: 'The Westin LAX', type: LocationType.HOTEL, isActive: true, address: '5400 W Century Blvd, Los Angeles, CA 90045, US' },
  { name: 'Courtyard by Marriott Thousand Oaks Agoura Hills', type: LocationType.HOTEL, isActive: true, address: '29505 Agoura Rd Building B, Agoura Hills, CA 91301' },
  { name: 'Sheraton Agoura Hills Hotel', type: LocationType.HOTEL, isActive: true, address: '30100 Agoura Rd, Agoura Hills, CA 91301' },
  { name: 'Irvine Marriott', type: LocationType.HOTEL, isActive: true, address: '18000 Von Karman Ave, Irvine, CA 92612' },
  { name: 'AC Hotel Beverly Hills', type: LocationType.HOTEL, isActive: true, address: '6399 Wilshire Blvd, Los Angeles, CA 90048' },
  { name: 'San Diego Marriott Mission Valley', type: LocationType.HOTEL, isActive: true, address: '8757 Rio San Diego Dr, San Diego, CA 92108' },
  { name: 'Sonesta ES Suites Carmel Mountain San Diego', type: LocationType.HOTEL, isActive: true, address: '11002 Rancho Carmel Dr, San Diego, CA 92128' },
  { name: 'Holiday Inn Carlsbad - San Diego, an IHG Hotel', type: LocationType.HOTEL, isActive: true, address: '2725 Palomar Airport Rd, Carlsbad, CA 92009' },
  { name: 'Staybridge Suites Carlsbad - San Diego, an IHG Hotel', type: LocationType.HOTEL, isActive: true, address: '2735 Palomar Airport Rd, Carlsbad, CA 92009' },
  { name: 'Carte Hotel San Diego Downtown, Curio Collection by Hilton', type: LocationType.HOTEL, isActive: true, address: '401 W Ash St, San Diego, CA 92101' },
  { name: 'Courtyard by Marriott San Diego Downtown Little Italy', type: LocationType.HOTEL, isActive: true, address: '1646 Front St, San Diego, CA 92101' },
  { name: 'Crowne Plaza San Diego - Mission Valley by IHG', type: LocationType.HOTEL, isActive: true, address: '2270 Hotel Cir N, San Diego, CA 92108' },
  { name: 'SpringHill Suites by Marriott San Diego Escondido/Downtown', type: LocationType.HOTEL, isActive: true, address: '200 La Terraza Blvd, Escondido, CA 92025' },
  { name: 'Hampton Inn San Diego/Mission Valley', type: LocationType.HOTEL, isActive: true, address: '2151 Hotel Cir S, San Diego, CA 92108' },
  { name: 'TownePlace Suites by Marriott San Diego Carlsbad/Vista', type: LocationType.HOTEL, isActive: true, address: '2201 S Melrose Dr, Vista, CA 92081' },
  { name: 'The Viv Hotel, Anaheim, a Tribute Portfolio Hotel', type: LocationType.HOTEL, isActive: true, address: '1601 S Anaheim Blvd, Anaheim, CA 92805' },
  { name: 'The Westin South Coast Plaza, Costa Mesa', type: LocationType.HOTEL, isActive: true, address: '686 Anton Blvd, Costa Mesa, CA 92626' },
  { name: 'Courtyard by Marriott Irvine John Wayne Airport/Orange County', type: LocationType.HOTEL, isActive: true, address: '2701 Main St, Irvine, CA 92614' },
  { name: 'Le Méridien Pasadena Arcadia', type: LocationType.HOTEL, isActive: true, address: '130 W Huntington Dr, Arcadia, CA 91007' },
  { name: 'Homewood Suites by Hilton San Bernardino', type: LocationType.HOTEL, isActive: true, address: '885 E Hospitality Ln, San Bernardino, CA 92408' },
  { name: 'Candlewood Suites Loma Linda - San Bernardino S by IHG', type: LocationType.HOTEL, isActive: true, address: '10372 Richardson St, Loma Linda, CA 92354' },
  { name: 'Holiday Inn Express & Suites Loma Linda- San Bernardino S by IHG', type: LocationType.HOTEL, isActive: true, address: '25222 Redlands Blvd, Loma Linda, CA 92354' },
  { name: 'Four Points by Sheraton Ontario-Rancho Cucamonga', type: LocationType.HOTEL, isActive: true, address: '11960 Foothill Blvd, Rancho Cucamonga, CA 91739' },
  { name: 'InterContinental Los Angeles Downtown by IHG', type: LocationType.HOTEL, isActive: true, address: '900 Wilshire Blvd, Los Angeles, CA 90017' },
  { name: 'DoubleTree by Hilton Hotel San Bernardino', type: LocationType.HOTEL, isActive: true, address: '285 E Hospitality Ln, San Bernardino, CA 92408' },
  { name: 'TownePlace Suites by Marriott San Bernardino Loma Linda', type: LocationType.HOTEL, isActive: true, address: '10336 Richardson St, Loma Linda, CA 92354' },
  { name: 'Courtyard San Bernardino Loma Linda', type: LocationType.HOTEL, isActive: true, address: '10354 Richardson St, Loma Linda, CA 92354' },
  { name: 'Courtyard by Marriott Thousand Oaks Ventura County', type: LocationType.HOTEL, isActive: true, address: '1710 Newbury Rd, Thousand Oaks, CA 91320' },
  { name: 'Warner Center Marriott Woodland Hills', type: LocationType.HOTEL, isActive: true, address: '21850 Oxnard St, Woodland Hills, CA 91367' },
  { name: 'Courtyard by Marriott Chino Hills', type: LocationType.HOTEL, isActive: true, address: '15433 Fairfield Ranch Rd, Chino Hills, CA 91709' },
  { name: 'Hampton Inn & Suites Moreno Valley', type: LocationType.HOTEL, isActive: true, address: '12611 Memorial Way, Moreno Valley, CA 92553' },
  { name: 'TownePlace Suites by Marriott Ontario Chino Hills', type: LocationType.HOTEL, isActive: true, address: '15881 Pomona Rincon Rd, Chino Hills, CA 91709' },
  { name: 'Fairfield by Marriott Inn & Suites San Bernardino', type: LocationType.HOTEL, isActive: true, address: '1041 E, 1041 Harriman Pl, San Bernardino, CA 92408' },
  { name: 'Residence Inn by Marriott San Bernardino', type: LocationType.HOTEL, isActive: true, address: '1040 Harriman Pl, San Bernardino, CA 92408' },
  { name: 'Courtyard by Marriott Riverside UCR/Moreno Valley Area', type: LocationType.HOTEL, isActive: true, address: '1510 University Ave, Riverside, CA 92507' },
  { name: 'Fairfield by Marriott Inn & Suites Riverside Corona/Norco', type: LocationType.HOTEL, isActive: true, address: '3441 Hamner Ave, Norco, CA 92860' },
  { name: 'SpringHill Suites by Marriott Corona Riverside', type: LocationType.HOTEL, isActive: true, address: '2025 Compton Ave, Corona, CA 92881' },
  { name: 'DoubleTree by Hilton Hotel San Diego - Mission Valley', type: LocationType.HOTEL, isActive: true, address: '7450 Hazard Center Dr, San Diego, CA 92108' },
  { name: 'Courtyard by Marriott San Diego Downtown', type: LocationType.HOTEL, isActive: true, address: '530 Broadway, San Diego, CA 92101' },
  { name: 'SpringHill Suites by Marriott Los Angeles Downey', type: LocationType.HOTEL, isActive: true, address: '9066 Firestone Blvd, Downey, CA 90241' },
  { name: 'Courtyard by Marriott San Diego Carlsbad', type: LocationType.HOTEL, isActive: true, address: '5835 Owens Ave, Carlsbad, CA 92008' },
  { name: 'Fairfield by Marriott Inn & Suites San Diego Carlsbad', type: LocationType.HOTEL, isActive: true, address: '1929 Palomar Oaks Way, Carlsbad, CA 92011' },
  { name: 'Residence Inn by Marriott Ontario Rancho Cucamonga', type: LocationType.HOTEL, isActive: true, address: '9299 Haven Ave, Rancho Cucamonga, CA 91730' },
  { name: 'Residence Inn by Marriott Los Angeles Torrance/Redondo Beach', type: LocationType.HOTEL, isActive: true, address: '3701 Torrance Blvd, Torrance, CA 90503' },
  { name: 'Delta Hotels Anaheim Garden Grove', type: LocationType.HOTEL, isActive: true, address: '12021 Harbor Blvd, Garden Grove, CA 92840' },
  { name: 'SLS Hotel, a Luxury Collection Hotel, Beverly Hills', type: LocationType.HOTEL, isActive: true, address: '465 La Cienega Blvd, Los Angeles, CA 90048' },
  { name: 'Hilton Anaheim', type: LocationType.HOTEL, isActive: true, address: '777 W Convention Way, Anaheim, CA 92802' },
  { name: 'Anaheim Suites', type: LocationType.HOTEL, isActive: true, address: '12015 Harbor Blvd, Garden Grove, CA 92840' },
  { name: 'JW Marriott, Anaheim Resort', type: LocationType.HOTEL, isActive: true, address: '1775 S Clementine St, Anaheim, CA 92802' },
  { name: 'Residence Inn by Marriott Pasadena Arcadia', type: LocationType.HOTEL, isActive: true, address: '321 E Huntington Dr, Arcadia, CA 91006' },
  { name: 'DoubleTree by Hilton Hotel Los Angeles - Rosemead', type: LocationType.HOTEL, isActive: true, address: '888 Montebello Blvd, Rosemead, CA 91770' },
  { name: 'Fairfield Inn Anaheim Hills Orange County', type: LocationType.HOTEL, isActive: true, address: '201 N Via Cortez, Anaheim, CA 92807' },
  { name: 'Sheraton Los Angeles San Gabriel', type: LocationType.HOTEL, isActive: true, address: '303 E Valley Blvd, San Gabriel, CA 91776' },
  { name: 'Courtyard by Marriott Los Angeles Baldwin Park', type: LocationType.HOTEL, isActive: true, address: '14635 Baldwin Park Towne Center, Baldwin Park, CA 91706' },
  { name: 'Fullerton Marriott at California State University', type: LocationType.HOTEL, isActive: true, address: '2701 Nutwood Ave, Fullerton, CA 92831' },
  { name: 'Residence Inn by Marriott Santa Clarita Valencia', type: LocationType.HOTEL, isActive: true, address: '25320 the Old Rd, Stevenson Ranch, CA, 91381' },
  { name: 'TownePlace Suites by Marriott Ontario Airport', type: LocationType.HOTEL, isActive: true, address: '9625 Milliken Ave, Rancho Cucamonga, CA 91730' },
  { name: 'Home2 Suites by Hilton San Bernardino', type: LocationType.HOTEL, isActive: true, address: '837 E Brier Dr, San Bernardino, CA 92408' },
  { name: 'DoubleTree by Hilton Los Angeles – Norwalk', type: LocationType.HOTEL, isActive: true, address: '13111 Sycamore Dr, Norwalk, CA 90650' },
  { name: 'Delta Hotels Ontario Airport', type: LocationType.HOTEL, isActive: true, address: '2200 E Holt Blvd, Ontario, CA 91761' },
  { name: 'Holiday Inn la Mirada – Buena Park by IHG', type: LocationType.HOTEL, isActive: true, address: '14299 Firestone Blvd, La Mirada, CA 90638' },
  { name: 'Residence Inn by Marriott Palmdale Lancaster', type: LocationType.HOTEL, isActive: true, address: '847 West Lancaster Boulevard, Lancaster, CA, 93534' },
  { name: 'Sonesta ES Suites San Diego - Sorrento Mesa', type: LocationType.HOTEL, isActive: true, address: '6639 Mira Mesa Blvd, San Diego, CA 92121' },
  { name: 'Courtyard by Marriott Costa Mesa South Coast Metro', type: LocationType.HOTEL, isActive: true, address: '3002 S Harbor Blvd, Santa Ana, CA 92704' },
  { name: 'DoubleTree by Hilton Whittier Los Angeles', type: LocationType.HOTEL, isActive: true, address: '7320 Greenleaf Ave, Whittier, CA 90602' },
  { name: 'Residence Inn by Marriott Cypress Los Alamitos', type: LocationType.HOTEL, isActive: true, address: '4931 Katella Ave, Los Alamitos, CA 90720' },
  { name: 'Sheraton Cerritos Hotel', type: LocationType.HOTEL, isActive: true, address: '12725 Center Ct Dr S, Cerritos, CA 90703' },
  { name: 'Courtyard by Marriott San Diego Mission Valley/Hotel Circle', type: LocationType.HOTEL, isActive: true, address: '595 Hotel Cir S, San Diego, CA 92108' },
  { name: 'Courtyard by Marriott Victorville Hesperia', type: LocationType.HOTEL, isActive: true, address: '9619 Mariposa Rd, Hesperia, CA 92345' },
  { name: 'Sonesta ES Suites San Diego - Rancho Bernardo', type: LocationType.HOTEL, isActive: true, address: '11855 Avenue of Industry, San Diego, CA, 92128' },
  { name: 'Embassy Suites by Hilton Temecula Valley Wine Country', type: LocationType.HOTEL, isActive: true, address: '29345 Rancho California Rd, Temecula, CA 92591' },
  
  // Worksites
  { name: 'Downey MC', type: LocationType.WORKSITE, isActive: true, address: '9333 Imperial Hwy. Downey CA 90242' },
  { name: 'Panorama City MC', type: LocationType.WORKSITE, isActive: true, address: '8120 Woodman Ave, Panorama City, CA 91402' },
  { name: 'LAMC Mental Health Center', type: LocationType.WORKSITE, isActive: true, address: '765 W College St, Los Angeles, CA 90012' },
  { name: 'Irvine MC', type: LocationType.WORKSITE, isActive: true, address: '6650 Alton Parkway. Irvine, CA 92618' },
  { name: 'Carson Medical Office', type: LocationType.WORKSITE, isActive: true, address: '18600 S. Figueroa Street, Gardena CA 90248' },
  { name: 'Porter Ranch MOB Family Medicine', type: LocationType.WORKSITE, isActive: true, address: '20000 Rinaldi St, Porter Ranch, CA 91326' },
  { name: 'Ontario Medical Center MOB A & D', type: LocationType.WORKSITE, isActive: true, address: '2295 S. Vineyard Ave Ontario, CA 91761' },
  { name: 'Stockdale Urgent Care', type: LocationType.WORKSITE, isActive: true, address: '9900 Stockdale Hwy, Suite 105, Bakersfield, CA 93311' },
  { name: 'West LA MC', type: LocationType.WORKSITE, isActive: true, address: '6041 Cadillac Avenue, Los Angeles, CA 90034' },
  { name: 'Woodland Hills MC', type: LocationType.WORKSITE, isActive: true, address: '5601 De Soto, Woodland Hills, Ca 91367' },
  { name: 'Normandie North Medical Offices', type: LocationType.WORKSITE, isActive: true, address: '25965 S. Normandie Ave., Harbor City, CA 90710' },
  { name: 'MVJ Medical Office', type: LocationType.WORKSITE, isActive: true, address: '23781 Maquina Avenue, Mission Viejo, CA 92691' },
  { name: 'San Diego Medical Center', type: LocationType.WORKSITE, isActive: true, address: '9455 Clairemont Mesa Blvd, San Diego, CA 92123' },
  { name: 'Chester I MOB', type: LocationType.WORKSITE, isActive: true, address: '2531 Chester Ave, Bakersfield, CA 93301' },
  { name: 'Zion Medical Center', type: LocationType.WORKSITE, isActive: true, address: '4647 Zion Ave, San Diego, CA 92120' },
  { name: 'San Marcos Medical Center', type: LocationType.WORKSITE, isActive: true, address: '360 Rush Drive, San Marcos, CA 92078' },
  { name: 'HBM Medical Office', type: LocationType.WORKSITE, isActive: true, address: '3401 S. Harbor Blvd., Santa Ana, CA 92704' },
  { name: 'Downey MC - Orchard MOB', type: LocationType.WORKSITE, isActive: true, address: '9449 Imperial Hwy Downey CA 90242' },
  { name: 'FPL Med Office', type: LocationType.WORKSITE, isActive: true, address: '3280 E Foothill Blvd, Los Angeles, CA 90022' },
  { name: 'LAMC', type: LocationType.WORKSITE, isActive: true, address: '4867 Sunset Blvd., Los Angeles, CA 90027' },
  { name: 'Fontana Medical Center', type: LocationType.WORKSITE, isActive: true, address: '9961 Sierra Ave., Fontana, CA 92335' },
  { name: 'Los Angeles Medical Center', type: LocationType.WORKSITE, isActive: true, address: '4867 Sunset Blvd., Los Angeles, CA 90027' },
  { name: 'FMC MOB 1& 2, MOB 3', type: LocationType.WORKSITE, isActive: true, address: '9961 Sierra Ave Fontana, CA 92335' },
  { name: 'KP-4700 Sunset', type: LocationType.WORKSITE, isActive: true, address: '4700 Sunset Blvd, LA 90027' },
  { name: 'Market Street MOB', type: LocationType.WORKSITE, isActive: true, address: '4949 Market St, Ventura, CA 93003' },
  { name: 'Riverside Medical Center MOB', type: LocationType.WORKSITE, isActive: true, address: '10800 Magnolia Ave Riverside, CA. 92505' },
  { name: 'Riverside MC', type: LocationType.WORKSITE, isActive: true, address: '10800 Magnolia Ave, Riverside, CA 92505' },
  { name: 'Baldwin Park MC', type: LocationType.WORKSITE, isActive: true, address: '1011 Baldwin Park Blvd., Baldwin Park, Ca 91706' },
  { name: 'OTM Medical Office', type: LocationType.WORKSITE, isActive: true, address: '4650 Palm Ave. San Diego, CA 92154' },
  { name: 'Downey MC- Garden MOB', type: LocationType.WORKSITE, isActive: true, address: '9353 Imperial Hwy Downey CA 90242' },
  { name: 'South Bay MC', type: LocationType.WORKSITE, isActive: true, address: '25825 S. Vermont Ave, Harbor City CA 90710' },
  { name: 'Ontario Medical Center', type: LocationType.WORKSITE, isActive: true, address: '2295 South Vineyard, Ontario, CA 91761' },
  { name: 'Stockdale', type: LocationType.WORKSITE, isActive: true, address: '3501 Stockdale Hwy, Bakersfield, CA 93309' },
  { name: 'Coastline Medical Office Building', type: LocationType.WORKSITE, isActive: true, address: '25821 S. Vermont Ave. Harbor City, CA 90710' },
  { name: 'Kraemer Medical Office 2', type: LocationType.WORKSITE, isActive: true, address: '3430 E La Palma Avenue, Anaheim, California 92806' },
  { name: 'Baldwin Hills Crenshaw Med Office', type: LocationType.WORKSITE, isActive: true, address: '3782 W Martin Luther King Jr. Boulevard, Los Angeles CA 90008' },
  { name: 'Anaheim MC', type: LocationType.WORKSITE, isActive: true, address: '3430 E La Palma Avenue, Anaheim, CA 92806' },
  { name: 'Center of Healthy Living', type: LocationType.WORKSITE, isActive: true, address: '74 N Pasadena, Avenue, Pasadena, CA 8th Floor, Pasadena, California 91101' },
  { name: 'Pharmacy Central Order', type: LocationType.WORKSITE, isActive: true, address: '12254 Bellflower Blvd, Downey, California 90242' },
  { name: 'Panorama City-Main Campus (MO2, MO3, MO4, MO5, MO6)', type: LocationType.WORKSITE, isActive: true, address: '13652 Cantara Street Panorama City, CA 91402' },
  { name: 'VMC Clinical', type: LocationType.WORKSITE, isActive: true, address: '17284 Slover Ave, Fontana, CA 92337' },
  { name: 'Bellflower MOB', type: LocationType.WORKSITE, isActive: true, address: '9400 Rosecrans Ave. Bellflower, CA 90706' },
  { name: 'San Marcos MOB', type: LocationType.WORKSITE, isActive: true, address: '400 Craven Rd, San Marcos, CA 92078' },
  { name: 'Vandever MOB', type: LocationType.WORKSITE, isActive: true, address: '4405 Vandever Av, San Diego, CA 92120' },
  { name: 'LAN Mob', type: LocationType.WORKSITE, isActive: true, address: '43112 15th Street West, Lancaster 93534' },
  { name: 'Pharmacy Mail Order Pharm and Tech', type: LocationType.WORKSITE, isActive: true, address: '9521 Dalen Street, Downey, CA 90242' },
  { name: 'EMO Medical Office', type: LocationType.WORKSITE, isActive: true, address: '1188 N. Euclid Street, Anaheim, CA 92801' },
  { name: 'GG Medical Office', type: LocationType.WORKSITE, isActive: true, address: '12100 Euclid Street, Garden Grove, CA 92840' },
  { name: 'High Desert MOB', type: LocationType.WORKSITE, isActive: true, address: '14011 Park Ave Victorville, CA 92392' },
  { name: 'KP-4900 Sunset', type: LocationType.WORKSITE, isActive: true, address: '4900 Sunset Blvd, LA 90027' },
  { name: 'Regional L&D Advice Nurse', type: LocationType.WORKSITE, isActive: true, address: '4867 Sunset Blvd., Los Angeles, CA 90027' },
  { name: 'KP-4950 Sunset', type: LocationType.WORKSITE, isActive: true, address: '4950 Sunset Blvd, Los Angeles 90027' },
  { name: 'Murrieta Medical Office Building', type: LocationType.WORKSITE, isActive: true, address: '28150 Keller Road Murrieta, CA 92563' },
  { name: 'Santa Clarita MOB 2', type: LocationType.WORKSITE, isActive: true, address: '26877 Tourney Rd, Santa Clarita, CA 91355' },
];

const DEFAULT_PERMISSIONS: UserPermissions = {
  canViewHistory: true,
  canLogTrips: true,
  allowedLocationIds: undefined
};

// --- DATA MAPPING HELPERS (DB snake_case -> App camelCase) ---

const mapUser = (data: any): User => ({
  id: data.id,
  firstName: data.first_name,
  lastName: data.last_name,
  phone: data.phone,
  role: data.role as UserRole,
  status: data.status as UserStatus,
  permissions: data.permissions || DEFAULT_PERMISSIONS,
  joinedAt: data.joined_at,
  currentLocationId: data.current_location_id,
  assignedWorksiteId: data.assigned_worksite_id
});

const mapLocation = (data: any): Location => ({
  id: data.id,
  name: data.name,
  type: data.type as LocationType,
  isActive: data.is_active,
  address: data.address
});

const mapLogEntry = (data: any): LogEntry => ({
  id: data.id,
  userId: data.user_id,
  timestamp: data.timestamp,
  routeType: data.route_type as RouteType,
  departLocationId: data.depart_location_id,
  arrivalLocationId: data.arrival_location_id,
  driverName: data.driver_name,
  companyName: data.company_name,
  busNumber: data.bus_number,
  passengerCount: data.passenger_count,
  eta: data.eta,
  status: data.status as TripStatus,
  actualArrivalTime: data.actual_arrival_time,
  notes: data.notes
});

const mapBusCheckIn = (data: any): BusCheckIn => ({
  id: data.id,
  userId: data.user_id,
  timestamp: data.timestamp,
  locationId: data.location_id,
  driverName: data.driver_name,
  companyName: data.company_name,
  busNumber: data.bus_number
});

const mapMessage = (data: any): Message => ({
  id: data.id,
  fromUserId: data.from_user_id,
  toUserId: data.to_user_id,
  content: data.content,
  timestamp: data.timestamp,
  isRead: data.is_read
});

// --- SERVICE FUNCTIONS ---

export const seedDatabase = async () => {
  // Check if locations exist
  const { count: locCount } = await supabase.from('locations').select('*', { count: 'exact', head: true });
  
  if (locCount === 0) {
    console.log('Seeding locations...');
    const locationsToInsert = INITIAL_LOCATIONS_DATA.map(l => ({
      name: l.name,
      type: l.type,
      address: l.address,
      is_active: l.isActive
    }));
    
    // Insert in chunks to avoid payload limits if necessary, though 50-100 is fine
    const { error } = await supabase.from('locations').insert(locationsToInsert);
    if (error) console.error('Error seeding locations:', error);
  }

  // Check if any user exists
  const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
  
  if (userCount === 0) {
    console.log('Seeding Sys Admin...');
    const sysAdmin = {
        first_name: 'System',
        last_name: 'Admin',
        phone: '000-000-0000',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        permissions: DEFAULT_PERMISSIONS,
        // We can't assign 'hotel-1' ID blindly because UUIDs are generated by DB.
        // We'll skip location assignment for seed admin or fetch one.
    };
    const { error } = await supabase.from('users').insert([sysAdmin]);
    if (error) console.error('Error seeding admin:', error);
  }
};

export const loadData = async (): Promise<AppData> => {
  // Ensure DB is seeded first (light check)
  await seedDatabase();

  const [users, locations, logs, checkins, messages] = await Promise.all([
    supabase.from('users').select('*'),
    supabase.from('locations').select('*').order('name'),
    supabase.from('logs').select('*').order('timestamp', { ascending: false }),
    supabase.from('bus_checkins').select('*').order('timestamp', { ascending: false }),
    supabase.from('messages').select('*').order('timestamp', { ascending: true })
  ]);

  return {
    users: (users.data || []).map(mapUser),
    locations: (locations.data || []).map(mapLocation),
    logs: (logs.data || []).map(mapLogEntry),
    busCheckIns: (checkins.data || []).map(mapBusCheckIn),
    messages: (messages.data || []).map(mapMessage),
    currentUser: null // Logic to set this is in App.tsx based on state
  };
};

export const registerUser = async (firstName: string, lastName: string, phone: string): Promise<User | null> => {
  // Always register as AGENT / PENDING
  const newUser = {
    first_name: firstName,
    last_name: lastName,
    phone: phone,
    role: UserRole.AGENT,
    status: UserStatus.PENDING,
    permissions: DEFAULT_PERMISSIONS
  };

  const { data, error } = await supabase.from('users').insert([newUser]).select().single();
  if (error) {
    console.error(error);
    return null;
  }
  return mapUser(data);
};

export const loginUser = async (firstName: string, lastName: string, phone: string): Promise<User | null> => {
  const { data, error } = await supabase.from('users')
    .select('*')
    .ilike('first_name', firstName)
    .ilike('last_name', lastName)
    .eq('phone', phone)
    .maybeSingle();

  if (error || !data) return null;
  return mapUser(data);
};

export const createLog = async (entry: Omit<LogEntry, 'id' | 'timestamp' | 'status'>): Promise<LogEntry | null> => {
  const dbEntry = {
    user_id: entry.userId,
    route_type: entry.routeType,
    depart_location_id: entry.departLocationId,
    arrival_location_id: entry.arrivalLocationId,
    driver_name: entry.driverName,
    company_name: entry.companyName,
    bus_number: entry.busNumber,
    passenger_count: entry.passengerCount,
    eta: entry.eta,
    notes: entry.notes,
    status: TripStatus.IN_TRANSIT,
    timestamp: new Date().toISOString()
  };

  const { data, error } = await supabase.from('logs').insert([dbEntry]).select().single();
  if (error) {
      console.error(error);
      return null;
  }
  return mapLogEntry(data);
};

export const updateLog = async (logId: string, updates: Partial<LogEntry>) => {
  const dbUpdates: any = {};
  if (updates.driverName) dbUpdates.driver_name = updates.driverName;
  if (updates.companyName) dbUpdates.company_name = updates.companyName;
  if (updates.busNumber) dbUpdates.bus_number = updates.busNumber;
  if (updates.passengerCount !== undefined) dbUpdates.passenger_count = updates.passengerCount;
  if (updates.timestamp) dbUpdates.timestamp = updates.timestamp;
  if (updates.status) dbUpdates.status = updates.status;
  if (updates.eta) dbUpdates.eta = updates.eta;
  
  await supabase.from('logs').update(dbUpdates).eq('id', logId);
};

export const deleteLog = async (logId: string) => {
  await supabase.from('logs').delete().eq('id', logId);
};

export const createBusCheckIn = async (entry: Omit<BusCheckIn, 'id' | 'timestamp'>): Promise<BusCheckIn | null> => {
  const dbEntry = {
    user_id: entry.userId,
    location_id: entry.locationId,
    driver_name: entry.driverName,
    company_name: entry.companyName,
    bus_number: entry.busNumber,
    timestamp: new Date().toISOString()
  };

  const { data, error } = await supabase.from('bus_checkins').insert([dbEntry]).select().single();
  if (error) return null;
  return mapBusCheckIn(data);
};

export const updateBusCheckIn = async (id: string, timestamp: string) => {
  await supabase.from('bus_checkins').update({ timestamp }).eq('id', id);
};

export const markTripArrived = async (logId: string): Promise<void> => {
  await supabase.from('logs').update({
    status: TripStatus.ARRIVED,
    actual_arrival_time: new Date().toISOString()
  }).eq('id', logId);
};

export const sendMessage = async (fromId: string, toId: string, content: string): Promise<Message | null> => {
  const dbMsg = {
    from_user_id: fromId,
    to_user_id: toId,
    content: content,
    timestamp: new Date().toISOString(),
    is_read: false
  };
  const { data, error } = await supabase.from('messages').insert([dbMsg]).select().single();
  if (error) return null;
  return mapMessage(data);
};

export const markMessagesAsRead = async (fromUserId: string, toUserId: string) => {
  await supabase.from('messages')
    .update({ is_read: true })
    .eq('from_user_id', fromUserId)
    .eq('to_user_id', toUserId)
    .eq('is_read', false);
};

export const updateUserStatus = async (userId: string, status: UserStatus) => {
  await supabase.from('users').update({ status }).eq('id', userId);
};

export const toggleUserRole = async (userId: string) => {
  // Fetch current role
  const { data } = await supabase.from('users').select('role').eq('id', userId).single();
  if (data) {
    let newRole = UserRole.AGENT;
    if (data.role === UserRole.AGENT) newRole = UserRole.ONSITE_COORDINATOR;
    else if (data.role === UserRole.ONSITE_COORDINATOR) newRole = UserRole.ADMIN;
    else newRole = UserRole.AGENT; // Rotate back to Agent
    
    await supabase.from('users').update({ role: newRole }).eq('id', userId);
  }
};

export const toggleUserPermission = async (userId: string, permission: keyof UserPermissions) => {
  const { data } = await supabase.from('users').select('permissions').eq('id', userId).single();
  if (data && data.permissions) {
    const perms = data.permissions as UserPermissions;
    if (permission !== 'allowedLocationIds') {
        const updatedPerms = { ...perms, [permission]: !perms[permission] };
        await supabase.from('users').update({ permissions: updatedPerms }).eq('id', userId);
    }
  }
};

export const updateUserAllowedLocations = async (userId: string, locationIds: string[] | undefined) => {
    const { data } = await supabase.from('users').select('permissions').eq('id', userId).single();
    if (data && data.permissions) {
        const perms = data.permissions as UserPermissions;
        const updatedPerms = { ...perms, allowedLocationIds: locationIds };
        await supabase.from('users').update({ permissions: updatedPerms }).eq('id', userId);
    }
};

export const updateUserLocation = async (userId: string, locationId: string) => {
  await supabase.from('users').update({ current_location_id: locationId }).eq('id', userId);
};

export const updateUserAssignedWorksite = async (userId: string, worksiteId: string) => {
  await supabase.from('users').update({ assigned_worksite_id: worksiteId }).eq('id', userId);
};

export const toggleLocation = async (locationId: string) => {
  const { data } = await supabase.from('locations').select('is_active').eq('id', locationId).single();
  if (data) {
    await supabase.from('locations').update({ is_active: !data.is_active }).eq('id', locationId);
  }
};

export const addLocation = async (name: string, type: LocationType, address?: string) => {
  await supabase.from('locations').insert([{
    name,
    type,
    address,
    is_active: true
  }]);
};

export const updateLocation = async (id: string, updates: Partial<Location>) => {
  // Map updates back to snake_case
  const dbUpdates: any = {};
  if (updates.name) dbUpdates.name = updates.name;
  if (updates.type) dbUpdates.type = updates.type;
  if (updates.address) dbUpdates.address = updates.address;
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

  await supabase.from('locations').update(dbUpdates).eq('id', id);
};
