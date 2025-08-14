import { z } from 'zod';
import { BaseEntitySchema, PlatformSchema } from './common';

// Artist verification status
export const VerificationStatusSchema = z.enum([
  'unverified',
  'pending',
  'verified',
  'rejected'
]);
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;

// Social platform profile
export const SocialProfileSchema = z.object({
  platform: PlatformSchema,
  username: z.string(),
  url: z.string().url(),
  followersCount: z.number().default(0),
  isVerified: z.boolean().default(false),
  lastUpdated: z.string().datetime(),
});
export type SocialProfile = z.infer<typeof SocialProfileSchema>;

// Artist contact information
export const ContactInfoSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional(),
  managementEmail: z.string().email().optional(),
  bookingEmail: z.string().email().optional(),
});
export type ContactInfo = z.infer<typeof ContactInfoSchema>;

// Artist metrics
export const ArtistMetricsSchema = z.object({
  totalFollowers: z.number().default(0),
  totalPlays: z.number().default(0),
  totalLikes: z.number().default(0),
  totalTracks: z.number().default(0),
  averageEngagement: z.number().default(0),
  monthlyListeners: z.number().default(0),
  growthRate: z.number().default(0),
  lastMetricsUpdate: z.string().datetime(),
});
export type ArtistMetrics = z.infer<typeof ArtistMetricsSchema>;

// Track information
export const TrackSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().url(),
  platform: PlatformSchema,
  duration: z.number().optional(),
  playCount: z.number().default(0),
  likeCount: z.number().default(0),
  commentCount: z.number().default(0),
  releaseDate: z.string().datetime().optional(),
  genre: z.string().optional(),
  tags: z.array(z.string()).default([]),
  artworkUrl: z.string().url().optional(),
});
export type Track = z.infer<typeof TrackSchema>;

// Artist schema
export const ArtistSchema = BaseEntitySchema.extend({
  name: z.string().min(1),
  displayName: z.string().optional(),
  bio: z.string().optional(),
  genres: z.array(z.string()).default([]),
  location: z.string().optional(),
  profileImageUrl: z.string().url().optional(),
  bannerImageUrl: z.string().url().optional(),
  verificationStatus: VerificationStatusSchema,
  socialProfiles: z.array(SocialProfileSchema).default([]),
  contactInfo: ContactInfoSchema.optional(),
  metrics: ArtistMetricsSchema,
  tags: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  discoveredAt: z.string().datetime(),
  lastContactedAt: z.string().datetime().optional(),
});
export type Artist = z.infer<typeof ArtistSchema>;

// Artist creation/update requests
export const CreateArtistRequestSchema = z.object({
  name: z.string().min(1),
  displayName: z.string().optional(),
  bio: z.string().optional(),
  genres: z.array(z.string()).default([]),
  location: z.string().optional(),
  socialProfiles: z.array(SocialProfileSchema).default([]),
  contactInfo: ContactInfoSchema.optional(),
  tags: z.array(z.string()).default([]),
});
export type CreateArtistRequest = z.infer<typeof CreateArtistRequestSchema>;

export const UpdateArtistRequestSchema = CreateArtistRequestSchema.partial().extend({
  verificationStatus: VerificationStatusSchema.optional(),
  isActive: z.boolean().optional(),
});
export type UpdateArtistRequest = z.infer<typeof UpdateArtistRequestSchema>;

// Artist discovery request
export const DiscoverArtistsRequestSchema = z.object({
  query: z.string().optional(),
  genres: z.array(z.string()).default([]),
  platforms: z.array(PlatformSchema).default([]),
  minFollowers: z.number().optional(),
  maxFollowers: z.number().optional(),
  location: z.string().optional(),
  similarTo: z.string().optional(), // Artist ID or name
  limit: z.number().min(1).max(100).default(20),
});
export type DiscoverArtistsRequest = z.infer<typeof DiscoverArtistsRequestSchema>;

// Artist with tracks
export const ArtistWithTracksSchema = ArtistSchema.extend({
  tracks: z.array(TrackSchema),
  totalTracks: z.number(),
});
export type ArtistWithTracks = z.infer<typeof ArtistWithTracksSchema>;

// Artist similarity score
export const SimilarArtistSchema = z.object({
  artist: ArtistSchema,
  similarityScore: z.number().min(0).max(1),
  similarityReasons: z.array(z.string()),
});
export type SimilarArtist = z.infer<typeof SimilarArtistSchema>;