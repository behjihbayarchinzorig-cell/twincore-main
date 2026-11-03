// Esri basemaps the maps can switch between. Tiles come from Esri's public ArcGIS Online services; `native` is the
// deepest zoom a service has tiles for (Leaflet stretches that level beyond it instead of showing blanks).

export type Basemap = 'imagery' | 'streets' | 'topo' | 'dark';

export const BASEMAPS: { id: Basemap; path: string; native: number; attribution: string; name: [string, string] }[] = [
  { id: 'imagery', path: 'World_Imagery', native: 19, attribution: 'Imagery © Esri, Maxar, Earthstar Geographics', name: ['Хиймэл дагуул', 'Satellite'] },
  { id: 'streets', path: 'World_Street_Map', native: 19, attribution: 'Streets © Esri, HERE, Garmin, OpenStreetMap', name: ['Гудамж', 'Streets'] },
  { id: 'topo', path: 'World_Topo_Map', native: 19, attribution: 'Topo © Esri, HERE, Garmin, OpenStreetMap', name: ['Топо', 'Topo'] },
  { id: 'dark', path: 'Canvas/World_Dark_Gray_Base', native: 16, attribution: 'Dark Gray © Esri, HERE, Garmin', name: ['Бараан', 'Dark'] },
];

export const basemapUrl = (path: string) => `https://server.arcgisonline.com/ArcGIS/rest/services/${path}/MapServer/tile/{z}/{y}/{x}`;
