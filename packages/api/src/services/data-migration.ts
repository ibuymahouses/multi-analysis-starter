import { readFileSync } from 'fs';
import { join } from 'path';
import { DatabaseService } from './database';
import { DataService } from './data-service';

export interface MigrationResult {
  success: boolean;
  recordsProcessed: number;
  recordsAdded: number;
  recordsUpdated: number;
  recordsDeleted: number;
  errors: string[];
  duration: number;
}

export class DataMigrationService {
  private dbService: DatabaseService;
  private dataService: DataService;

  constructor(dbService: DatabaseService) {
    this.dbService = dbService;
    this.dataService = new DataService();
  }

  // ============================================================================
  // MIGRATE ALL DATA FROM FILES TO DATABASE
  // ============================================================================

  async migrateAllData(): Promise<{
    rents: MigrationResult;
    listings: MigrationResult;
    comps: MigrationResult;
    overrides: MigrationResult;
  }> {
    console.log('🚀 Starting full data migration from files to database...');
    
    const startTime = Date.now();
    
    try {
      // Ensure database schema is up to date
      await this.ensureSchema();
      
      // Migrate each data type
      const [rents, listings, comps, overrides] = await Promise.all([
        this.migrateRents(),
        this.migrateListings(),
        this.migrateComps(),
        this.migrateOverrides()
      ]);

      const totalDuration = Date.now() - startTime;
      console.log(`✅ Full data migration completed in ${totalDuration}ms`);
      
      return { rents, listings, comps, overrides };
    } catch (error) {
      console.error('❌ Full data migration failed:', error);
      throw error;
    }
  }

  // ============================================================================
  // INDIVIDUAL MIGRATION METHODS
  // ============================================================================

  async migrateRents(): Promise<MigrationResult> {
    const startTime = Date.now();
    const result: MigrationResult = {
      success: false,
      recordsProcessed: 0,
      recordsAdded: 0,
      recordsUpdated: 0,
      recordsDeleted: 0,
      errors: [],
      duration: 0
    };

    try {
      console.log('📊 Migrating rent data...');
      
      // Get rent data from files
      const { rents } = await this.dataService.getRents();
      result.recordsProcessed = rents.length;

      if (rents.length === 0) {
        throw new Error('No rent data found in files');
      }

      // Migrate to database
      await this.dbService.transaction(async (client) => {
        for (const rent of rents) {
          try {
            const existing = await client.query(
              'SELECT id FROM rents WHERE zip_code = $1 AND source = $2',
              [rent.zip, 'bha']
            );

            if (existing.rows.length > 0) {
              // Update existing record
              await client.query(`
                UPDATE rents SET 
                  town = $1, county = $2, market_tier = $3,
                  studio_rent = $4, one_br_rent = $5, two_br_rent = $6,
                  three_br_rent = $7, four_br_rent = $8, five_br_rent = $9,
                  six_br_rent = $10, metadata = $11, updated_at = NOW()
                WHERE zip_code = $12 AND source = $13
              `, [
                rent.town, rent.county, rent.marketTier,
                rent.rents['0'], rent.rents['1'], rent.rents['2'],
                rent.rents['3'], rent.rents['4'], rent.rents['5'],
                rent.rents['6'], JSON.stringify(rent.metadata),
                rent.zip, 'bha'
              ]);
              result.recordsUpdated++;
            } else {
              // Insert new record
              await client.query(`
                INSERT INTO rents (
                  zip_code, town, county, market_tier,
                  studio_rent, one_br_rent, two_br_rent, three_br_rent,
                  four_br_rent, five_br_rent, six_br_rent, metadata, source
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
              `, [
                rent.zip, rent.town, rent.county, rent.marketTier,
                rent.rents['0'], rent.rents['1'], rent.rents['2'],
                rent.rents['3'], rent.rents['4'], rent.rents['5'],
                rent.rents['6'], JSON.stringify(rent.metadata), 'bha'
              ]);
              result.recordsAdded++;
            }
          } catch (error) {
            result.errors.push(`Failed to migrate rent for zip ${rent.zip}: ${error.message}`);
          }
        }
      });

      result.success = true;
      result.duration = Date.now() - startTime;
      console.log(`✅ Rent migration completed: ${result.recordsAdded} added, ${result.recordsUpdated} updated`);
      
    } catch (error) {
      result.errors.push(`Rent migration failed: ${error.message}`);
      console.error('❌ Rent migration failed:', error);
    }

    return result;
  }

  async migrateListings(): Promise<MigrationResult> {
    const startTime = Date.now();
    const result: MigrationResult = {
      success: false,
      recordsProcessed: 0,
      recordsAdded: 0,
      recordsUpdated: 0,
      recordsDeleted: 0,
      errors: [],
      duration: 0
    };

    try {
      console.log('🏠 Migrating listing data...');
      
      // Get listing data from files
      const { listings } = await this.dataService.getListings();
      result.recordsProcessed = listings.length;

      if (listings.length === 0) {
        throw new Error('No listing data found in files');
      }

      // Migrate to database
      await this.dbService.transaction(async (client) => {
        for (const listing of listings) {
          try {
            const existing = await client.query(
              'SELECT id FROM listings WHERE list_no = $1',
              [listing.LIST_NO]
            );

            if (existing.rows.length > 0) {
              // Update existing record
              await client.query(`
                UPDATE listings SET 
                  address = $1, town = $2, state = $3, zip_code = $4,
                  list_price = $5, units_final = $6, no_units_mf = $7,
                  unit_mix = $8, taxes = $9, property_type = $10,
                  listing_date = $11, status = $12, raw_data = $13, updated_at = NOW()
                WHERE list_no = $14
              `, [
                listing.ADDRESS, listing.TOWN, listing.STATE, listing.ZIP_CODE,
                listing.LIST_PRICE, listing.UNITS_FINAL, listing.NO_UNITS_MF,
                JSON.stringify(listing.UNIT_MIX), listing.TAXES, listing.PROPERTY_TYPE,
                listing.LISTING_DATE, listing.STATUS || 'active', JSON.stringify(listing),
                listing.LIST_NO
              ]);
              result.recordsUpdated++;
            } else {
              // Insert new record
              await client.query(`
                INSERT INTO listings (
                  list_no, address, town, state, zip_code, list_price,
                  units_final, no_units_mf, unit_mix, taxes, property_type,
                  listing_date, status, raw_data
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
              `, [
                listing.LIST_NO, listing.ADDRESS, listing.TOWN, listing.STATE, listing.ZIP_CODE,
                listing.LIST_PRICE, listing.UNITS_FINAL, listing.NO_UNITS_MF,
                JSON.stringify(listing.UNIT_MIX), listing.TAXES, listing.PROPERTY_TYPE,
                listing.LISTING_DATE, listing.STATUS || 'active', JSON.stringify(listing)
              ]);
              result.recordsAdded++;
            }
          } catch (error) {
            result.errors.push(`Failed to migrate listing ${listing.LIST_NO}: ${error.message}`);
          }
        }
      });

      result.success = true;
      result.duration = Date.now() - startTime;
      console.log(`✅ Listing migration completed: ${result.recordsAdded} added, ${result.recordsUpdated} updated`);
      
    } catch (error) {
      result.errors.push(`Listing migration failed: ${error.message}`);
      console.error('❌ Listing migration failed:', error);
    }

    return result;
  }

  async migrateComps(): Promise<MigrationResult> {
    const startTime = Date.now();
    const result: MigrationResult = {
      success: false,
      recordsProcessed: 0,
      recordsAdded: 0,
      recordsUpdated: 0,
      recordsDeleted: 0,
      errors: [],
      duration: 0
    };

    try {
      console.log('📈 Migrating comps data...');
      
      // Get comps data from files
      const { listings } = await this.dataService.getComps();
      result.recordsProcessed = listings.length;

      if (listings.length === 0) {
        throw new Error('No comps data found in files');
      }

      // Migrate to database
      await this.dbService.transaction(async (client) => {
        for (const comp of listings) {
          try {
            const existing = await client.query(
              'SELECT id FROM comps WHERE list_no = $1',
              [comp.LIST_NO]
            );

            if (existing.rows.length > 0) {
              // Update existing record
              await client.query(`
                UPDATE comps SET 
                  address = $1, town = $2, state = $3, zip_code = $4,
                  list_price = $5, units_final = $6, no_units_mf = $7,
                  unit_mix = $8, taxes = $9, property_type = $10,
                  listing_date = $11, status = $12, raw_data = $13, updated_at = NOW()
                WHERE list_no = $14
              `, [
                comp.ADDRESS, comp.TOWN, comp.STATE, comp.ZIP_CODE,
                comp.LIST_PRICE, comp.UNITS_FINAL, comp.NO_UNITS_MF,
                JSON.stringify(comp.UNIT_MIX), comp.TAXES, comp.PROPERTY_TYPE,
                comp.LISTING_DATE, comp.STATUS || 'active', JSON.stringify(comp),
                comp.LIST_NO
              ]);
              result.recordsUpdated++;
            } else {
              // Insert new record
              await client.query(`
                INSERT INTO comps (
                  list_no, address, town, state, zip_code, list_price,
                  units_final, no_units_mf, unit_mix, taxes, property_type,
                  listing_date, status, raw_data
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
              `, [
                comp.LIST_NO, comp.ADDRESS, comp.TOWN, comp.STATE, comp.ZIP_CODE,
                comp.LIST_PRICE, comp.UNITS_FINAL, comp.NO_UNITS_MF,
                JSON.stringify(comp.UNIT_MIX), comp.TAXES, comp.PROPERTY_TYPE,
                comp.LISTING_DATE, comp.STATUS || 'active', JSON.stringify(comp)
              ]);
              result.recordsAdded++;
            }
          } catch (error) {
            result.errors.push(`Failed to migrate comp ${comp.LIST_NO}: ${error.message}`);
          }
        }
      });

      result.success = true;
      result.duration = Date.now() - startTime;
      console.log(`✅ Comps migration completed: ${result.recordsAdded} added, ${result.recordsUpdated} updated`);
      
    } catch (error) {
      result.errors.push(`Comps migration failed: ${error.message}`);
      console.error('❌ Comps migration failed:', error);
    }

    return result;
  }

  async migrateOverrides(): Promise<MigrationResult> {
    const startTime = Date.now();
    const result: MigrationResult = {
      success: false,
      recordsProcessed: 0,
      recordsAdded: 0,
      recordsUpdated: 0,
      recordsDeleted: 0,
      errors: [],
      duration: 0
    };

    try {
      console.log('⚙️ Migrating overrides data...');
      
      // Get overrides data from files
      const overrides = await this.dataService.getOverrides();
      const overrideEntries = Object.entries(overrides);
      result.recordsProcessed = overrideEntries.length;

      if (overrideEntries.length === 0) {
        console.log('ℹ️ No overrides data found in files');
        result.success = true;
        result.duration = Date.now() - startTime;
        return result;
      }

      // Migrate to database
      await this.dbService.transaction(async (client) => {
        for (const [listNo, override] of overrideEntries) {
          try {
            const existing = await client.query(
              'SELECT id FROM property_overrides WHERE list_no = $1 AND user_id IS NULL',
              [listNo]
            );

            if (existing.rows.length > 0) {
              // Update existing record
              await client.query(`
                UPDATE property_overrides SET 
                  unit_mix = $1, opex = $2, notes = $3, updated_at = NOW()
                WHERE list_no = $4 AND user_id IS NULL
              `, [
                JSON.stringify(override.unitMix), 
                JSON.stringify(override.opex), 
                override.notes,
                listNo
              ]);
              result.recordsUpdated++;
            } else {
              // Insert new record
              await client.query(`
                INSERT INTO property_overrides (
                  list_no, unit_mix, opex, notes
                ) VALUES ($1, $2, $3, $4)
              `, [
                listNo,
                JSON.stringify(override.unitMix),
                JSON.stringify(override.opex),
                override.notes
              ]);
              result.recordsAdded++;
            }
          } catch (error) {
            result.errors.push(`Failed to migrate override for ${listNo}: ${error.message}`);
          }
        }
      });

      result.success = true;
      result.duration = Date.now() - startTime;
      console.log(`✅ Overrides migration completed: ${result.recordsAdded} added, ${result.recordsUpdated} updated`);
      
    } catch (error) {
      result.errors.push(`Overrides migration failed: ${error.message}`);
      console.error('❌ Overrides migration failed:', error);
    }

    return result;
  }

  // ============================================================================
  // SCHEMA MANAGEMENT
  // ============================================================================

  private async ensureSchema(): Promise<void> {
    try {
      console.log('🔧 Ensuring database schema is up to date...');
      
      // Read and execute schema file
      const schemaPath = join(__dirname, '../database/schema.sql');
      const schema = readFileSync(schemaPath, 'utf8');
      
      // Split schema into individual statements
      const statements = schema
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      await this.dbService.transaction(async (client) => {
        for (const statement of statements) {
          if (statement.trim()) {
            try {
              await client.query(statement);
            } catch (error) {
              // Ignore errors for statements that might already exist
              if (!error.message.includes('already exists') && !error.message.includes('duplicate key')) {
                console.warn(`Schema statement warning: ${error.message}`);
              }
            }
          }
        }
      });

      console.log('✅ Database schema verified');
    } catch (error) {
      console.error('❌ Failed to ensure schema:', error);
      throw error;
    }
  }

  // ============================================================================
  // DATA VALIDATION
  // ============================================================================

  async validateMigration(): Promise<{
    databaseCounts: { rents: number; listings: number; comps: number; overrides: number };
    fileCounts: { rents: number; listings: number; comps: number; overrides: number };
    validationPassed: boolean;
    discrepancies: string[];
  }> {
    try {
      // Get counts from database
      const [rentsResult, listingsResult, compsResult, overridesResult] = await Promise.all([
        this.dbService.query('SELECT COUNT(*) as count FROM rents WHERE source = $1', ['bha']),
        this.dbService.query('SELECT COUNT(*) as count FROM listings WHERE status = $1', ['active']),
        this.dbService.query('SELECT COUNT(*) as count FROM comps WHERE status = $1', ['active']),
        this.dbService.query('SELECT COUNT(*) as count FROM property_overrides')
      ]);

      const databaseCounts = {
        rents: parseInt(rentsResult.rows[0].count),
        listings: parseInt(listingsResult.rows[0].count),
        comps: parseInt(compsResult.rows[0].count),
        overrides: parseInt(overridesResult.rows[0].count)
      };

      // Get counts from files
      const fileCounts = await this.dataService.getDataStats();

      const discrepancies: string[] = [];
      let validationPassed = true;

      if (databaseCounts.rents !== fileCounts.rents) {
        discrepancies.push(`Rents: Database has ${databaseCounts.rents}, Files have ${fileCounts.rents}`);
        validationPassed = false;
      }

      if (databaseCounts.listings !== fileCounts.listings) {
        discrepancies.push(`Listings: Database has ${databaseCounts.listings}, Files have ${fileCounts.listings}`);
        validationPassed = false;
      }

      if (databaseCounts.comps !== fileCounts.comps) {
        discrepancies.push(`Comps: Database has ${databaseCounts.comps}, Files have ${fileCounts.comps}`);
        validationPassed = false;
      }

      if (databaseCounts.overrides !== fileCounts.overrides) {
        discrepancies.push(`Overrides: Database has ${databaseCounts.overrides}, Files have ${fileCounts.overrides}`);
        validationPassed = false;
      }

      return {
        databaseCounts,
        fileCounts,
        validationPassed,
        discrepancies
      };
    } catch (error) {
      console.error('❌ Migration validation failed:', error);
      throw error;
    }
  }
}
