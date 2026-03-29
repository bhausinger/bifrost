-- Sample data for development

insert into artists (name, email, spotify_url, genres, monthly_listeners, source, tags) values
  ('Luna Wave', 'luna@example.com', 'https://open.spotify.com/artist/example1', '{electronic,ambient}', 15000, 'scraper', '{hot-lead}'),
  ('DJ Flux', 'flux@example.com', 'https://open.spotify.com/artist/example2', '{house,techno}', 45000, 'scraper', '{returning}'),
  ('Neon Tide', 'neon@example.com', 'https://open.spotify.com/artist/example3', '{synthwave,electronic}', 8000, 'manual', '{}'),
  ('Rhythm Core', 'rhythm@example.com', 'https://open.spotify.com/artist/example4', '{hip-hop,trap}', 120000, 'referral', '{priority}'),
  ('Velvet Sound', 'velvet@example.com', 'https://open.spotify.com/artist/example5', '{r&b,soul}', 32000, 'website', '{}'),
  ('Crystal Bass', 'crystal@example.com', 'https://open.spotify.com/artist/example6', '{dubstep,bass}', 67000, 'scraper', '{}'),
  ('Sage Audio', 'sage@example.com', 'https://open.spotify.com/artist/example7', '{lo-fi,chill}', 5000, 'manual', '{new}');

-- Pipeline entries at various stages
insert into pipeline_entries (artist_id, stage, deal_value, package_type) values
  ((select id from artists where name = 'Luna Wave'), 'discovered', null, null),
  ((select id from artists where name = 'DJ Flux'), 'contacted', 200, 'basic'),
  ((select id from artists where name = 'Neon Tide'), 'responded', 500, 'premium'),
  ((select id from artists where name = 'Rhythm Core'), 'paid', 800, 'enterprise'),
  ((select id from artists where name = 'Velvet Sound'), 'active', 300, 'basic'),
  ((select id from artists where name = 'Crystal Bass'), 'discovered', null, null),
  ((select id from artists where name = 'Sage Audio'), 'contacted', 150, 'basic');

-- Sample curator
insert into curators (name, email, payment_method, payment_handle, reliability_score) values
  ('PlaylistKing', 'king@example.com', 'paypal', 'king@paypal.com', 5),
  ('VibesCurator', 'vibes@example.com', 'cashapp', '$vibes', 4);

-- Sample playlists
insert into playlists (curator_id, name, spotify_url, genre, follower_count, price_per_placement, avg_streams_per_placement) values
  ((select id from curators where name = 'PlaylistKing'), 'Electronic Vibes', 'https://open.spotify.com/playlist/example1', 'electronic', 50000, 25.00, 3000),
  ((select id from curators where name = 'PlaylistKing'), 'Chill Beats', 'https://open.spotify.com/playlist/example2', 'lo-fi', 30000, 15.00, 1500),
  ((select id from curators where name = 'VibesCurator'), 'Hip Hop Heat', 'https://open.spotify.com/playlist/example3', 'hip-hop', 80000, 40.00, 5000);

-- Sample excluded artist
insert into excluded_artists (email, artist_name, reason, notes) values
  ('nocontact@example.com', 'Do Not Contact', 'opt_out', 'Replied asking to stop emailing');
