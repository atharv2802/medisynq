export const getSiteUrl = () => {
  // Log the current environment for debugging
  console.log('Current NODE_ENV:', process.env.NODE_ENV);
  console.log('NEXT_PUBLIC_SITE_URL:', process.env.NEXT_PUBLIC_SITE_URL);
  console.log('VERCEL_URL:', process.env.VERCEL_URL);

  // In development, always use localhost
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }

  // In production, use the explicit site URL
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  // If on Vercel but no explicit site URL, use the Vercel URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Fallback to the production URL
  return 'https://medisynq-omega.vercel.app';
}; 