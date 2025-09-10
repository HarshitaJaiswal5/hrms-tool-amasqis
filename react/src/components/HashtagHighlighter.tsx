import React from 'react';
import { Link } from 'react-router-dom';

interface HashtagHighlighterProps {
  text: string;
  className?: string;
}

const HashtagHighlighter: React.FC<HashtagHighlighterProps> = ({ text, className = '' }) => {
  if (!text) return null;

  // Regex to match hashtags (word characters, numbers, underscores)
  const hashtagRegex = /(?:^|\s)#([a-zA-Z0-9_]+)(?=\s|$|[^a-zA-Z0-9_])/g;

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = hashtagRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const hashtag = match[1];
    parts.push(
      <Link
        key={`hashtag-${match.index}`}
        to="#"
        className="text-primary fw-medium text-decoration-none"
        title={`View posts with #${hashtag}`}
      >
        #{hashtag}
      </Link>
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  if (parts.length === 0) {
    return <span className={className}>{text}</span>;
  }

  return <span className={className}>{parts}</span>;
};

export default HashtagHighlighter;
