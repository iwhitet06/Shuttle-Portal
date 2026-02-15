import { User, Location, LogEntry, Message, UserRole, UserStatus, LocationType, AppData, TripStatus, UserPermissions, BusCheckIn } from '../types';

const STORAGE_KEY = 'transitflow_db_v2';

const DEFAULT_PERMISSIONS: UserPermissions = {
  canViewHistory: true,
  canLogTrips: true,
  allowedLocationIds: undefined // Default to all access
};

const INITIAL_USERS: User[] = [
  {
    id: 'sys-admin',
    firstName: 'System',
    lastName: 'Admin',
    phone: '000-000-0000',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    permissions: DEFAULT_PERMISSIONS,
    joinedAt: new Date().toISOString(),
    currentLocationId: 'hotel-1'
  }
];

const INITIAL_LOCATIONS: Location[] = [
  // Hotels (Preserved)
  { id: 'hotel-1', name: 'Courtyard by Marriott Los Angeles Hacienda Heights/Orange County', type: LocationType.HOTEL, isActive: true, address: '1905 S Azusa Ave, Hacienda Heights, CA 91745' },
  { id: 'hotel-2', name: 'SpringHill Suites by Marriott Valencia', type: LocationType.HOTEL, isActive: true, address: '27505 Wayne Mills Pl, Valencia, CA 91355' },
  { id: 'hotel-3', name: 'Hampton Inn Los Angeles/Santa Clarita', type: LocationType.HOTEL, isActive: true, address: '25259 The Old Road, Stevenson Ranch CA 91381' },
  { id: 'hotel-4', name: 'Courtyard by Marriott Los Angeles Monterey Park', type: LocationType.HOTEL, isActive: true, address: '555 N Atlantic Blvd, Monterey Park, CA 91754' },
  { id: 'hotel-5', name: 'W Hollywood', type: LocationType.HOTEL, isActive: true, address: '6250 Hollywood Blvd, Hollywood, CA 90028' },
  { id: 'hotel-6', name: 'Courtyard by Marriott Los Angeles Pasadena/Old Town', type: LocationType.HOTEL, isActive: true, address: '180 N Fair Oaks Ave, Pasadena, CA 91103' },
  { id: 'hotel-7', name: 'Courtyard by Marriott Los Angeles Sherman Oaks', type: LocationType.HOTEL, isActive: true, address: '15433 Ventura Blvd, Sherman Oaks, CA 91403' },
  { id: 'hotel-8', name: 'Newport Beach Marriott Bayview', type: LocationType.HOTEL, isActive: true, address: '500 Bayview Cir, Newport Beach, CA 92660' },
  { id: 'hotel-9', name: 'Sheraton Universal Hotel', type: LocationType.HOTEL, isActive: true, address: '333 Universal Hollywood Dr, Universal City, CA 91608' },
  { id: 'hotel-10', name: 'Hampton Inn by Hilton North Hollywood', type: LocationType.HOTEL, isActive: true, address: '11350 Burbank Blvd, North Hollywood, CA 91601' },
  { id: 'hotel-11', name: 'Sheraton Gateway Los Angeles Hotel', type: LocationType.HOTEL, isActive: true, address: '6101 W Century Blvd, Los Angeles, CA 90045' },
  { id: 'hotel-12', name: 'Courtyard by Marriott Ventura Simi Valley', type: LocationType.HOTEL, isActive: true, address: '191 Cochran St, Simi Valley, CA 93065' },
  { id: 'hotel-13', name: 'DoubleTree by Hilton Hotel Ontario Airport', type: LocationType.HOTEL, isActive: true, address: '222 N Vineyard Ave, Ontario, CA 91764' },
  { id: 'hotel-14', name: 'Courtyard by Marriott Bakersfield', type: LocationType.HOTEL, isActive: true, address: '3601 Marriott Dr, Bakersfield, CA 93308' },
  { id: 'hotel-15', name: 'Courtyard by Marriott Long Beach Airport', type: LocationType.HOTEL, isActive: true, address: '3841 N Lakewood Blvd, Long Beach, CA 90808' },
  { id: 'hotel-16', name: 'Los Angeles Airport Marriott', type: LocationType.HOTEL, isActive: true, address: '5855 W Century Blvd, Los Angeles, CA 90045, USA' },
  { id: 'hotel-17', name: 'Marina Del Rey Marriott', type: LocationType.HOTEL, isActive: true, address: '4100 Admiralty Way, Marina Del Rey, CA 90292' },
  { id: 'hotel-18', name: 'Hilton Garden Inn Dana Point Doheny Beach', type: LocationType.HOTEL, isActive: true, address: '34402 Pacific Coast Hwy, Dana Point, CA 92629' },
  { id: 'hotel-19', name: 'Hotel Indigo Los Angeles Downtown, an IHG Hotel', type: LocationType.HOTEL, isActive: true, address: '899 Francisco St, Los Angeles, CA 90017' },
  { id: 'hotel-20', name: 'The Westin LAX', type: LocationType.HOTEL, isActive: true, address: '5400 W Century Blvd, Los Angeles, CA 90045, US' },
  { id: 'hotel-21', name: 'Courtyard by Marriott Thousand Oaks Agoura Hills', type: LocationType.HOTEL, isActive: true, address: '29505 Agoura Rd Building B, Agoura Hills, CA 91301' },
  { id: 'hotel-22', name: 'Sheraton Agoura Hills Hotel', type: LocationType.HOTEL, isActive: true, address: '30100 Agoura Rd, Agoura Hills, CA 91301' },
  { id: 'hotel-23', name: 'Irvine Marriott', type: LocationType.HOTEL, isActive: true, address: '18000 Von Karman Ave, Irvine, CA 92612' },
  { id: 'hotel-24', name: 'AC Hotel Beverly Hills', type: LocationType.HOTEL, isActive: true, address: '6399 Wilshire Blvd, Los Angeles, CA 90048' },
  { id: 'hotel-25', name: 'San Diego Marriott Mission Valley', type: LocationType.HOTEL, isActive: true, address: '8757 Rio San Diego Dr, San Diego, CA 92108' },
  { id: 'hotel-26', name: 'Sonesta ES Suites Carmel Mountain San Diego', type: LocationType.HOTEL, isActive: true, address: '11002 Rancho Carmel Dr, San Diego, CA 92128' },
  { id: 'hotel-27', name: 'Holiday Inn Carlsbad - San Diego, an IHG Hotel', type: LocationType.HOTEL, isActive: true, address: '2725 Palomar Airport Rd, Carlsbad, CA 92009' },
  { id: 'hotel-28', name: 'Staybridge Suites Carlsbad - San Diego, an IHG Hotel', type: LocationType.HOTEL, isActive: true, address: '2735 Palomar Airport Rd, Carlsbad, CA 92009' },
  { id: 'hotel-29', name: 'Carte Hotel San Diego Downtown, Curio Collection by Hilton', type: LocationType.HOTEL, isActive: true, address: '401 W Ash St, San Diego, CA 92101' },
  { id: 'hotel-30', name: 'Courtyard by Marriott San Diego Downtown Little Italy', type: LocationType.HOTEL, isActive: true, address: '1646 Front St, San Diego, CA 92101' },
  { id: 'hotel-31', name: 'Crowne Plaza San Diego - Mission Valley by IHG', type: LocationType.HOTEL, isActive: true, address: '2270 Hotel Cir N, San Diego, CA 92108' },
  { id: 'hotel-32', name: 'SpringHill Suites by Marriott San Diego Escondido/Downtown', type: LocationType.HOTEL, isActive: true, address: '200 La Terraza Blvd, Escondido, CA 92025' },
  { id: 'hotel-33', name: 'Hampton Inn San Diego/Mission Valley', type: LocationType.HOTEL, isActive: true, address: '2151 Hotel Cir S, San Diego, CA 92108' },
  { id: 'hotel-34', name: 'TownePlace Suites by Marriott San Diego Carlsbad/Vista', type: LocationType.HOTEL, isActive: true, address: '2201 S Melrose Dr, Vista, CA 92081' },
  { id: 'hotel-35', name: 'The Viv Hotel, Anaheim, a Tribute Portfolio Hotel', type: LocationType.HOTEL, isActive: true, address: '1601 S Anaheim Blvd, Anaheim, CA 92805' },
  { id: 'hotel-36', name: 'The Westin South Coast Plaza, Costa Mesa', type: LocationType.HOTEL, isActive: true, address: '686 Anton Blvd, Costa Mesa, CA 92626' },
  { id: 'hotel-37', name: 'Courtyard by Marriott Irvine John Wayne Airport/Orange County', type: LocationType.HOTEL, isActive: true, address: '2701 Main St, Irvine, CA 92614' },
  { id: 'hotel-38', name: 'Le Méridien Pasadena Arcadia', type: LocationType.HOTEL, isActive: true, address: '130 W Huntington Dr, Arcadia, CA 91007' },
  { id: 'hotel-39', name: 'Homewood Suites by Hilton San Bernardino', type: LocationType.HOTEL, isActive: true, address: '885 E Hospitality Ln, San Bernardino, CA 92408' },
  { id: 'hotel-40', name: 'Candlewood Suites Loma Linda - San Bernardino S by IHG', type: LocationType.HOTEL, isActive: true, address: '10372 Richardson St, Loma Linda, CA 92354' },
  { id: 'hotel-41', name: 'Holiday Inn Express & Suites Loma Linda- San Bernardino S by IHG', type: LocationType.HOTEL, isActive: true, address: '25222 Redlands Blvd, Loma Linda, CA 92354' },
  { id: 'hotel-42', name: 'Four Points by Sheraton Ontario-Rancho Cucamonga', type: LocationType.HOTEL, isActive: true, address: '11960 Foothill Blvd, Rancho Cucamonga, CA 91739' },
  { id: 'hotel-43', name: 'InterContinental Los Angeles Downtown by IHG', type: LocationType.HOTEL, isActive: true, address: '900 Wilshire Blvd, Los Angeles, CA 90017' },
  { id: 'hotel-44', name: 'DoubleTree by Hilton Hotel San Bernardino', type: LocationType.HOTEL, isActive: true, address: '285 E Hospitality Ln, San Bernardino, CA 92408' },
  { id: 'hotel-45', name: 'TownePlace Suites by Marriott San Bernardino Loma Linda', type: LocationType.HOTEL, isActive: true, address: '10336 Richardson St, Loma Linda, CA 92354' },
  { id: 'hotel-46', name: 'Courtyard San Bernardino Loma Linda', type: LocationType.HOTEL, isActive: true, address: '10354 Richardson St, Loma Linda, CA 92354' },
  { id: 'hotel-47', name: 'Courtyard by Marriott Thousand Oaks Ventura County', type: LocationType.HOTEL, isActive: true, address: '1710 Newbury Rd, Thousand Oaks, CA 91320' },
  { id: 'hotel-48', name: 'Warner Center Marriott Woodland Hills', type: LocationType.HOTEL, isActive: true, address: '21850 Oxnard St, Woodland Hills, CA 91367' },
  { id: 'hotel-49', name: 'Courtyard by Marriott Chino Hills', type: LocationType.HOTEL, isActive: true, address: '15433 Fairfield Ranch Rd, Chino Hills, CA 91709' },
  { id: 'hotel-50', name: 'Hampton Inn & Suites Moreno Valley', type: LocationType.HOTEL, isActive: true, address: '12611 Memorial Way, Moreno Valley, CA 92553' },
  { id: 'hotel-51', name: 'TownePlace Suites by Marriott Ontario Chino Hills', type: LocationType.HOTEL, isActive: true, address: '15881 Pomona Rincon Rd, Chino Hills, CA 91709' },
  { id: 'hotel-52', name: 'Fairfield by Marriott Inn & Suites San Bernardino', type: LocationType.HOTEL, isActive: true, address: '1041 E, 1041 Harriman Pl, San Bernardino, CA 92408' },
  { id: 'hotel-53', name: 'Residence Inn by Marriott San Bernardino', type: LocationType.HOTEL, isActive: true, address: '1040 Harriman Pl, San Bernardino, CA 92408' },
  { id: 'hotel-54', name: 'Courtyard by Marriott Riverside UCR/Moreno Valley Area', type: LocationType.HOTEL, isActive: true, address: '1510 University Ave, Riverside, CA 92507' },
  { id: 'hotel-55', name: 'Fairfield by Marriott Inn & Suites Riverside Corona/Norco', type: LocationType.HOTEL, isActive: true, address: '3441 Hamner Ave, Norco, CA 92860' },
  { id: 'hotel-56', name: 'SpringHill Suites by Marriott Corona Riverside', type: LocationType.HOTEL, isActive: true, address: '2025 Compton Ave, Corona, CA 92881' },
  { id: 'hotel-57', name: 'DoubleTree by Hilton Hotel San Diego - Mission Valley', type: LocationType.HOTEL, isActive: true, address: '7450 Hazard Center Dr, San Diego, CA 92108' },
  { id: 'hotel-58', name: 'Courtyard by Marriott San Diego Downtown', type: LocationType.HOTEL, isActive: true, address: '530 Broadway, San Diego, CA 92101' },
  { id: 'hotel-59', name: 'SpringHill Suites by Marriott Los Angeles Downey', type: LocationType.HOTEL, isActive: true, address: '9066 Firestone Blvd, Downey, CA 90241' },
  { id: 'hotel-60', name: 'Courtyard by Marriott San Diego Carlsbad', type: LocationType.HOTEL, isActive: true, address: '5835 Owens Ave, Carlsbad, CA 92008' },
  { id: 'hotel-61', name: 'Fairfield by Marriott Inn & Suites San Diego Carlsbad', type: LocationType.HOTEL, isActive: true, address: '1929 Palomar Oaks Way, Carlsbad, CA 92011' },
  { id: 'hotel-62', name: 'Residence Inn by Marriott Ontario Rancho Cucamonga', type: LocationType.HOTEL, isActive: true, address: '9299 Haven Ave, Rancho Cucamonga, CA 91730' },
  { id: 'hotel-63', name: 'Residence Inn by Marriott Los Angeles Torrance/Redondo Beach', type: LocationType.HOTEL, isActive: true, address: '3701 Torrance Blvd, Torrance, CA 90503' },
  { id: 'hotel-64', name: 'Delta Hotels Anaheim Garden Grove', type: LocationType.HOTEL, isActive: true, address: '12021 Harbor Blvd, Garden Grove, CA 92840' },
  { id: 'hotel-65', name: 'SLS Hotel, a Luxury Collection Hotel, Beverly Hills', type: LocationType.HOTEL, isActive: true, address: '465 La Cienega Blvd, Los Angeles, CA 90048' },
  { id: 'hotel-66', name: 'Hilton Anaheim', type: LocationType.HOTEL, isActive: true, address: '777 W Convention Way, Anaheim, CA 92802' },
  { id: 'hotel-67', name: 'Anaheim Suites', type: LocationType.HOTEL, isActive: true, address: '12015 Harbor Blvd, Garden Grove, CA 92840' },
  { id: 'hotel-68', name: 'JW Marriott, Anaheim Resort', type: LocationType.HOTEL, isActive: true, address: '1775 S Clementine St, Anaheim, CA 92802' },
  { id: 'hotel-69', name: 'Residence Inn by Marriott Pasadena Arcadia', type: LocationType.HOTEL, isActive: true, address: '321 E Huntington Dr, Arcadia, CA 91006' },
  { id: 'hotel-70', name: 'DoubleTree by Hilton Hotel Los Angeles - Rosemead', type: LocationType.HOTEL, isActive: true, address: '888 Montebello Blvd, Rosemead, CA 91770' },
  { id: 'hotel-71', name: 'Fairfield Inn Anaheim Hills Orange County', type: LocationType.HOTEL, isActive: true, address: '201 N Via Cortez, Anaheim, CA 92807' },
  { id: 'hotel-72', name: 'Sheraton Los Angeles San Gabriel', type: LocationType.HOTEL, isActive: true, address: '303 E Valley Blvd, San Gabriel, CA 91776' },
  { id: 'hotel-73', name: 'Courtyard by Marriott Los Angeles Baldwin Park', type: LocationType.HOTEL, isActive: true, address: '14635 Baldwin Park Towne Center, Baldwin Park, CA 91706' },
  { id: 'hotel-74', name: 'Fullerton Marriott at California State University', type: LocationType.HOTEL, isActive: true, address: '2701 Nutwood Ave, Fullerton, CA 92831' },
  { id: 'hotel-75', name: 'Residence Inn by Marriott Santa Clarita Valencia', type: LocationType.HOTEL, isActive: true, address: '25320 the Old Rd, Stevenson Ranch, CA, 91381' },
  { id: 'hotel-76', name: 'TownePlace Suites by Marriott Ontario Airport', type: LocationType.HOTEL, isActive: true, address: '9625 Milliken Ave, Rancho Cucamonga, CA 91730' },
  { id: 'hotel-77', name: 'Home2 Suites by Hilton San Bernardino', type: LocationType.HOTEL, isActive: true, address: '837 E Brier Dr, San Bernardino, CA 92408' },
  { id: 'hotel-78', name: 'DoubleTree by Hilton Los Angeles – Norwalk', type: LocationType.HOTEL, isActive: true, address: '13111 Sycamore Dr, Norwalk, CA 90650' },
  { id: 'hotel-79', name: 'Delta Hotels Ontario Airport', type: LocationType.HOTEL, isActive: true, address: '2200 E Holt Blvd, Ontario, CA 91761' },
  { id: 'hotel-80', name: 'Holiday Inn la Mirada – Buena Park by IHG', type: LocationType.HOTEL, isActive: true, address: '14299 Firestone Blvd, La Mirada, CA 90638' },
  { id: 'hotel-81', name: 'Residence Inn by Marriott Palmdale Lancaster', type: LocationType.HOTEL, isActive: true, address: '847 West Lancaster Boulevard, Lancaster, CA, 93534' },
  { id: 'hotel-82', name: 'Sonesta ES Suites San Diego - Sorrento Mesa', type: LocationType.HOTEL, isActive: true, address: '6639 Mira Mesa Blvd, San Diego, CA 92121' },
  { id: 'hotel-83', name: 'Courtyard by Marriott Costa Mesa South Coast Metro', type: LocationType.HOTEL, isActive: true, address: '3002 S Harbor Blvd, Santa Ana, CA 92704' },
  { id: 'hotel-84', name: 'DoubleTree by Hilton Whittier Los Angeles', type: LocationType.HOTEL, isActive: true, address: '7320 Greenleaf Ave, Whittier, CA 90602' },
  { id: 'hotel-85', name: 'Residence Inn by Marriott Cypress Los Alamitos', type: LocationType.HOTEL, isActive: true, address: '4931 Katella Ave, Los Alamitos, CA 90720' },
  { id: 'hotel-86', name: 'Sheraton Cerritos Hotel', type: LocationType.HOTEL, isActive: true, address: '12725 Center Ct Dr S, Cerritos, CA 90703' },
  { id: 'hotel-87', name: 'Courtyard by Marriott San Diego Mission Valley/Hotel Circle', type: LocationType.HOTEL, isActive: true, address: '595 Hotel Cir S, San Diego, CA 92108' },
  { id: 'hotel-88', name: 'Courtyard by Marriott Victorville Hesperia', type: LocationType.HOTEL, isActive: true, address: '9619 Mariposa Rd, Hesperia, CA 92345' },
  { id: 'hotel-89', name: 'Sonesta ES Suites San Diego - Rancho Bernardo', type: LocationType.HOTEL, isActive: true, address: '11855 Avenue of Industry, San Diego, CA, 92128' },
  { id: 'hotel-90', name: 'Embassy Suites by Hilton Temecula Valley Wine Country', type: LocationType.HOTEL, isActive: true, address: '29345 Rancho California Rd, Temecula, CA 92591' },
  
  // Worksites (Updated)
  { id: 'ws-1', name: 'Downey MC', type: LocationType.WORKSITE, isActive: true, address: '9333 Imperial Hwy. Downey CA 90242' },
  { id: 'ws-2', name: 'Panorama City MC', type: LocationType.WORKSITE, isActive: true, address: '8120 Woodman Ave, Panorama City, CA 91402' },
  { id: 'ws-3', name: 'LAMC Mental Health Center', type: LocationType.WORKSITE, isActive: true, address: '765 W College St, Los Angeles, CA 90012' },
  { id: 'ws-4', name: 'Irvine MC', type: LocationType.WORKSITE, isActive: true, address: '6650 Alton Parkway. Irvine, CA 92618' },
  { id: 'ws-5', name: 'Carson Medical Office', type: LocationType.WORKSITE, isActive: true, address: '18600 S. Figueroa Street, Gardena CA 90248' },
  { id: 'ws-6', name: 'Porter Ranch MOB Family Medicine', type: LocationType.WORKSITE, isActive: true, address: '20000 Rinaldi St, Porter Ranch, CA 91326' },
  { id: 'ws-7', name: 'Ontario Medical Center MOB A & D', type: LocationType.WORKSITE, isActive: true, address: '2295 S. Vineyard Ave Ontario, CA 91761' },
  { id: 'ws-8', name: 'Stockdale Urgent Care', type: LocationType.WORKSITE, isActive: true, address: '9900 Stockdale Hwy, Suite 105, Bakersfield, CA 93311' },
  { id: 'ws-9', name: 'West LA MC', type: LocationType.WORKSITE, isActive: true, address: '6041 Cadillac Avenue, Los Angeles, CA 90034' },
  { id: 'ws-10', name: 'Woodland Hills MC', type: LocationType.WORKSITE, isActive: true, address: '5601 De Soto, Woodland Hills, Ca 91367' },
  { id: 'ws-11', name: 'Normandie North Medical Offices', type: LocationType.WORKSITE, isActive: true, address: '25965 S. Normandie Ave., Harbor City, CA 90710' },
  { id: 'ws-12', name: 'MVJ Medical Office', type: LocationType.WORKSITE, isActive: true, address: '23781 Maquina Avenue, Mission Viejo, CA 92691' },
  { id: 'ws-13', name: 'San Diego Medical Center', type: LocationType.WORKSITE, isActive: true, address: '9455 Clairemont Mesa Blvd, San Diego, CA 92123' },
  { id: 'ws-14', name: 'Chester I MOB', type: LocationType.WORKSITE, isActive: true, address: '2531 Chester Ave, Bakersfield, CA 93301' },
  { id: 'ws-15', name: 'Zion Medical Center', type: LocationType.WORKSITE, isActive: true, address: '4647 Zion Ave, San Diego, CA 92120' },
  { id: 'ws-16', name: 'San Marcos Medical Center', type: LocationType.WORKSITE, isActive: true, address: '360 Rush Drive, San Marcos, CA 92078' },
  { id: 'ws-17', name: 'HBM Medical Office', type: LocationType.WORKSITE, isActive: true, address: '3401 S. Harbor Blvd., Santa Ana, CA 92704' },
  { id: 'ws-18', name: 'Downey MC - Orchard MOB', type: LocationType.WORKSITE, isActive: true, address: '9449 Imperial Hwy Downey CA 90242' },
  { id: 'ws-19', name: 'FPL Med Office', type: LocationType.WORKSITE, isActive: true, address: '3280 E Foothill Blvd, Los Angeles, CA 90022' },
  { id: 'ws-20', name: 'LAMC', type: LocationType.WORKSITE, isActive: true, address: '4867 Sunset Blvd., Los Angeles, CA 90027' },
  { id: 'ws-21', name: 'Fontana Medical Center', type: LocationType.WORKSITE, isActive: true, address: '9961 Sierra Ave., Fontana, CA 92335' },
  { id: 'ws-22', name: 'Los Angeles Medical Center', type: LocationType.WORKSITE, isActive: true, address: '4867 Sunset Blvd., Los Angeles, CA 90027' },
  { id: 'ws-23', name: 'FMC MOB 1& 2, MOB 3', type: LocationType.WORKSITE, isActive: true, address: '9961 Sierra Ave Fontana, CA 92335' },
  { id: 'ws-24', name: 'KP-4700 Sunset', type: LocationType.WORKSITE, isActive: true, address: '4700 Sunset Blvd, LA 90027' },
  { id: 'ws-25', name: 'Market Street MOB', type: LocationType.WORKSITE, isActive: true, address: '4949 Market St, Ventura, CA 93003' },
  { id: 'ws-26', name: 'Riverside Medical Center MOB', type: LocationType.WORKSITE, isActive: true, address: '10800 Magnolia Ave Riverside, CA. 92505' },
  { id: 'ws-27', name: 'Riverside MC', type: LocationType.WORKSITE, isActive: true, address: '10800 Magnolia Ave, Riverside, CA 92505' },
  { id: 'ws-28', name: 'Baldwin Park MC', type: LocationType.WORKSITE, isActive: true, address: '1011 Baldwin Park Blvd., Baldwin Park, Ca 91706' },
  { id: 'ws-29', name: 'OTM Medical Office', type: LocationType.WORKSITE, isActive: true, address: '4650 Palm Ave. San Diego, CA 92154' },
  { id: 'ws-30', name: 'Downey MC- Garden MOB', type: LocationType.WORKSITE, isActive: true, address: '9353 Imperial Hwy Downey CA 90242' },
  { id: 'ws-31', name: 'South Bay MC', type: LocationType.WORKSITE, isActive: true, address: '25825 S. Vermont Ave, Harbor City CA 90710' },
  { id: 'ws-32', name: 'Ontario Medical Center', type: LocationType.WORKSITE, isActive: true, address: '2295 South Vineyard, Ontario, CA 91761' },
  { id: 'ws-33', name: 'Stockdale', type: LocationType.WORKSITE, isActive: true, address: '3501 Stockdale Hwy, Bakersfield, CA 93309' },
  { id: 'ws-34', name: 'Coastline Medical Office Building', type: LocationType.WORKSITE, isActive: true, address: '25821 S. Vermont Ave. Harbor City, CA 90710' },
  { id: 'ws-35', name: 'Kraemer Medical Office 2', type: LocationType.WORKSITE, isActive: true, address: '3430 E La Palma Avenue, Anaheim, California 92806' },
  { id: 'ws-36', name: 'Baldwin Hills Crenshaw Med Office', type: LocationType.WORKSITE, isActive: true, address: '3782 W Martin Luther King Jr. Boulevard, Los Angeles CA 90008' },
  { id: 'ws-37', name: 'Anaheim MC', type: LocationType.WORKSITE, isActive: true, address: '3430 E La Palma Avenue, Anaheim, CA 92806' },
  { id: 'ws-38', name: 'Center of Healthy Living', type: LocationType.WORKSITE, isActive: true, address: '74 N Pasadena, Avenue, Pasadena, CA 8th Floor, Pasadena, California 91101' },
  { id: 'ws-39', name: 'Pharmacy Central Order', type: LocationType.WORKSITE, isActive: true, address: '12254 Bellflower Blvd, Downey, California 90242' },
  { id: 'ws-40', name: 'Panorama City-Main Campus (MO2, MO3, MO4, MO5, MO6)', type: LocationType.WORKSITE, isActive: true, address: '13652 Cantara Street Panorama City, CA 91402' },
  { id: 'ws-41', name: 'VMC Clinical', type: LocationType.WORKSITE, isActive: true, address: '17284 Slover Ave, Fontana, CA 92337' },
  { id: 'ws-42', name: 'Bellflower MOB', type: LocationType.WORKSITE, isActive: true, address: '9400 Rosecrans Ave. Bellflower, CA 90706' },
  { id: 'ws-43', name: 'San Marcos MOB', type: LocationType.WORKSITE, isActive: true, address: '400 Craven Rd, San Marcos, CA 92078' },
  { id: 'ws-44', name: 'Vandever MOB', type: LocationType.WORKSITE, isActive: true, address: '4405 Vandever Av, San Diego, CA 92120' },
  { id: 'ws-45', name: 'LAN Mob', type: LocationType.WORKSITE, isActive: true, address: '43112 15th Street West, Lancaster 93534' },
  { id: 'ws-46', name: 'Pharmacy Mail Order Pharm and Tech', type: LocationType.WORKSITE, isActive: true, address: '9521 Dalen Street, Downey, CA 90242' },
  { id: 'ws-47', name: 'EMO Medical Office', type: LocationType.WORKSITE, isActive: true, address: '1188 N. Euclid Street, Anaheim, CA 92801' },
  { id: 'ws-48', name: 'GG Medical Office', type: LocationType.WORKSITE, isActive: true, address: '12100 Euclid Street, Garden Grove, CA 92840' },
  { id: 'ws-49', name: 'High Desert MOB', type: LocationType.WORKSITE, isActive: true, address: '14011 Park Ave Victorville, CA 92392' },
  { id: 'ws-50', name: 'KP-4900 Sunset', type: LocationType.WORKSITE, isActive: true, address: '4900 Sunset Blvd, LA 90027' },
  { id: 'ws-51', name: 'Regional L&D Advice Nurse', type: LocationType.WORKSITE, isActive: true, address: '4867 Sunset Blvd., Los Angeles, CA 90027' },
  { id: 'ws-52', name: 'KP-4950 Sunset', type: LocationType.WORKSITE, isActive: true, address: '4950 Sunset Blvd, Los Angeles 90027' },
  { id: 'ws-53', name: 'Murrieta Medical Office Building', type: LocationType.WORKSITE, isActive: true, address: '28150 Keller Road Murrieta, CA 92563' },
  { id: 'ws-54', name: 'Santa Clarita MOB 2', type: LocationType.WORKSITE, isActive: true, address: '26877 Tourney Rd, Santa Clarita, CA 91355' },
];

// Sort locations alphabetically
INITIAL_LOCATIONS.sort((a, b) => a.name.localeCompare(b.name));

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Initial Load
export const loadData = (): AppData => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    
    // Ensure the system admin exists if the DB was wiped or is empty
    if (!parsed.users || parsed.users.length === 0) {
        parsed.users = INITIAL_USERS;
    }

    // Migration helper for old data
    if (parsed.users.length > 0) {
      parsed.users = parsed.users.map((u: any) => {
        if (!u.permissions) {
          return { ...u, permissions: DEFAULT_PERMISSIONS };
        }
        // Ensure new field exists
        if (u.permissions.allowedLocationIds === undefined && !('allowedLocationIds' in u.permissions)) {
             u.permissions.allowedLocationIds = undefined;
        }
        return u;
      });
    }
    // Ensure busCheckIns exists
    if (!parsed.busCheckIns) {
      parsed.busCheckIns = [];
    }
    return parsed;
  }
  return {
    users: INITIAL_USERS,
    locations: INITIAL_LOCATIONS,
    logs: [],
    busCheckIns: [],
    messages: [],
    currentUser: null,
  };
};

export const saveData = (data: AppData) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

// API Simulation Actions

export const registerUser = (firstName: string, lastName: string, phone: string): User => {
  const data = loadData();
  const isFirstUser = data.users.length === 0;
  
  // First user (Admin) is automatically assigned to the first hotel for demo purposes
  // if not already set.
  const currentLocationId = isFirstUser ? 'hotel-1' : undefined;
  
  const newUser: User = {
    id: generateId(),
    firstName,
    lastName,
    phone,
    // With seeded admin, isFirstUser will effectively always be false for new registrations
    // This ensures new users are always PENDING AGENTS unless they are the seeded admin.
    role: isFirstUser ? UserRole.ADMIN : UserRole.AGENT,
    status: isFirstUser ? UserStatus.ACTIVE : UserStatus.PENDING,
    permissions: DEFAULT_PERMISSIONS,
    joinedAt: new Date().toISOString(),
    currentLocationId
  };

  data.users.push(newUser);
  saveData(data);
  return newUser;
};

export const loginUser = (firstName: string, lastName: string, phone: string): User | null => {
  const data = loadData();
  const user = data.users.find(u => 
    u.firstName.toLowerCase() === firstName.toLowerCase() && 
    u.lastName.toLowerCase() === lastName.toLowerCase() && 
    u.phone === phone
  );
  return user || null;
};

export const createLog = (entry: Omit<LogEntry, 'id' | 'timestamp' | 'status'>): LogEntry => {
  const data = loadData();
  const newLog: LogEntry = {
    ...entry,
    id: generateId(),
    timestamp: new Date().toISOString(),
    status: TripStatus.IN_TRANSIT,
  };
  data.logs.push(newLog);
  saveData(data);
  return newLog;
};

export const createBusCheckIn = (entry: Omit<BusCheckIn, 'id' | 'timestamp'>): BusCheckIn => {
  const data = loadData();
  const newCheckIn: BusCheckIn = {
    ...entry,
    id: generateId(),
    timestamp: new Date().toISOString(),
  };
  
  if (!data.busCheckIns) data.busCheckIns = [];
  data.busCheckIns.push(newCheckIn);
  saveData(data);
  return newCheckIn;
};

export const markTripArrived = (logId: string): void => {
  const data = loadData();
  const idx = data.logs.findIndex(l => l.id === logId);
  if (idx !== -1) {
    data.logs[idx].status = TripStatus.ARRIVED;
    data.logs[idx].actualArrivalTime = new Date().toISOString();
    saveData(data);
  }
};

export const sendMessage = (fromId: string, toId: string, content: string): Message => {
  const data = loadData();
  const msg: Message = {
    id: generateId(),
    fromUserId: fromId,
    toUserId: toId,
    content,
    timestamp: new Date().toISOString(),
    isRead: false,
  };
  data.messages.push(msg);
  saveData(data);
  return msg;
};

export const markMessagesAsRead = (fromUserId: string, toUserId: string) => {
  const data = loadData();
  let changed = false;
  data.messages.forEach(msg => {
    if (msg.fromUserId === fromUserId && msg.toUserId === toUserId && !msg.isRead) {
      msg.isRead = true;
      changed = true;
    }
  });
  if (changed) saveData(data);
};

export const updateUserStatus = (userId: string, status: UserStatus) => {
  const data = loadData();
  const idx = data.users.findIndex(u => u.id === userId);
  if (idx !== -1) {
    data.users[idx].status = status;
    saveData(data);
  }
};

export const toggleUserRole = (userId: string) => {
  const data = loadData();
  const idx = data.users.findIndex(u => u.id === userId);
  if (idx !== -1) {
    const currentRole = data.users[idx].role;
    data.users[idx].role = currentRole === UserRole.ADMIN ? UserRole.AGENT : UserRole.ADMIN;
    saveData(data);
  }
};

export const toggleUserPermission = (userId: string, permission: keyof UserPermissions) => {
  const data = loadData();
  const idx = data.users.findIndex(u => u.id === userId);
  if (idx !== -1) {
    // Note: This toggle only works for boolean permissions. allowedLocationIds is handled separately.
    if (permission !== 'allowedLocationIds') {
        data.users[idx].permissions[permission] = !data.users[idx].permissions[permission];
        saveData(data);
    }
  }
};

export const updateUserAllowedLocations = (userId: string, locationIds: string[] | undefined) => {
    const data = loadData();
    const idx = data.users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      data.users[idx].permissions.allowedLocationIds = locationIds;
      saveData(data);
    }
};

export const updateUserLocation = (userId: string, locationId: string) => {
  const data = loadData();
  const idx = data.users.findIndex(u => u.id === userId);
  if (idx !== -1) {
    data.users[idx].currentLocationId = locationId;
    saveData(data);
  }
};

export const updateUserAssignedWorksite = (userId: string, worksiteId: string) => {
  const data = loadData();
  const idx = data.users.findIndex(u => u.id === userId);
  if (idx !== -1) {
    data.users[idx].assignedWorksiteId = worksiteId;
    saveData(data);
  }
};

export const toggleLocation = (locationId: string) => {
  const data = loadData();
  const idx = data.locations.findIndex(l => l.id === locationId);
  if (idx !== -1) {
    data.locations[idx].isActive = !data.locations[idx].isActive;
    saveData(data);
  }
};

export const addLocation = (name: string, type: LocationType, address?: string): Location => {
  const data = loadData();
  const newLocation: Location = {
    id: generateId(),
    name,
    type,
    isActive: true,
    address: address || ''
  };
  data.locations.push(newLocation);
  saveData(data);
  return newLocation;
};

export const updateLocation = (id: string, updates: Partial<Location>) => {
  const data = loadData();
  const idx = data.locations.findIndex(l => l.id === id);
  if (idx !== -1) {
    data.locations[idx] = { ...data.locations[idx], ...updates };
    saveData(data);
  }
};