import React, { useMemo } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { WebView } from "react-native-webview";
import { useRouter } from "expo-router";
import { colors } from "./theme";
import type { EventItem } from "./types";

function buildHtml(events: EventItem[]): string {
  const points = events
    .filter((e) => typeof e.latitude === "number" && typeof e.longitude === "number")
    .map((e) => ({
      id: e.id,
      title: e.title.replace(/"/g, "&quot;"),
      city: e.city,
      venue: e.venue.replace(/"/g, "&quot;"),
      date: new Date(e.date).toLocaleDateString("it-IT", { day: "numeric", month: "short" }),
      lat: e.latitude,
      lng: e.longitude,
      genre: e.genre,
    }));
  const dataJson = JSON.stringify(points);
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #map { margin:0; padding:0; height:100%; width:100%; background:#eef4f7; }
  .leaflet-container { background:#eef4f7; }
  .leaflet-popup-content-wrapper { background:#111113; color:#fff; border-radius:12px; border:1px solid rgba(255,255,255,.15); box-shadow:0 8px 24px rgba(225,29,72,.3); }
  .leaflet-popup-tip { background:#111113; }
  .leaflet-popup-content { margin:10px 14px; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; }
  .lh-pop-title { font-weight:800; font-size:14px; margin-bottom:4px; }
  .lh-pop-meta { color:#A1A1AA; font-size:12px; margin-bottom:2px; }
  .lh-pop-cta { display:inline-block; background:#E11D48; color:#fff; font-weight:800; padding:6px 12px; border-radius:999px; font-size:12px; text-decoration:none; margin-top:6px; }
  .lh-marker { background:#E11D48; width:32px; height:32px; border-radius:999px; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:800; font-size:15px; border:3px solid #fff; box-shadow:0 6px 14px rgba(225,29,72,.55); }
  .leaflet-control-attribution { background:rgba(255,255,255,.85); color:#444; }
  .leaflet-control-attribution a { color:#E11D48; }
  .leaflet-control-zoom a { background:#ffffff !important; color:#111 !important; border-color:rgba(0,0,0,.15) !important; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  const events = ${dataJson};
  const map = L.map('map', { zoomControl: true, attributionControl: true }).setView([42.5, 12.5], 5.5);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OSM &copy; CARTO',
    maxZoom: 19,
    subdomains: 'abcd'
  }).addTo(map);
  const icon = L.divIcon({ className: '', html: '<div class="lh-marker">♪</div>', iconSize: [28,28], iconAnchor:[14,14] });
  const bounds = [];
  events.forEach(ev => {
    const m = L.marker([ev.lat, ev.lng], { icon }).addTo(map);
    bounds.push([ev.lat, ev.lng]);
    m.bindPopup(
      '<div class="lh-pop-title">' + ev.title + '</div>' +
      '<div class="lh-pop-meta">' + ev.date + ' · ' + ev.city + '</div>' +
      '<div class="lh-pop-meta">' + ev.venue + ' · ' + ev.genre.toUpperCase() + '</div>' +
      '<a class="lh-pop-cta" href="#" onclick="window.ReactNativeWebView && window.ReactNativeWebView.postMessage(\\'open:' + ev.id + '\\'); return false;">Vedi evento →</a>'
    );
  });
  if (bounds.length) map.fitBounds(bounds, { padding: [40,40], maxZoom: 8 });
</script>
</body>
</html>`;
}

export default function EventsMap({ events }: { events: EventItem[] }) {
  const router = useRouter();
  const html = useMemo(() => buildHtml(events), [events]);

  if (Platform.OS === "web") {
    return (
      <View style={styles.wrap} testID="events-map">
        <iframe
          title="events-map"
          srcDoc={html}
          style={{ width: "100%", height: "100%", border: 0, backgroundColor: colors.bg } as any}
        />
      </View>
    );
  }
  return (
    <View style={styles.wrap} testID="events-map">
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        style={{ backgroundColor: colors.bg }}
        javaScriptEnabled
        domStorageEnabled
        onMessage={(e) => {
          const msg = e.nativeEvent.data || "";
          if (msg.startsWith("open:")) {
            const id = msg.slice(5);
            router.push(`/event/${id}`);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
});
