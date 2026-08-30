jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.0.2' } },
}));

const mockUpdates = {
  isEmbeddedLaunch: true,
  channel: 'preview',
  runtimeVersion: '1.0.2',
  createdAt: null as Date | null,
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
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

describe('checkForUpdate', () => {
  beforeEach(() => {
    jest.resetModules();
    mockUpdates.isEmbeddedLaunch = false;
    mockUpdates.channel = 'preview';
    mockUpdates.checkForUpdateAsync.mockReset();
    mockUpdates.fetchUpdateAsync.mockReset();
  });

  it('reports up-to-date when nothing is available', async () => {
    mockUpdates.checkForUpdateAsync.mockResolvedValue({ isAvailable: false });
    const { checkForUpdate } = require('./appInfo');

    expect((await checkForUpdate()).status).toBe('up-to-date');
    expect(mockUpdates.fetchUpdateAsync).not.toHaveBeenCalled();
  });

  it('reports updated only when a new bundle actually landed', async () => {
    mockUpdates.checkForUpdateAsync.mockResolvedValue({ isAvailable: true });
    mockUpdates.fetchUpdateAsync.mockResolvedValue({ isNew: true });
    const { checkForUpdate } = require('./appInfo');

    expect((await checkForUpdate()).status).toBe('updated');
  });

  it('does NOT report updated when the fetch produced nothing new', async () => {
    // The old version discarded this result and said 'updated' regardless, so
    // the caller reloaded into a bundle that was never downloaded — which is
    // how devices ended up stuck on a loading screen.
    mockUpdates.checkForUpdateAsync.mockResolvedValue({ isAvailable: true });
    mockUpdates.fetchUpdateAsync.mockResolvedValue({ isNew: false });
    const { checkForUpdate } = require('./appInfo');

    expect((await checkForUpdate()).status).toBe('up-to-date');
  });

  it('gives up rather than hanging when the download stalls', async () => {
    mockUpdates.checkForUpdateAsync.mockResolvedValue({ isAvailable: true });
    // Never settles — exactly the stalled fetch that left the UI spinning.
    mockUpdates.fetchUpdateAsync.mockReturnValue(new Promise(() => {}));
    const { checkForUpdate } = require('./appInfo');

    const result = await checkForUpdate(50);
    expect(result.status).toBe('error');
    expect(result.detail).toMatch(/timed out/i);
  });

  it('times out a stalled availability check too', async () => {
    mockUpdates.checkForUpdateAsync.mockReturnValue(new Promise(() => {}));
    const { checkForUpdate } = require('./appInfo');

    expect((await checkForUpdate(50)).status).toBe('error');
  });

  it('surfaces a network failure instead of throwing', async () => {
    mockUpdates.checkForUpdateAsync.mockRejectedValue(new Error('Network request failed'));
    const { checkForUpdate } = require('./appInfo');

    const result = await checkForUpdate();
    expect(result.status).toBe('error');
    expect(result.detail).toMatch(/Network request failed/);
  });
});
