import { describe, it, expect } from 'vitest';
import { localeDefaults, upgradeSettings } from '../../js/state/migrate.js';

describe('localeDefaults', () => {
  it('gives es* locales Spanish and fixed-do names', () => {
    for (const l of ['es', 'es-MX', 'es-419', 'ES-es'])
      expect(localeDefaults(l)).toEqual({ lang: 'es', naming: 'solf', degNaming: 'num' });
  });

  it('gives every other locale English and letter names', () => {
    for (const l of ['en-US', 'pt-BR', 'et', '', undefined])
      expect(localeDefaults(l)).toEqual({ lang: 'en', naming: 'sharp', degNaming: 'num' });
  });
});

describe('upgradeSettings', () => {
  // Before degree labels had their own setting, choosing Do-Re-Mi note names also
  // switched degrees to movable-do syllables. Stored profiles keep what they saw.
  it('keeps movable-do degree labels for profiles that used solfege names', () => {
    expect(upgradeSettings({ naming: 'solf' }).degNaming).toBe('movable');
    expect(upgradeSettings({ naming: 'flat' }).degNaming).toBe('num');
  });

  it('leaves an explicit choice alone', () => {
    expect(upgradeSettings({ naming: 'solf', degNaming: 'num' }).degNaming).toBe('num');
  });
});
