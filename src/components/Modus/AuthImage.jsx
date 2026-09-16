import React, { useEffect, useState } from 'react';
import { useAuth } from '@trimble-oss/trimble-id-react';
import { readStoredToken } from '../../utils/accessToken';
import { GLOBAL_BASE_URL } from '../../api/config';

/**
 * Most Trimble Connect thumbnails sit behind the API and need a bearer token, so a plain
 * <img src> renders nothing. This fetches the bytes with the token and hands back an object
 * URL instead.
 *
 * Resolved URLs are cached per source for the lifetime of the page: the same avatar shows up
 * in people pickers, group lists and the header, and each should cost one request.
 */
const cache = new Map();

const isPublic = (src) =>
  src.startsWith('data:') || src.startsWith('blob:') || src.includes('resources.connect.trimble.com');

const fetchImage = async (src, getAccessTokenSilently) => {
  if (isPublic(src)) return src;

  const token = await readStoredToken(getAccessTokenSilently);
  if (!token) return null;

  const url = src.startsWith('http') ? src : `${GLOBAL_BASE_URL}${src.startsWith('/') ? '' : '/'}${src}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) return null;

  return URL.createObjectURL(await response.blob());
};

const resolveImage = (src, getAccessTokenSilently) => {
  if (!cache.has(src)) {
    cache.set(
      src,
      fetchImage(src, getAccessTokenSilently).catch(() => null),
    );
  }
  return cache.get(src);
};

const AuthImage = ({ src, alt = '', className = '', style, fallback = null }) => {
  const { getAccessTokenSilently } = useAuth();
  // Kept together with the source it belongs to, so a changed src never shows the previous image.
  const [loaded, setLoaded] = useState(null);

  useEffect(() => {
    if (!src) return undefined;

    let cancelled = false;
    resolveImage(src, getAccessTokenSilently).then((url) => {
      if (!cancelled) setLoaded({ src, url });
    });

    return () => {
      cancelled = true;
    };
  }, [src, getAccessTokenSilently]);

  const url = loaded?.src === src ? loaded.url : null;
  if (!url) return fallback;

  return <img src={url} alt={alt} className={className} style={style} />;
};

export default AuthImage;
