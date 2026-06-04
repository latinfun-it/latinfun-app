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
  owner_id?: string;
  boosted?: boolean;
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
  owner_id?: string;
  likes?: number;
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

export type School = {
  id: string;
  name: string;
  slug: string;
  city: string;
  address: string;
  bio: string;
  image_url: string;
  cover_url?: string;
  styles: string[];
  levels: string[];
  phone?: string;
  email?: string;
  website?: string;
  instagram?: string;
  owner_id?: string;
  verified_by_mauro: boolean;
  students: number;
  boosted?: boolean;
};

export type Playlist = {
  id: string;
  title: string;
  description: string;
  cover_url: string;
  platform: string;
  embed_url: string;
  external_url: string;
  curator: string;
  genre: string;
  position: number;
  featured: boolean;
};

export type Locale = {
  id: string;
  name: string;
  slug: string;
  category: string; // ristorante | bar | lounge | discoteca_cena | altro
  cuisine: string; // testo libero
  city: string;
  address: string;
  bio: string;
  image_url: string;
  cover_url?: string;
  gallery?: string[];
  price_range?: string;
  hours?: string;
  lat?: number;
  lng?: number;
  phone?: string;
  email?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  owner_id?: string;
  verified_by_mauro: boolean;
  boosted?: boolean;
  saves?: number;
  avg_rating?: number;
  reviews_count?: number;
  country?: string;
};
