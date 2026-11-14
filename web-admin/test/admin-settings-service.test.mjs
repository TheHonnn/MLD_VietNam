import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

test('settings.service.ts exists and declares all system configuration interfaces and API methods', () => {
  const servicePath = new URL('../src/services/settings.service.ts', import.meta.url);
  assert.ok(existsSync(servicePath), 'settings.service.ts must exist');

  const content = readFileSync(servicePath, 'utf8');

  // Verify typed interfaces
  assert.match(content, /export interface CompanySettings/);
  assert.match(content, /export interface BookingSettings/);
  assert.match(content, /export interface PosSettings/);
  assert.match(content, /export interface AcademySettings/);
  assert.match(content, /export interface IntegrationsSettings/);
  assert.match(content, /export interface SecuritySettings/);
  assert.match(content, /export interface SystemSettingsState/);

  // Verify default state
  assert.match(content, /export const DEFAULT_SETTINGS_STATE: SystemSettingsState/);
  assert.match(content, /MLD Healthcare & Spa/);
  assert.match(content, /08:30/);
  assert.match(content, /receipt_header_text/);

  // Verify API methods and matching endpoints
  assert.match(content, /getAllSettings/);
  assert.match(content, /adminCommand<AllSettingsResponse>\('settings'/);

  assert.match(content, /getSettingsByCategory/);
  assert.match(content, /adminApi<\{ data: T \}>\(`settings\/\$\{category\}`/);

  assert.match(content, /updateSettings/);
  assert.match(content, /adminCommand<\{ success: boolean; message: string; data\?: T \}>\(`settings\/\$\{category\}`/);

  assert.match(content, /testZnsConnection/);
  assert.match(content, /adminCommand<\{ success: boolean; message: string; timestamp: string \}>\('settings\/test-zns'/);

  assert.match(content, /changePassword/);
  assert.match(content, /adminCommand<\{ success: boolean; message: string \}>\('settings\/change-password'/);
});

test('useAdminSettings.ts hook exists and manages loading, dirty checking and persistence', () => {
  const hookPath = new URL('../src/hooks/useAdminSettings.ts', import.meta.url);
  assert.ok(existsSync(hookPath), 'useAdminSettings.ts must exist');

  const content = readFileSync(hookPath, 'utf8');

  // Verify hook export
  assert.match(content, /export function useAdminSettings\(/);

  // Verify state tracking
  assert.match(content, /const \[settings, setSettings\]/);
  assert.match(content, /const \[originalSettings, setOriginalSettings\]/);
  assert.match(content, /const \[loading, setLoading\]/);
  assert.match(content, /const \[saving, setSaving\]/);

  // Verify dirty state calculation
  assert.match(content, /isCategoryDirty/);
  assert.match(content, /isDirty:/);

  // Verify mutation and action handlers
  assert.match(content, /updateField/);
  assert.match(content, /saveCategory/);
  assert.match(content, /resetCategory/);
  assert.match(content, /testZns/);
  assert.match(content, /changePassword/);

  // Verify toast notifications
  assert.match(content, /toast\.success/);
  assert.match(content, /toast\.error/);
});
