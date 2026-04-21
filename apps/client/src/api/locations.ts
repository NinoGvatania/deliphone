import { api } from "./client";

export type LocationBrief = {
  id: string;
  name: string;
  address: string;
  city: string | null;
  status: string;
  lat: number;
  lng: number;
  available_devices: number;
};

export type LocationDetail = LocationBrief & {
  working_hours: Record<string, string> | null;
  contacts: Record<string, string> | null;
  photo_url: string | null;
  capacity: number;
};

export type DeviceBrief = {
  id: string;
  model: string;
  short_code: string;
  color: string | null;
  storage: string | null;
  condition_grade: number | null;
  battery_level: number | null;
};

export const locationsApi = {
  list: (params?: { lat?: number; lng?: number; radius?: number; open_now?: boolean; has_devices?: boolean }) => {
    const qs: Record<string, string> = {};
    if (params?.lat != null) qs.lat = String(params.lat);
    if (params?.lng != null) qs.lng = String(params.lng);
    if (params?.radius != null) qs.radius = String(params.radius);
    if (params?.open_now != null) qs.open_now = String(params.open_now);
    if (params?.has_devices != null) qs.has_devices = String(params.has_devices);
    return api.get<LocationBrief[]>("/client/locations", qs);
  },
  get: (id: string) => api.get<LocationDetail>(`/client/locations/${id}`),
  getDevices: (id: string) => api.get<DeviceBrief[]>(`/client/locations/${id}/available-devices`),
};
