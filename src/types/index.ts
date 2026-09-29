export interface Coordinates {
  lng: number;
  lat: number;
}

export interface MapMarker {
  id: string;
  title: string;
  price?: number;
  currency?: string;
  propertyType?: string;
  coordinates: [number, number]; // [lng, lat]
  address?: string;
  imageUrl?: string;
}

export interface Listing {
  id: string;
  title: string;
  description?: string;
  price: number;
  currency: string;
  rentalPeriod: "monthly" | "daily" | "yearly";
  propertyType: "condo" | "apartment" | "house" | "room" | "commercial";
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  isAvailable: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface GeoJSONPointFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: {
    id: string;
    title: string;
    price?: number;
    propertyType?: string;
  };
}

export * from './database';
export * from './auth';
