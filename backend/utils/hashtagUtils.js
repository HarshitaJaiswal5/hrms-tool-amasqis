export const extractHashtags = (text) => {
  if (!text || typeof text !== 'string') return [];
  // Match hashtags that start with # followed by word characters (letters, numbers, underscore)
  // Excludes hashtags that are part of URLs or email addresses
  const hashtagRegex = /(?:^|\s)#([a-zA-Z0-9_]+)(?=\s|$|[^a-zA-Z0-9_])/g;

  const hashtags = [];
  let match;

  while ((match = hashtagRegex.exec(text)) !== null) {
    const hashtag = match[1].toLowerCase().trim();
    if (hashtag.length > 0 && hashtag.length <= 50) {
      hashtags.push(hashtag);
    }
  }

  return [...new Set(hashtags)];
};

export const cleanHashtag = (hashtag) => {
  if (!hashtag || typeof hashtag !== 'string') return '';

  return hashtag
    .replace(/^#/, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, '');
};

export const isValidHashtag = (hashtag) => {
  if (!hashtag || typeof hashtag !== 'string') return false;

  const cleaned = cleanHashtag(hashtag);
  return cleaned.length > 0 &&
         cleaned.length <= 50 &&
         /^[a-zA-Z0-9_]+$/.test(cleaned);
};
