import { test } from "node:test";
import assert from "node:assert/strict";

import { CYCLONE_URL, parseCyclones, alertColor } from "../src/cyclones.js";

function feature(props, lon, lat) {
  return {
    type: "Feature",
    properties: props,
    geometry: { type: "Point", coordinates: [lon, lat] },
  };
}

test("CYCLONE_URL is the GDACS TC endpoint", () => {
  assert.equal(
    CYCLONE_URL,
    "https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP?eventtype=TC"
  );
});

test("empty or null input returns []", () => {
  assert.deepEqual(parseCyclones(null), []);
  assert.deepEqual(parseCyclones(undefined), []);
  assert.deepEqual(parseCyclones({}), []);
  assert.deepEqual(parseCyclones({ features: null }), []);
});

test("keeps only TC events with Point geometry", () => {
  const data = {
    type: "FeatureCollection",
    features: [
      feature({ eventid: 1, episodeid: 1, eventtype: "FL", name: "Flood", alertlevel: "Red", windspeed: 10 }, 1, 2),
      {
        type: "Feature",
        properties: { eventid: 2, episodeid: 1, eventtype: "TC", name: "Storm", alertlevel: "Green", windspeed: 20 },
        geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 1]]] },
      },
    ],
  };
  assert.deepEqual(parseCyclones(data), []);
});

test("keeps only the later episode per eventid", () => {
  const data = {
    type: "FeatureCollection",
    features: [
      feature(
        {
          eventid: 100,
          episodeid: 3,
          eventtype: "TC",
          name: "REMI",
          title: "TC REMI-23",
          alertlevel: "Orange",
          windspeed: 120,
          description: "Orange alert for tropical cyclone",
          fromdate: "2024-04-03T00:00:00Z",
        },
        55.5,
        -16.2
      ),
      feature(
        {
          eventid: 100,
          episodeid: 7,
          eventtype: "TC",
          name: "REMI",
          title: "TC REMI-23 (update)",
          alertlevel: "Red",
          windspeed: 165,
          description: "Red alert for tropical cyclone",
          fromdate: "2024-04-05T00:00:00Z",
        },
        56.1,
        -17.0
      ),
      feature(
        {
          eventid: 200,
          episodeid: 2,
          eventtype: "TC",
          name: "FREDDY",
          title: "TC FREDDY-23",
          alertlevel: "Green",
          windspeed: 95,
          description: "Green alert",
          fromdate: "2024-03-01T00:00:00Z",
        },
        40.0,
        -18.0
      ),
    ],
  };

  const out = parseCyclones(data);
  assert.equal(out.length, 2);

  // strongest first
  assert.equal(out[0].name, "REMI");
  assert.equal(out[0].episode, 7);
  assert.equal(out[0].windKph, 165);
  assert.equal(out[0].alert, "Red");
  assert.equal(out[0].latitude, -17.0);
  assert.equal(out[0].longitude, 56.1);
  assert.equal(out[0].updated, "2024-04-05T00:00:00Z");

  assert.equal(out[1].name, "FREDDY");
  assert.equal(out[1].id, 200);
  assert.equal(out[1].detail, "Green alert");
});

test("sorts by wind speed descending", () => {
  const data = {
    type: "FeatureCollection",
    features: [
      feature({ eventid: 1, episodeid: 1, eventtype: "TC", name: "A", alertlevel: "Green", windspeed: 50 }, 1, 1),
      feature({ eventid: 2, episodeid: 1, eventtype: "TC", name: "B", alertlevel: "Red", windspeed: 200 }, 2, 2),
      feature({ eventid: 3, episodeid: 1, eventtype: "TC", name: "C", alertlevel: "Orange", windspeed: 100 }, 3, 3),
    ],
  };
  const out = parseCyclones(data);
  assert.deepEqual(
    out.map((c) => c.name),
    ["B", "C", "A"]
  );
});

test("alert colors map correctly", () => {
  assert.equal(alertColor("Red"), "#c44732");
  assert.equal(alertColor("Orange"), "#e0a15a");
  assert.equal(alertColor("Green"), "#2f6f4e");
  assert.equal(alertColor("Whatever"), "#2f6f4e");
});
