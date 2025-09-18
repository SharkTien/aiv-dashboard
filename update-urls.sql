-- Script to update all tracking URLs from IP to Vercel domain
-- Run this script on your database to update existing UTM links

-- Update utm_links table - replace IP with Vercel domain
UPDATE utm_links 
SET tracking_link = REPLACE(tracking_link, 'http://103.110.85.200:3000', 'https://aiv-dashboard-ten.vercel.app')
WHERE tracking_link LIKE '%103.110.85.200:3000%';

-- Update utm_links table - replace domain with Vercel domain  
UPDATE utm_links 
SET tracking_link = REPLACE(tracking_link, 'http://aiesecvn.digital.com:3000', 'https://aiv-dashboard-ten.vercel.app')
WHERE tracking_link LIKE '%aiesecvn.digital.com:3000%';

-- Show updated records
SELECT id, tracking_link, created_at 
FROM utm_links 
WHERE tracking_link LIKE '%aiv-dashboard-ten.vercel.app%'
ORDER BY created_at DESC
LIMIT 10;

-- Count total updated records
SELECT COUNT(*) as total_updated
FROM utm_links 
WHERE tracking_link LIKE '%aiv-dashboard-ten.vercel.app%';
