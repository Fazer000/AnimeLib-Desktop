import React from 'react';
import { Link } from '@mui/material';

interface Props {
  text: string;
}

/** Ссылки Markdown в описании релиза без исполнения HTML. */
export default function ReleaseNotesText({ text }: Props) {
  const pattern = /\[([^\]\n]+)\]\((https?:\/\/(?:[^\s()]|\([^\s()]*\))+)\)/gi;
  const parts: React.ReactNode[] = [];
  let offset = 0;
  let match = pattern.exec(text);
  while (match) {
    const [source, label, href] = match;
    parts.push(text.slice(offset, match.index));
    try {
      const url = new URL(href);
      parts.push(
        <Link
          key={match.index}
          href={url.href}
          target="_blank"
          rel="noopener noreferrer"
          underline="hover"
          sx={{
            color: 'inherit',
            textDecoration: 'underline',
            overflowWrap: 'anywhere',
          }}
        >
          {label}
        </Link>,
      );
    } catch {
      parts.push(source);
    }
    offset = match.index + source.length;
    match = pattern.exec(text);
  }
  parts.push(text.slice(offset));
  return <span>{parts}</span>;
}
