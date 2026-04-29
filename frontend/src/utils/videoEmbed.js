export function getYouTubeEmbedUrl(value = '') {
  const input = `${value}`.trim();
  if (!input) return '';

  let parsed;
  try {
    parsed = new URL(input);
  } catch {
    return '';
  }

  const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
  let videoId = '';

  if (host === 'youtu.be') {
    videoId = parsed.pathname.split('/').filter(Boolean)[0] || '';
  } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
    if (parsed.pathname === '/watch') {
      videoId = parsed.searchParams.get('v') || '';
    } else if (parsed.pathname.startsWith('/shorts/')) {
      videoId = parsed.pathname.split('/')[2] || '';
    } else if (parsed.pathname.startsWith('/embed/')) {
      videoId = parsed.pathname.split('/')[2] || '';
    }
  }

  videoId = `${videoId}`.trim();
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return '';

  return `https://www.youtube.com/embed/${videoId}`;
}

export function isYouTubeUrl(value = '') {
  return Boolean(getYouTubeEmbedUrl(value));
}
