import React from 'react';
import { render, screen } from '@testing-library/react';
import ReleaseNotesText from '../renderer/components/toolbar/ReleaseNotesText';

describe('release notes links', () => {
  it('renders named links and preserves surrounding text', () => {
    render(
      <ReleaseNotesText text="Установить [Frame Forge](https://github.com/Fazer000/FrameForge)." />,
    );
    const link = screen.getByRole('link', { name: 'Frame Forge' });
    expect(link.getAttribute('href')).toBe(
      'https://github.com/Fazer000/FrameForge',
    );
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.parentElement?.textContent).toContain(
      'Установить Frame Forge.',
    );
  });
  it('supports multiple links and parentheses in URLs', () => {
    render(
      <ReleaseNotesText text="[Один](https://example.com/a_(b)) и [Два](https://example.org/)" />,
    );
    expect(screen.getAllByRole('link')).toHaveLength(2);
    expect(
      screen.getByRole('link', { name: 'Один' }).getAttribute('href'),
    ).toBe('https://example.com/a_(b)');
  });
  it('keeps unsafe links and HTML as plain text', () => {
    const { container } = render(
      <ReleaseNotesText text="[Ссылка](javascript:alert(1)) <img src=x onerror=alert(1)>" />,
    );
    expect(screen.queryByRole('link')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('<img');
  });
});
