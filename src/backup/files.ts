/** A backup file ready to leave the app. */
export type BackupFile = { name: string; text: string };

/** Hands a backup file to the Learner. `cancelled` means he closed the share sheet: not an error. */
export type BackupFiles = { save(file: BackupFile): Promise<'saved' | 'cancelled'> };

/**
 * On iPhone the share sheet ("Save to Files", AirDrop, Mail…) is the way to get a file out of a
 * Home Screen app, so share when the browser can share files and download otherwise (desktop).
 * Must be called straight from a tap: Safari only shares during the tap's user activation.
 */
export function createBrowserBackupFiles(): BackupFiles {
  return {
    async save({ name, text }) {
      const file = new File([text], name, { type: 'application/json' });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file] });
          return 'saved';
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
          throw error;
        }
      }
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      document.body.append(link);
      link.click();
      link.remove();
      // Revoke on a later turn, after the browser has started the download.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return 'saved';
    },
  };
}

/** In-memory fake for tests. `saved` records every file handed over; `next` sets the outcome. */
export function createMemoryBackupFiles(): BackupFiles & { saved: BackupFile[]; next: 'saved' | 'cancelled' | Error } {
  const fake = {
    saved: [] as BackupFile[],
    next: 'saved' as 'saved' | 'cancelled' | Error,
    async save(file: BackupFile) {
      fake.saved.push(file);
      if (fake.next instanceof Error) throw fake.next;
      return fake.next;
    },
  };
  return fake;
}
