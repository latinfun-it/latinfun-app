export type DJ = {
  id: string;
  name: string;
  slug: string;
  bio: string;
  city: string;
  genres: string[];
  image_url: string;
  cover_url?: string;
  instagram?: string;
  spotify_playlist_url?: string;
  tidal_playlist_url?: string;
  verified_by_mauro: boolean;
  followers: number;
};

export type EventItem = {
  id: string;
  title: string;
  description: string;
  city: string;
  venue: string;
  address: string;
  genre: string;
  date: string;
  image_url: string;
  lineup: string[];
  ticket_url?: string;
  organizer: string;
  featured: boolean;
  boosted: boolean;
  latitude?: number;
  longitude?: number;
};

export type Mix = {
  id: string;
  title: string;
  dj_name: string;
  genre: string;
  duration_sec: number;
  cover_url: string;
  audio_url: string;
  plays: number;
  description?: string;
};
