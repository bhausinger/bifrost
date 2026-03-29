-- Seed Artists
INSERT INTO artists (name, email, spotify_url, soundcloud_url, instagram_handle, genres, monthly_listeners, follower_count, source) VALUES
('Lil Wavey', 'lilwavey@gmail.com', 'https://open.spotify.com/artist/1', 'https://soundcloud.com/lilwavey', 'lilwavey', ARRAY['hip-hop','trap'], 45000, 12000, 'scraper'),
('Crystal Echoes', 'crystal.echoes@hotmail.com', 'https://open.spotify.com/artist/2', NULL, 'crystalechoes', ARRAY['electronic','ambient'], 23000, 8500, 'scraper'),
('Marcus Flow', 'marcusflow@gmail.com', 'https://open.spotify.com/artist/3', 'https://soundcloud.com/marcusflow', 'marcusflow', ARRAY['r&b','soul'], 67000, 22000, 'manual'),
('DJ Sunset', 'djsunset@proton.me', 'https://open.spotify.com/artist/4', NULL, 'djsunset', ARRAY['house','edm'], 120000, 45000, 'referral'),
('Nova Dreams', 'novadreams@gmail.com', 'https://open.spotify.com/artist/5', 'https://soundcloud.com/novadreams', NULL, ARRAY['indie','dream-pop'], 15000, 4200, 'scraper'),
('Trap King Rico', 'trapkingrico@yahoo.com', 'https://open.spotify.com/artist/6', 'https://soundcloud.com/trapkingrico', 'trapkingrico', ARRAY['trap','hip-hop'], 89000, 31000, 'scraper'),
('Aria Moon', 'ariamoon.music@gmail.com', 'https://open.spotify.com/artist/7', NULL, 'ariamoon', ARRAY['pop','synth-pop'], 34000, 11000, 'manual'),
('Bass Prophet', 'bassprophet@gmail.com', 'https://open.spotify.com/artist/8', 'https://soundcloud.com/bassprophet', 'bassprophet', ARRAY['dubstep','bass'], 56000, 19000, 'scraper'),
('Jade River', 'jaderiver@gmail.com', 'https://open.spotify.com/artist/9', NULL, 'jaderiver', ARRAY['lo-fi','chill'], 78000, 28000, 'referral'),
('Flame Torres', 'flametorres@gmail.com', 'https://open.spotify.com/artist/10', 'https://soundcloud.com/flametorres', 'flametorres', ARRAY['latin','reggaeton'], 145000, 52000, 'scraper'),
('Midnight Pulse', NULL, 'https://open.spotify.com/artist/11', 'https://soundcloud.com/midnightpulse', NULL, ARRAY['techno','dark-techno'], 19000, 6000, 'scraper'),
('Sky Walker', 'skywalker.beats@gmail.com', 'https://open.spotify.com/artist/12', NULL, 'skywalkerbeats', ARRAY['hip-hop','boom-bap'], 41000, 15000, 'manual');

-- Seed Pipeline Entries
INSERT INTO pipeline_entries (artist_id, stage, deal_value, package_type, stage_entered_at, contacted_at, responded_at, paid_at)
SELECT id, 'discovered', NULL, NULL, now() - interval '2 days', NULL, NULL, NULL FROM artists WHERE name='Lil Wavey'
UNION ALL SELECT id, 'discovered', NULL, NULL, now() - interval '1 day', NULL, NULL, NULL FROM artists WHERE name='Crystal Echoes'
UNION ALL SELECT id, 'contacted', 350, 'premium', now() - interval '5 days', now() - interval '5 days', NULL, NULL FROM artists WHERE name='Marcus Flow'
UNION ALL SELECT id, 'contacted', 500, 'enterprise', now() - interval '8 days', now() - interval '8 days', NULL, NULL FROM artists WHERE name='DJ Sunset'
UNION ALL SELECT id, 'responded', 200, 'basic', now() - interval '3 days', now() - interval '7 days', now() - interval '3 days', NULL FROM artists WHERE name='Nova Dreams'
UNION ALL SELECT id, 'negotiating', 450, 'premium', now() - interval '2 days', now() - interval '10 days', now() - interval '5 days', NULL FROM artists WHERE name='Trap King Rico'
UNION ALL SELECT id, 'paid', 350, 'premium', now() - interval '1 day', now() - interval '14 days', now() - interval '8 days', now() - interval '1 day' FROM artists WHERE name='Aria Moon'
UNION ALL SELECT id, 'placing', 500, 'enterprise', now() - interval '3 days', now() - interval '20 days', now() - interval '12 days', now() - interval '5 days' FROM artists WHERE name='Bass Prophet'
UNION ALL SELECT id, 'active', 350, 'premium', now() - interval '7 days', now() - interval '25 days', now() - interval '18 days', now() - interval '10 days' FROM artists WHERE name='Jade River'
UNION ALL SELECT id, 'active', 750, 'enterprise', now() - interval '14 days', now() - interval '30 days', now() - interval '22 days', now() - interval '16 days' FROM artists WHERE name='Flame Torres'
UNION ALL SELECT id, 'contacted', 200, 'basic', now() - interval '15 days', now() - interval '15 days', NULL, NULL FROM artists WHERE name='Sky Walker'
UNION ALL SELECT id, 'discovered', NULL, NULL, now(), NULL, NULL, NULL FROM artists WHERE name='Midnight Pulse';

-- Seed Curators (based on real client list structure)
INSERT INTO curators (name, contact_name, email, genres, price_per_10k, payment_method, payment_handle, payment_code, is_active, notes) VALUES
('Golden Nuggets Records', 'Alan Maurer', NULL, ARRAY['Bass','Dubstep','Riddim','Trap','Wonkbass','DNB'], 120, 'XRP', 'rLSn6Z3T8uCxbcd1oxwfGQN1Fdn5CyGujK', '50650288', true, NULL),
('Levianth', 'Nikolas Spiliotopoulos', 'Delakoura02@gmail.com', ARRAY['Rap'], 110, 'PayPal', 'Delakoura02@gmail.com', NULL, true, NULL),
('YouGrow', 'YouGrow', NULL, ARRAY['Pop','EDM','Rap'], 130, 'Online', 'https://www.yougrowpromo.com/pages/custom-pricing', NULL, true, NULL),
('BeatDrop Network', 'Jake Morrison', 'jake@beatdrop.net', ARRAY['EDM','House','Techno'], 95, 'PayPal', 'jake@beatdrop.net', NULL, true, 'Fast turnaround, reliable placements'),
('ChillWave Media', 'Sofia Chen', 'sofia@chillwave.co', ARRAY['Lo-fi','Chill','Indie'], 85, 'Venmo', '@chillwavemedia', NULL, true, 'Great for chill/ambient tracks');

-- Seed Playlists (with country)
INSERT INTO playlists (curator_id, name, spotify_url, genre, country, follower_count, price_per_placement, avg_streams_per_placement, is_active)
-- Golden Nuggets Records playlists
SELECT id, 'Dubstep Brutal Drops', 'https://open.spotify.com/playlist/4YZNKPS9bM3xv1UF4WZil0', 'Dubstep', NULL, 42000, 60, 5000, true FROM curators WHERE name='Golden Nuggets Records'
UNION ALL SELECT id, 'Wonky Dubstep', 'https://open.spotify.com/playlist/3Lor886dfB7VsphcO711Ij', 'Dubstep', NULL, 28000, 50, 3500, true FROM curators WHERE name='Golden Nuggets Records'
-- Levianth playlists
UNION ALL SELECT id, 'Treino Pesado', 'https://open.spotify.com/playlist/4EePdCSMHRMkp24KzE2OB2', 'Rap', 'Brazil', 95000, 55, 7500, true FROM curators WHERE name='Levianth'
UNION ALL SELECT id, 'American Rap', 'https://open.spotify.com/playlist/7K5T1por7Awge7QiukTFfS', 'Rap', NULL, 110000, 55, 8000, true FROM curators WHERE name='Levianth'
-- YouGrow playlists
UNION ALL SELECT id, 'ML+ Goldlane Starboys', 'https://open.spotify.com/playlist/5OTtBcJEdkUFAAF7iHWasm', 'Pop', 'Europe', 180000, 65, 12000, true FROM curators WHERE name='YouGrow'
UNION ALL SELECT id, 'Tik Tok Hits 2026', 'https://open.spotify.com/playlist/3CV4m7gpnCjTYPqcPoI2dc', 'Pop', NULL, 320000, 85, 22000, true FROM curators WHERE name='YouGrow'
UNION ALL SELECT id, 'Fitness Motivation 2026', 'https://open.spotify.com/playlist/5eSePKblc8XU3iPc4x7eCN', 'EDM', NULL, 75000, 50, 5500, true FROM curators WHERE name='YouGrow'
UNION ALL SELECT id, 'Running Songs 2026', 'https://open.spotify.com/playlist/3FNA30VKxfbkxhjgG4omsP', 'EDM', NULL, 62000, 45, 4800, true FROM curators WHERE name='YouGrow'
UNION ALL SELECT id, 'Electronica 2010 - 2016', 'https://open.spotify.com/playlist/5OuwluOQwdzeTMc3ZqTHcI', 'EDM', NULL, 48000, 40, 3200, true FROM curators WHERE name='YouGrow'
UNION ALL SELECT id, 'sad songs for the gym', 'https://open.spotify.com/playlist/4XHdpRd69YwrlPtuxWN1dA', 'Pop', NULL, 55000, 45, 4000, true FROM curators WHERE name='YouGrow'
UNION ALL SELECT id, 'punk throwback bangers', 'https://open.spotify.com/playlist/0IXlLmd0yLxm7fjJCtfmPm', 'Rock', NULL, 38000, 35, 2800, true FROM curators WHERE name='YouGrow'
UNION ALL SELECT id, 'best rock songs 60s-90s', 'https://open.spotify.com/playlist/4aKENOFr1f8ktT2tmcCBP3', 'Rock', NULL, 92000, 55, 6500, true FROM curators WHERE name='YouGrow'
-- BeatDrop Network playlists
UNION ALL SELECT id, 'EDM Bangers', NULL, 'EDM', 'USA', 200000, 120, 18000, true FROM curators WHERE name='BeatDrop Network'
UNION ALL SELECT id, 'Bass Music Central', NULL, 'Dubstep', 'USA', 55000, 60, 5000, true FROM curators WHERE name='BeatDrop Network'
UNION ALL SELECT id, 'House Party Essentials', NULL, 'House', 'UK', 85000, 75, 7500, true FROM curators WHERE name='BeatDrop Network'
-- ChillWave Media playlists
UNION ALL SELECT id, 'Chill Vibes Only', NULL, 'Lo-fi', 'Global', 65000, 50, 5500, true FROM curators WHERE name='ChillWave Media'
UNION ALL SELECT id, 'Indie Discoveries', NULL, 'Indie', 'USA', 30000, 35, 2500, true FROM curators WHERE name='ChillWave Media'
UNION ALL SELECT id, 'Dream Pop Essentials', NULL, 'Dream-pop', 'Europe', 22000, 30, 1800, true FROM curators WHERE name='ChillWave Media';

-- Seed Curator Outreach (playlists being prospected)
INSERT INTO curator_outreach (playlist_name, playlist_url, email, genre, is_organic, emailed_at, followed_up_at, replied_at, confirmed_at, price_per_10k, notes) VALUES
('Trap Nation Daily', 'https://open.spotify.com/playlist/abc123', 'trapnation@gmail.com', 'Trap', true, now() - interval '10 days', now() - interval '5 days', now() - interval '3 days', now() - interval '1 day', 100, 'Confirmed $100/10K, starts next week'),
('Hip Hop Essentials', 'https://open.spotify.com/playlist/def456', 'hiphopess@hotmail.com', 'Hip-hop', true, now() - interval '8 days', now() - interval '4 days', now() - interval '2 days', NULL, 90, 'Replied, negotiating price'),
('Bass Boost Official', 'https://open.spotify.com/playlist/ghi789', 'bassboost@proton.me', 'Bass', NULL, now() - interval '12 days', now() - interval '6 days', NULL, NULL, 150, 'Followed up, no reply yet'),
('Chill Lofi Beats', 'https://open.spotify.com/playlist/jkl012', 'chilllofi@gmail.com', 'Lo-fi', true, now() - interval '3 days', NULL, NULL, NULL, 70, 'Just emailed'),
('Latin Heat 2026', 'https://open.spotify.com/playlist/mno345', 'latinheat@gmail.com', 'Reggaeton', false, now() - interval '15 days', now() - interval '10 days', now() - interval '7 days', now() - interval '5 days', 120, 'Active client, good results'),
('Indie Chill Sunday', 'https://open.spotify.com/playlist/pqr678', NULL, 'Indie', true, NULL, NULL, NULL, NULL, 60, 'Found on Spotify, need to find contact'),
('R&B Smooth Nights', 'https://open.spotify.com/playlist/stu901', 'rnbsmooth@yahoo.com', 'R&B', true, now() - interval '6 days', now() - interval '2 days', now() - interval '1 day', NULL, 85, 'Interested, wants to see track first'),
('EDM Festival Picks', 'https://open.spotify.com/playlist/vwx234', 'festpicks@gmail.com', 'EDM', false, now() - interval '20 days', now() - interval '14 days', now() - interval '10 days', now() - interval '8 days', 140, 'Confirmed, placed 3 tracks already'),
('Synthwave Retro', NULL, NULL, 'Synth-pop', NULL, NULL, NULL, NULL, NULL, NULL, 'Need to research this playlist'),
('Dark Techno Underground', 'https://open.spotify.com/playlist/yza567', 'darktechno@pm.me', 'Techno', true, now() - interval '4 days', NULL, NULL, NULL, 110, 'Emailed, waiting for response'),
('Workout Hype', 'https://open.spotify.com/playlist/bcd890', 'workouthype@gmail.com', 'EDM', false, now() - interval '7 days', now() - interval '3 days', now() - interval '1 day', now() - interval '12 hours', 95, 'Confirmed today!'),
('Bedroom Pop Vibes', 'https://open.spotify.com/playlist/efg123', 'bpvibes@gmail.com', 'Pop', true, now() - interval '5 days', now() - interval '1 day', NULL, NULL, 75, 'Following up');

-- Seed Campaigns
INSERT INTO campaigns (artist_id, pipeline_entry_id, name, track_name, track_spotify_url, status, total_budget, total_cost, target_streams, actual_streams, start_date)
SELECT a.id, pe.id, 'Jade River - Moonlit', 'Moonlit', 'https://open.spotify.com/track/1', 'active', 350, 145, 25000, 12400, '2026-02-15'
FROM artists a JOIN pipeline_entries pe ON pe.artist_id = a.id WHERE a.name='Jade River'
UNION ALL
SELECT a.id, pe.id, 'Flame Torres - Fuego', 'Fuego', 'https://open.spotify.com/track/2', 'active', 750, 320, 50000, 34200, '2026-02-01'
FROM artists a JOIN pipeline_entries pe ON pe.artist_id = a.id WHERE a.name='Flame Torres';

-- Seed Transactions
INSERT INTO transactions (type, amount, description, category, payment_method, transaction_date) VALUES
('income', 350, 'Jade River - premium package', 'client_payment', 'cashapp', '2026-02-14'),
('income', 750, 'Flame Torres - enterprise package', 'client_payment', 'stripe', '2026-01-30'),
('income', 350, 'Aria Moon - premium package', 'client_payment', 'paypal', '2026-03-07'),
('income', 500, 'Bass Prophet - enterprise package', 'client_payment', 'stripe', '2026-03-03'),
('expense', 75, 'Trap Nation Daily placement', 'curator_payment', 'paypal', '2026-02-16'),
('expense', 50, 'Chill Vibes Only placement', 'curator_payment', 'cashapp', '2026-02-17'),
('expense', 120, 'EDM Bangers placement', 'curator_payment', 'paypal', '2026-02-05'),
('expense', 100, 'Hip Hop Essentials placement', 'curator_payment', 'paypal', '2026-02-06'),
('expense', 45, 'Late Night R&B placement', 'curator_payment', 'cashapp', '2026-02-20'),
('expense', 29, 'Spotify API subscription', 'software', 'stripe', '2026-03-01');

-- Seed Email Templates
INSERT INTO email_templates (name, subject, body, template_type, variables) VALUES
('Initial Outreach', 'Spotify Playlist Placement Opportunity', 'Hi {{artistName}},

I came across your music and think it would be a great fit for some of our curated Spotify playlists.

We work with playlist curators across multiple genres to get artists real, organic streams. Our placements typically see {{deckLink}} within the first month.

Would you be interested in learning more about our placement packages?

Best,
{{senderName}}', 'initial_outreach', ARRAY['artistName', 'deckLink', 'senderName']),
('Follow Up', 'Following up - Playlist Placement', 'Hi {{artistName}},

Just wanted to follow up on my previous email about getting your music on some curated Spotify playlists.

We have spots opening up this month and I think your sound would do well. Happy to send over our deck if you are interested.

Best,
{{senderName}}', 'follow_up', ARRAY['artistName', 'senderName']),
('Pricing', 'Playlist Placement Packages', 'Hi {{artistName}},

Thanks for your interest! Here are our current packages:

Basic ($200) - 3 playlist placements, ~5K-10K streams
Premium ($350) - 6 playlist placements, ~15K-25K streams
Enterprise ($500+) - 10+ playlist placements, ~30K-50K+ streams

All placements are on organic, real-listener playlists. Let me know which package interests you and we can get started.

Best,
{{senderName}}', 'pricing', ARRAY['artistName', 'senderName']);
