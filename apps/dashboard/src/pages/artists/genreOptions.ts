/** Predefined genres common in the playlist placement space. */
export const GENRE_OPTIONS = [
  // Pop & mainstream
  { value: 'pop', label: 'Pop' },
  { value: 'indie pop', label: 'Indie Pop' },
  { value: 'synth pop', label: 'Synth Pop' },
  { value: 'dream pop', label: 'Dream Pop' },
  { value: 'alt pop', label: 'Alt Pop' },
  { value: 'dark pop', label: 'Dark Pop' },
  { value: 'electropop', label: 'Electropop' },
  { value: 'k-pop', label: 'K-Pop' },

  // Rock & alternative
  { value: 'rock', label: 'Rock' },
  { value: 'indie rock', label: 'Indie Rock' },
  { value: 'alt rock', label: 'Alt Rock' },
  { value: 'punk', label: 'Punk' },
  { value: 'post-punk', label: 'Post-Punk' },
  { value: 'shoegaze', label: 'Shoegaze' },
  { value: 'grunge', label: 'Grunge' },
  { value: 'emo', label: 'Emo' },
  { value: 'metal', label: 'Metal' },

  // Electronic
  { value: 'electronic', label: 'Electronic' },
  { value: 'house', label: 'House' },
  { value: 'techno', label: 'Techno' },
  { value: 'edm', label: 'EDM' },
  { value: 'dnb', label: 'Drum & Bass' },
  { value: 'ambient', label: 'Ambient' },
  { value: 'downtempo', label: 'Downtempo' },
  { value: 'chillwave', label: 'Chillwave' },

  // Hip-hop & R&B
  { value: 'hip-hop', label: 'Hip-Hop' },
  { value: 'rap', label: 'Rap' },
  { value: 'trap', label: 'Trap' },
  { value: 'r&b', label: 'R&B' },
  { value: 'neo soul', label: 'Neo Soul' },

  // Other
  { value: 'jazz', label: 'Jazz' },
  { value: 'soul', label: 'Soul' },
  { value: 'funk', label: 'Funk' },
  { value: 'folk', label: 'Folk' },
  { value: 'indie folk', label: 'Indie Folk' },
  { value: 'country', label: 'Country' },
  { value: 'classical', label: 'Classical' },
  { value: 'latin', label: 'Latin' },
  { value: 'reggaeton', label: 'Reggaeton' },
  { value: 'afrobeats', label: 'Afrobeats' },
  { value: 'world', label: 'World' },
  { value: 'lo-fi', label: 'Lo-Fi' },
  { value: 'singer-songwriter', label: 'Singer-Songwriter' },
  { value: 'bedroom pop', label: 'Bedroom Pop' },
  { value: 'hyperpop', label: 'Hyperpop' },
] as const
