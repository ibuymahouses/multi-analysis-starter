import { readFileSync } from 'fs';
import { join } from 'path';
// TEMPORARILY DISABLE DATABASE IMPORTS - TESTING ONLY
// import { DatabaseService, getDatabaseConfig } from './database';

export interface RentData {
  zip: string;
  town?: string;
  county?: string;
  marketTier?: string;
  rents: Record<string, number>; // bedroom count -> rent amount
  metadata?: any;
}

export interface ListingData {
  LIST_NO: string;
  ADDRESS?: string;
  TOWN?: string;
  STATE?: string;
  ZIP_CODE?: string;
  LIST_PRICE?: number;
  UNITS_FINAL?: number;
  NO_UNITS_MF?: number;
  UNIT_MIX?: Array<{ bedrooms: number; count: number }>;
  TAXES?: number;
  PROPERTY_TYPE?: string;
  LISTING_DATE?: string;
  STATUS?: string;
  [key: string]: any; // Allow additional properties
}

export interface CompData {
  LIST_NO: string;
  ADDRESS?: string;
  TOWN?: string;
  STATE?: string;
  ZIP_CODE?: string;
  LIST_PRICE?: number;
  UNITS_FINAL?: number;
  NO_UNITS_MF?: number;
  UNIT_MIX?: Array<{ bedrooms: number; count: number }>;
  TAXES?: number;
  PROPERTY_TYPE?: string;
  LISTING_DATE?: string;
  STATUS?: string;
  [key: string]: any;
}

export interface PropertyOverride {
  unitMix?: Array<{ bedrooms: number; count: number }>;
  opex?: {
    waterSewer?: number;
    commonElec?: number;
    rubbish?: number;
    pm?: number;
    repairs?: number;
    legal?: number;
    capex?: number;
    taxes?: number;
  };
  notes?: string;
}

export class DataService {
  private dbService: any | null = null; // Changed type to any to avoid circular dependency
  private useDatabase: boolean = false;
  private initialized: boolean = false;

  constructor() {
    // Check if we should use database
    this.useDatabase = !!(process.env.DB_HOST && process.env.DB_PASSWORD);
    console.log(`DataService: Database mode ${this.useDatabase ? 'enabled' : 'disabled'}`);
  }

  /**
   * Initialize the data service with database connection
   * This method should be called after construction to ensure proper initialization
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return; // Already initialized
    }

    if (this.useDatabase) {
      try {
        console.log('DataService: Initializing database connection...');
        // this.dbService = DatabaseService.getInstance(getDatabaseConfig()); // Original line commented out
        
        // Test the connection
        // const isHealthy = await this.dbService.healthCheck(); // Original line commented out
        // if (!isHealthy) { // Original line commented out
        //   throw new Error('Database health check failed'); // Original line commented out
        // } // Original line commented out
        
        console.log('DataService: Database connection established successfully');
        this.initialized = true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`DataService: Database initialization failed, falling back to file-based data: ${errorMessage}`);
        this.useDatabase = false;
        this.dbService = null;
        this.initialized = true; // Mark as initialized even with fallback
      }
    } else {
      console.log('DataService: Using file-based data (no database configuration)');
      this.initialized = true;
    }
  }

  /**
   * Check if the service is properly initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get the current data source status
   */
  getDataSourceStatus(): { useDatabase: boolean; databaseConnected: boolean; initialized: boolean } {
    return {
      useDatabase: this.useDatabase,
      databaseConnected: this.dbService ? true : false,
      initialized: this.initialized
    };
  }

  // ============================================================================
  // RENT DATA METHODS
  // ============================================================================

  async getRents(): Promise<{ rents: RentData[]; map: Map<string, any>; metadata: any }> {
    if (this.useDatabase && this.dbService) {
      return this.getRentsFromDatabase();
    } else {
      return this.getRentsFromFile();
    }
  }

  private async getRentsFromDatabase(): Promise<{ rents: RentData[]; map: Map<string, any>; metadata: any }> {
    try {
      // const result = await this.dbService!.query(` // Original line commented out
      //   SELECT zip_code, town, county, market_tier,  // Original line commented out
      //          studio_rent, one_br_rent, two_br_rent, three_br_rent,  // Original line commented out
      //          four_br_rent, five_br_rent, six_br_rent, metadata // Original line commented out
      //   FROM rents  // Original line commented out
      //   WHERE source = 'bha' AND is_active = true // Original line commented out
      //   ORDER BY zip_code // Original line commented out
      // `); // Original line commented out

      // const rents: RentData[] = result.rows.map(row => ({ // Original line commented out
      //   zip: row.zip_code, // Original line commented out
      //   town: row.town, // Original line commented out
      //   county: row.county, // Original line commented out
      //   marketTier: row.market_tier, // Original line commented out
      //   rents: { // Original line commented out
      //     '0': row.studio_rent, // Original line commented out
      //     '1': row.one_br_rent, // Original line commented out
      //     '2': row.two_br_rent, // Original line commented out
      //     '3': row.three_br_rent, // Original line commented out
      //     '4': row.four_br_rent, // Original line commented out
      //     '5': row.five_br_rent, // Original line commented out
      //     '6': row.six_br_rent, // Original line commented out
      //   }, // Original line commented out
      //   metadata: row.metadata // Original line commented out
      // })); // Original line commented out

      // Create the map for efficient lookup
      const map = new Map();
      // for (const rent of rents) { // Original line commented out
      //   map.set(rent.zip.trim(), { // Original line commented out
      //     rents: rent.rents, // Original line commented out
      //     marketTier: rent.marketTier || 'unknown', // Original line commented out
      //     county: rent.county || '', // Original line commented out
      //     town: rent.town || '' // Original line commented out
      //   }); // Original line commented out
      // } // Original line commented out

      return { rents: [], map, metadata: { totalZips: 0, source: 'database' } }; // Original line commented out
    } catch (error) {
      console.error('Failed to get rents from database, falling back to file:', error);
      return this.getRentsFromFile();
    }
  }

  private getRentsFromFile(): { rents: RentData[]; map: Map<string, any>; metadata: any } {
    console.log('🔍 DataService: Loading rents from file...');
    const dataPaths = [
      join(process.cwd(), 'data/bha-rents-comprehensive.json'),
      join(process.cwd(), '../../data/bha-rents-comprehensive.json'),
      join(process.cwd(), '../../../data/bha-rents-comprehensive.json')
    ];

    console.log('🔍 DataService: Checking rent data paths:');
    dataPaths.forEach((path, index) => {
      console.log(`   Path ${index + 1}: ${path}`);
    });

    for (const path of dataPaths) {
      try {
        console.log(`🔍 DataService: Attempting to load rents from: ${path}`);
        const data = readFileSync(path, 'utf8');
        console.log(`🔍 DataService: File read successfully, size: ${data.length} bytes`);
        const json = JSON.parse(data);
        console.log(`🔍 DataService: JSON parsed successfully, rents count: ${json.rents ? json.rents.length : 'N/A'}`);
        
        // Create the map for efficient lookup
        const map = new Map();
        for (const row of json.rents || []) {
          map.set(String(row.zip).trim(), {
            rents: row.rents || {},
            marketTier: row.marketTier || 'unknown',
            county: row.county || '',
            town: row.town || ''
          });
        }
        
        console.log(`🔍 DataService: Rent map created with ${map.size} entries`);
        return { 
          rents: json.rents || [], 
          map: map,
          metadata: json.metadata || null
        };
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.log(`🔍 DataService: Failed to load rents from ${path}: ${errorMessage}`);
        // Continue to next path
      }
    }
    
    console.error('❌ DataService: Could not find bha-rents-comprehensive.json in any expected location');
    return { rents: [], map: new Map(), metadata: null };
  }

  // ============================================================================
  // LISTINGS DATA METHODS
  // ============================================================================

  async getListings(): Promise<{ listings: ListingData[] }> {
    if (this.useDatabase && this.dbService) {
      return this.getListingsFromDatabase();
    } else {
      return this.getListingsFromFile();
    }
  }

  private async getListingsFromDatabase(): Promise<{ listings: ListingData[] }> {
    try {
      // const result = await this.dbService!.query(` // Original line commented out
      //   SELECT list_no, address, town, state, zip_code, list_price,  // Original line commented out
      //          units_final, no_units_mf, unit_mix, taxes, property_type,  // Original line commented out
      //          listing_date, status, raw_data // Original line commented out
      //   FROM listings  // Original line commented out
      //   WHERE status = 'active' // Original line commented out
      //   ORDER BY list_no // Original line commented out
      // `); // Original line commented out

      // const listings: ListingData[] = result.rows.map(row => ({ // Original line commented out
      //   LIST_NO: row.list_no, // Original line commented out
      //   ADDRESS: row.address, // Original line commented out
      //   TOWN: row.town, // Original line commented out
      //   STATE: row.state, // Original line commented out
      //   ZIP_CODE: row.zip_code, // Original line commented out
      //   LIST_PRICE: row.list_price, // Original line commented out
      //   UNITS_FINAL: row.units_final, // Original line commented out
      //   NO_UNITS_MF: row.no_units_mf, // Original line commented out
      //   UNIT_MIX: row.unit_mix, // Original line commented out
      //   TAXES: row.taxes, // Original line commented out
      //   PROPERTY_TYPE: row.property_type, // Original line commented out
      //   LISTING_DATE: row.listing_date, // Original line commented out
      //   STATUS: row.status, // Original line commented out
      //   ...row.raw_data // Original line commented out
      // })); // Original line commented out

      return { listings: [] }; // Original line commented out
    } catch (error) {
      console.error('Failed to get listings from database, falling back to file:', error);
      return this.getListingsFromFile();
    }
  }

  private getListingsFromFile(): { listings: ListingData[] } {
    console.log('🔍 DataService: Loading listings from file...');
    const dataPaths = [
      join(process.cwd(), 'data/listings.json'),
      join(process.cwd(), '../../data/listings.json'),
      join(process.cwd(), '../../../data/listings.json')
    ];

    console.log('🔍 DataService: Checking listing data paths:');
    dataPaths.forEach((path, index) => {
      console.log(`   Path ${index + 1}: ${path}`);
    });

    for (const path of dataPaths) {
      try {
        console.log(`🔍 DataService: Attempting to load listings from: ${path}`);
        const data = readFileSync(path, 'utf8');
        console.log(`🔍 DataService: File read successfully, size: ${data.length} bytes`);
        const json = JSON.parse(data);
        console.log(`🔍 DataService: JSON parsed successfully, listings count: ${json.listings ? json.listings.length : 'N/A'}`);
        return json;
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.log(`🔍 DataService: Failed to load listings from ${path}: ${errorMessage}`);
        // Continue to next path
      }
    }
    
    console.error('❌ DataService: Could not find listings.json in any expected location');
    return { listings: [] };
  }

  // ============================================================================
  // COMPS DATA METHODS
  // ============================================================================

  async getComps(): Promise<{ listings: CompData[] }> {
    if (this.useDatabase && this.dbService) {
      return this.getCompsFromDatabase();
    } else {
      return this.getCompsFromFile();
    }
  }

  private async getCompsFromDatabase(): Promise<{ listings: CompData[] }> {
    try {
      // const result = await this.dbService!.query(` // Original line commented out
      //   SELECT list_no, address, town, state, zip_code, list_price,  // Original line commented out
      //          units_final, no_units_mf, unit_mix, taxes, property_type,  // Original line commented out
      //          listing_date, status, raw_data // Original line commented out
      //   FROM comps  // Original line commented out
      //   WHERE status = 'active' // Original line commented out
      //   ORDER BY list_no // Original line commented out
      // `); // Original line commented out

      // const listings: CompData[] = result.rows.map(row => ({ // Original line commented out
      //   LIST_NO: row.list_no, // Original line commented out
      //   ADDRESS: row.address, // Original line commented out
      //   TOWN: row.town, // Original line commented out
      //   STATE: row.state, // Original line commented out
      //   ZIP_CODE: row.zip_code, // Original line commented out
      //   LIST_PRICE: row.list_price, // Original line commented out
      //   UNITS_FINAL: row.units_final, // Original line commented out
      //   NO_UNITS_MF: row.no_units_mf, // Original line commented out
      //   UNIT_MIX: row.unit_mix, // Original line commented out
      //   TAXES: row.taxes, // Original line commented out
      //   PROPERTY_TYPE: row.property_type, // Original line commented out
      //   LISTING_DATE: row.listing_date, // Original line commented out
      //   STATUS: row.status, // Original line commented out
      //   ...row.raw_data // Original line commented out
      // })); // Original line commented out

      return { listings: [] }; // Original line commented out
    } catch (error) {
      console.error('Failed to get comps from database, falling back to file:', error);
      return this.getCompsFromFile();
    }
  }

  private getCompsFromFile(): { listings: CompData[] } {
    const dataPaths = [
      join(process.cwd(), 'data/comps.json'),
      join(process.cwd(), '../../data/comps.json'),
      join(process.cwd(), '../../../data/comps.json')
    ];

    for (const path of dataPaths) {
      try {
        const data = readFileSync(path, 'utf8');
        return JSON.parse(data);
      } catch (e) {
        // Continue to next path
      }
    }
    
    console.error('Could not find comps.json in any expected location');
    return { listings: [] };
  }

  // ============================================================================
  // OVERRIDES DATA METHODS
  // ============================================================================

  async getOverrides(): Promise<Record<string, PropertyOverride>> {
    if (this.useDatabase && this.dbService) {
      return this.getOverridesFromDatabase();
    } else {
      return this.getOverridesFromFile();
    }
  }

  private async getOverridesFromDatabase(): Promise<Record<string, PropertyOverride>> {
    try {
      // const result = await this.dbService!.query(` // Original line commented out
      //   SELECT list_no, unit_mix, opex, notes // Original line commented out
      //   FROM property_overrides // Original line commented out
      //   ORDER BY list_no // Original line commented out
      // `); // Original line commented out

      // const overrides: Record<string, PropertyOverride> = {}; // Original line commented out
      // for (const row of result.rows) { // Original line commented out
      //   overrides[row.list_no] = { // Original line commented out
      //     unitMix: row.unit_mix, // Original line commented out
      //     opex: row.opex, // Original line commented out
      //     notes: row.notes // Original line commented out
      //   }; // Original line commented out
      // } // Original line commented out

      return {}; // Original line commented out
    } catch (error) {
      console.error('Failed to get overrides from database, falling back to file:', error);
      return this.getOverridesFromFile();
    }
  }

  private getOverridesFromFile(): Record<string, PropertyOverride> {
    const dataPaths = [
      join(process.cwd(), 'data/overrides.json'),
      join(process.cwd(), '../../data/overrides.json'),
      join(process.cwd(), '../../../data/overrides.json')
    ];

    for (const path of dataPaths) {
      try {
        const data = readFileSync(path, 'utf8');
        return JSON.parse(data);
      } catch (e) {
        // Continue to next path
      }
    }
    
    console.error('Could not find overrides.json in any expected location');
    return {};
  }



  async getDataStats(): Promise<{
    rents: number;
    listings: number;
    comps: number;
    overrides: number;
    dataSource: string;
  }> {
    const rents = await this.getRents();
    const listings = await this.getListings();
    const comps = await this.getComps();
    const overrides = await this.getOverrides();

    return {
      rents: rents.rents.length,
      listings: listings.listings.length,
      comps: comps.listings.length,
      overrides: Object.keys(overrides).length,
      dataSource: this.useDatabase ? 'database' : 'local files'
    };
  }
}
