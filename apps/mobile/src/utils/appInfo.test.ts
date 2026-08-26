jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.0.2' } },
}));

const mockUpdates = {
  isEmbeddedLaunch: true,
  channel: 'preview',
  runtimeVersion: '1.0.2',
  createdAt: null as Date | null,
};

jest.mock('expo-updates', () => mockUpdates);

describe('getAppInfo', () => {
  beforeEach(() => {
    jest.resetModules();
    mockUpdates.isEmbeddedLaunch = true;
    mockUpdates.channel = 'preview';
    mockUpdates.runtimeVersion = '1.0.2';
    mockUpdates.createdAt = null;
  });

  it('reports the built-in bundle when no OTA update has been applied', () => {
    const { getAppInfo } = require('./appInfo');
    const info = getAppInfo();
    expect(info.version).toBe('1.0.2');
    expect(info.channel).toBe('preview');
    expect(info.runtimeVersion).toBe('1.0.2');
    expect(info.updateSource).toBe('Built-in (no update applied)');
  });

  it('reports the OTA update date when one has been applied', () => {
    mockUpdates.isEmbeddedLaunch = false;
    mockUpdates.createdAt = new Date('2026-08-26T12:00:00Z');
    const { getAppInfo } = require('./appInfo');
    const info = getAppInfo();
    expect(info.updateSource).toMatch(/^OTA update from/);
  });

  it('falls back to "none"/"unknown" for missing channel/runtime fields', () => {
    mockUpdates.channel = '';
    mockUpdates.runtimeVersion = '';
    const { getAppInfo } = require('./appInfo');
    const info = getAppInfo();
    expect(info.channel).toBe('none');
    expect(info.runtimeVersion).toBe('unknown');
  });
});
