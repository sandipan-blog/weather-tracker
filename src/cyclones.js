export const CYCLONE_URL =
  "https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP?eventtype=TC";

const ALERT_COLORS = {
  Red: "#c44732",
  Orange: "#e0a15a",
  Green: "#2f6f4e",
};

export function alertColor(alert) {
  return ALERT_COLORS[alert] || ALERT_COLORS.Green;
}

export function parseCyclones(data) {
  if (!data || !Array.isArray(data.features)) return [];
  const byId = new Map();

  for (const f of data.features) {
    const p = f.properties || {};
    const g = f.geometry || {};
    if (p.eventtype !== "TC") continue;
    if (!g || g.type !== "Point") continue;
    const coords = g.coordinates || [];
    const lon = coords[0];
    const lat = coords[1];
    const eventid = p.eventid;
    const episodeid = p.episodeid;
    if (eventid == null) continue;

    const sev = p.severitydata || {};
    const wind = p.windspeed != null ? Number(p.windspeed) : Number(sev.severity);
    const item = {
      id: eventid,
      episode: episodeid,
      name: p.eventname || p.name,
      title: p.title || p.name || p.eventname,
      alert: p.alertlevel,
      windKph: Number.isFinite(wind) ? wind : 0,
      detail: sev.severitytext || p.description || "",
      latitude: lat,
      longitude: lon,
      updated: p.todate || p.fromdate,
    };

    const prev = byId.get(eventid);
    if (!prev || (episodeid != null && episodeid > prev.episode)) {
      byId.set(eventid, item);
    }
  }

  return [...byId.values()].sort((a, b) => (b.windKph || 0) - (a.windKph || 0));
}
