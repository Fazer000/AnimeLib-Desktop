import {
  REPORT_NEW_ISSUE_URL,
  REPORT_TITLE_MAX,
  ReportEnvironment,
  ReportPayload,
  buildIssueBody,
  buildIssueTitle,
  buildIssueUrl,
  formatOs,
} from '../constants/report';

const ENV: ReportEnvironment = {
  appVersion: '1.7.0',
  os: 'Windows 10.0.26100 (x64)',
};

const payload = (patch: Partial<ReportPayload> = {}): ReportPayload => ({
  kind: 'bug',
  title: 'Плеер не открывается',
  description: 'Нажимаю на серию, остаётся белый экран',
  ...patch,
});

describe('formatOs', () => {
  it('подставляет читаемое название платформы', () => {
    expect(formatOs('win32', '10.0.26100', 'x64')).toBe(
      'Windows 10.0.26100 (x64)',
    );
    expect(formatOs('darwin', '23.5.0', 'arm64')).toBe('macOS 23.5.0 (arm64)');
  });

  it('незнакомую платформу оставляет как есть', () => {
    expect(formatOs('freebsd', '14.0', 'x64')).toBe('freebsd 14.0 (x64)');
  });
});

describe('buildIssueTitle', () => {
  it('добавляет префикс категории', () => {
    expect(buildIssueTitle(payload())).toBe(
      '[Ошибка в приложении] Плеер не открывается',
    );
    expect(buildIssueTitle(payload({ kind: 'feature' }))).toBe(
      '[Предложение] Плеер не открывается',
    );
  });

  it('обрезает пробелы и длину заголовка', () => {
    expect(buildIssueTitle(payload({ title: '  Лишние пробелы  ' }))).toBe(
      '[Ошибка в приложении] Лишние пробелы',
    );

    const long = 'а'.repeat(REPORT_TITLE_MAX + 40);
    expect(buildIssueTitle(payload({ title: long }))).toBe(
      `[Ошибка в приложении] ${'а'.repeat(REPORT_TITLE_MAX)}`,
    );
  });

  it('пустой заголовок оставляет только префикс', () => {
    expect(buildIssueTitle(payload({ title: '   ' }))).toBe(
      '[Ошибка в приложении]',
    );
  });
});

describe('buildIssueBody', () => {
  it('содержит описание и окружение', () => {
    const body = buildIssueBody(payload(), ENV);

    expect(body).toContain('Нажимаю на серию, остаётся белый экран');
    expect(body).toContain('- Версия приложения: 1.7.0');
    expect(body).toContain('- ОС: Windows 10.0.26100 (x64)');
  });

  it('пустое описание заменяет заглушкой', () => {
    expect(buildIssueBody(payload({ description: '  ' }), ENV)).toContain(
      '_Описание не заполнено_',
    );
  });
});

describe('buildIssueUrl', () => {
  it('собирает ссылку на форму с полями title и body', () => {
    const url = new URL(buildIssueUrl(payload(), ENV));

    expect(`${url.origin}${url.pathname}`).toBe(REPORT_NEW_ISSUE_URL);
    expect(url.searchParams.get('title')).toBe(buildIssueTitle(payload()));
    expect(url.searchParams.get('body')).toBe(buildIssueBody(payload(), ENV));
  });

  it('экранирует спецсимволы в полях', () => {
    const url = buildIssueUrl(payload({ title: 'a&b=c #1' }), ENV);

    expect(url).not.toContain('a&b=c #1');
    expect(new URL(url).searchParams.get('title')).toContain('a&b=c #1');
  });
});
