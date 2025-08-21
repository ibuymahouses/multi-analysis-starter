import { readFileSync } from 'fs';
import { join } from 'path';
import { DatabaseService, getDatabaseConfig } from './database';

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
  private dbService: DatabaseService | null = null;
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
        this.dbService = DatabaseService.getInstance(getDatabaseConfig());
        
        // Test the connection
        const isHealthy = await this.dbService.healthCheck();
        if (!isHealthy) {
          throw new Error('Database health check failed');
        }
        
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
      const result = await this.dbService!.query(`
        SELECT zip_code, town, county, market_tier, 
               studio_rent, one_br_rent, two_br_rent, three_br_rent, 
               four_br_rent, five_br_rent, six_br_rent, metadata
        FROM rents 
        WHERE source = 'bha' AND is_active = true
        ORDER BY zip_code
      `);

      const rents: RentData[] = result.rows.map(row => ({
        zip: row.zip_code,
        town: row.town,
        county: row.county,
        marketTier: row.market_tier,
        rents: {
          '0': row.studio_rent,
          '1': row.one_br_rent,
          '2': row.two_br_rent,
          '3': row.three_br_rent,
          '4': row.four_br_rent,
          '5': row.five_br_rent,
          '6': row.six_br_rent,
        },
        metadata: row.metadata
      }));

      // Create the map for efficient lookup
      const map = new Map();
      for (const rent of rents) {
        map.set(rent.zip.trim(), {
          rents: rent.rents,
          marketTier: rent.marketTier || 'unknown',
          county: rent.county || '',
          town: rent.town || ''
        });
      }

      return { rents, map, metadata: { totalZips: rents.length, source: 'database' } };
    } catch (error) {
      console.error('Failed to get rents from database, falling back to file:', error);
      return this.getRentsFromFile();
    }
  }

  private getRentsFromFile(): { rents: RentData[]; map: Map<string, any>; metadata: any } {
    const dataPaths = [
      join(process.cwd(), 'data/bha-rents-comprehensive.json'),
      join(process.cwd(), '../../data/bha-rents-comprehensive.json'),
      join(process.cwd(), '../../../data/bha-rents-comprehensive.json')
    ];

    for (const path of dataPaths) {
      try {
        const data = readFileSync(path, 'utf8');
        const json = JSON.parse(data);
        
        // Process the data into a Map for efficient lookup
        const map = new Map();
        for (const row of json.rents || []) {
          map.set(String(row.zip).trim(), {
            rents: row.rents || {},
            marketTier: row.marketTier || 'unknown',
            county: row.county || '',
            town: row.town || ''
          });
        }
        
        return { 
          rents: json.rents || [], 
          map: map,
          metadata: json.metadata || null
        };
      } catch (e) {
        // Continue to next path
      }
    }
    
    console.error('Could not find bha-rents-comprehensive.json in any expected location');
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
      const result = await this.dbService!.query(`
        SELECT list_no, address, town, state, zip_code, list_price, 
               units_final, no_units_mf, unit_mix, taxes, property_type, 
               listing_date, status, raw_data
        FROM listings 
        WHERE status = 'active'
        ORDER BY list_no
      `);

      const listings: ListingData[] = result.rows.map(row => ({
        LIST_NO: row.list_no,
        ADDRESS: row.address,
        TOWN: row.town,
        STATE: row.state,
        ZIP_CODE: row.zip_code,
        LIST_PRICE: row.list_price,
        UNITS_FINAL: row.units_final,
        NO_UNITS_MF: row.no_units_mf,
        UNIT_MIX: row.unit_mix,
        TAXES: row.taxes,
        PROPERTY_TYPE: row.property_type,
        LISTING_DATE: row.listing_date,
        STATUS: row.status,
        ...row.raw_data // Merge any additional properties from raw_data
      }));

      return { listings };
    } catch (error) {
      console.error('Failed to get listings from database, falling back to file:', error);
      return this.getListingsFromFile();
    }
  }

  private getListingsFromFile(): { listings: ListingData[] } {
    const dataPaths = [
      join(process.cwd(), 'data/listings.json'),
      join(process.cwd(), '../../data/listings.json'),
      join(process.cwd(), '../../../data/listings.json')
    ];

    for (const path of dataPaths) {
      try {
        const data = readFileSync(path, 'utf8');
        return JSON.parse(data);
      } catch (e) {
        // Continue to next path
      }
    }
    
    console.error('Could not find listings.json in any expected location');
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
      const result = await this.dbService!.query(`
        SELECT list_no, address, town, state, zip_code, list_price, 
               units_final, no_units_mf, unit_mix, taxes, property_type, 
               listing_date, status, raw_data
        FROM comps 
        WHERE status = 'active'
        ORDER BY list_no
      `);

      const listings: CompData[] = result.rows.map(row => ({
        LIST_NO: row.list_no,
        ADDRESS: row.address,
        TOWN: row.town,
        STATE: row.state,
        ZIP_CODE: row.zip_code,
        LIST_PRICE: row.list_price,
        UNITS_FINAL: row.units_final,
        NO_UNITS_MF: row.no_units_mf,
        UNIT_MIX: row.unit_mix,
        TAXES: row.taxes,
        PROPERTY_TYPE: row.property_type,
        LISTING_DATE: row.listing_date,
        STATUS: row.status,
        ...row.raw_data
      }));

      return { listings };
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
      const result = await this.dbService!.query(`
        SELECT list_no, unit_mix, opex, notes
        FROM property_overrides
        ORDER BY list_no
      `);

      const overrides: Record<string, PropertyOverride> = {};
      for (const row of result.rows) {
        overrides[row.list_no] = {
          unitMix: row.unit_mix,
          opex: row.opex,
          notes: row.notes
        };
      }

      return overrides;
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
