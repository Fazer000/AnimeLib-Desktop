import {
  ACTIVE_DOWNLOAD_STATUSES,
  DownloadStatus,
  isActiveDownload,
} from '../constants/offline';

const ALL: DownloadStatus[] = [
  'queued',
  'downloading',
  'paused',
  'completed',
  'error',
  'cancelled',
];

describe('isActiveDownload', () => {
  it('незавершённые статусы считает активными', () => {
    expect(isActiveDownload('queued')).toBe(true);
    expect(isActiveDownload('downloading')).toBe(true);
    expect(isActiveDownload('paused')).toBe(true);
  });

  it('завершённые статусы активными не считает', () => {
    expect(isActiveDownload('completed')).toBe(false);
    expect(isActiveDownload('error')).toBe(false);
    expect(isActiveDownload('cancelled')).toBe(false);
  });

  it('делит все статусы без остатка', () => {
    const active = ALL.filter(isActiveDownload);

    expect(active).toEqual(ACTIVE_DOWNLOAD_STATUSES);
    expect(ALL.length - active.length).toBe(3);
  });
});
