import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform, Share } from 'react-native';

/**
 * expo-sharing and expo-file-system are native modules added after the
 * installed build. An over-the-air update can reach a build that lacks
 * them, and importing expo-sharing there throws at load — so they are
 * required lazily, only once the native side is known to exist.
 */
function hasFileSharing(): boolean {
  return (
    requireOptionalNativeModule('ExpoSharing') !== null && requireOptionalNativeModule('ExponentFileSystem') !== null
  );
}

/**
 * Hands a CSV to wherever the user wants it — Drive, email, WhatsApp, or
 * an AI app. On the phone that is the system share sheet with a real .csv
 * file; on a build without the file modules, the same sheet with the CSV as
 * text; on web, a normal browser download.
 */
export async function shareCsv(filename: string, csv: string): Promise<void> {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }

  if (!hasFileSharing()) {
    await Share.share({ title: filename, message: csv.replace(/^﻿/, '') });
    return;
  }

  /* eslint-disable @typescript-eslint/no-require-imports */
  const { File, Paths } = require('expo-file-system') as typeof import('expo-file-system');
  const Sharing = require('expo-sharing') as typeof import('expo-sharing');
  /* eslint-enable @typescript-eslint/no-require-imports */

  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(csv);
  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
    dialogTitle: 'Send your data to…',
  });
}
