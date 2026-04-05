// @/utils/getSupabaseImage.ts

export const getSupabaseImage = (path: string, table: string) => {
  if (!path) return 'https://via.placeholder.com/400';
  if (path.startsWith('http')) return path;

  const bucketMap: { [key: string]: string } = {
    'accommodations': 'accommodation_listings',
    'listings': 'listing-images',
    'services': 'service_portfolios',
    'roommates': 'roommate-listings'
  };

  const bucket = bucketMap[table] || 'listing-images';
  const projectUrl = "https://xaevvkjdcmcioswzalyr.supabase.co";
  
  return `${projectUrl}/storage/v1/object/public/${bucket}/${path}`;
};