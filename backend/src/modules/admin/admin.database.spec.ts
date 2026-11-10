import { describe, expect, it } from 'vitest';
import { adminDatabaseSsl } from './admin.database';

describe('adminDatabaseSsl', () => {
  it('disables TLS only for local development databases', () => {
    expect(adminDatabaseSsl('postgresql://postgres:secret@localhost:5432/postgres')).toBe(false);
    expect(adminDatabaseSsl('postgresql://postgres:secret@127.0.0.1:5432/postgres')).toBe(false);
  });

  it('uses encrypted require mode for the managed Supabase pooler CA chain', () => {
    expect(adminDatabaseSsl('postgresql://postgres.project:secret@aws-0-region.pooler.supabase.com:6543/postgres'))
      .toEqual({ rejectUnauthorized: false });
  });

  it('keeps strict certificate verification for every other remote database', () => {
    expect(adminDatabaseSsl('postgresql://postgres:secret@database.example.com:5432/postgres'))
      .toEqual({ rejectUnauthorized: true });
  });
});
