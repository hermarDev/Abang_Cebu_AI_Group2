"use strict";

/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const componentPath = path.join(__dirname, "MapCanvas.tsx");
const componentSource = readFileSync(componentPath, "utf8");
const sourceFile = ts.createSourceFile(
  componentPath,
  componentSource,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);

function findHandler(name) {
  function findVariable(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(sourceFile) === name) {
      return node.initializer;
    }

    return ts.forEachChild(node, findVariable);
  }

  const handler = findVariable(sourceFile);
  assert.ok(handler, `MapCanvas must define its ${name} handler`);
  return handler;
}

function findCallback(name) {
  const initializer = findHandler(name);
  assert.ok(ts.isCallExpression(initializer), `${name} must use a callback hook`);
  const callback = initializer.arguments[0];
  assert.ok(ts.isArrowFunction(callback), `${name} must be an arrow callback`);
  return callback;
}

const onLoadHandler = findHandler("onLoad");
const onMapErrorHandler = findHandler("onMapError");

function extractLocationErrorHandler() {
  let handler;
  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "getCurrentPosition"
    ) {
      handler = node.arguments[1];
    }
    ts.forEachChild(node, visit);
  }
  visit(findHandler("locateMe"));
  assert.ok(handler, "locateMe must define a geolocation error callback");
  return handler;
}

function createMapCallbacks(initialState) {
  const state = { ...initialState };
  const context = {
    active: true,
    mapLoaded: false,
    setMapStatus(status) {
      state.mapStatus = status;
    },
    setStatusMessage(message) {
      state.statusMessage = message;
    },
  };

  return {
    state,
    onLoad: vm.runInNewContext(`(${onLoadHandler.getText(sourceFile)})`, context),
    onError: vm.runInNewContext(`(${onMapErrorHandler.getText(sourceFile)})`, context),
  };
}

function createLocationFailureState(initialState) {
  const state = { ...initialState };
  let removeCount = 0;
  const marker = {
    remove() {
      removeCount += 1;
    },
  };
  const markerRef = { current: marker };
  const mapRef = {
    current: {
      flyTo(options) {
        state.lastFlyTo = options;
      },
    },
  };
  const locationRequestRef = { current: 1 };
  const vmContext = vm.createContext({
    requestId: 1,
    locationRequestRef,
    mapRef,
    markerRef,
    METRO_CEBU_CENTER: [123.8854, 10.3157],
    DEFAULT_ZOOM: 13,
    LOCATION_ERROR_MESSAGES: {
      1: "Location permission was denied. The map remains centered on Metro Cebu.",
    },
    setLocationStatus(status) {
      state.locationStatus = status;
    },
    setStatusMessage(message) {
      state.statusMessage = message;
    },
  });
  const callback = vm.runInContext(
    `(${extractLocationErrorHandler().getText(sourceFile)})`,
    vmContext,
  );
  callback({ code: 1 });

  return { markerRef, removeCount: () => removeCount, state };
}

test("an initial map error marks the map unavailable", () => {
  const callbacks = createMapCallbacks({
    mapStatus: "loading",
    statusMessage: "Map centered on Metro Cebu.",
  });
  callbacks.onError();

  assert.deepEqual(callbacks.state, {
    mapStatus: "unavailable",
    statusMessage: "The map could not be loaded. Check your connection and try again.",
  });
});

test("a resource error after load leaves the map ready", () => {
  const callbacks = createMapCallbacks({
    mapStatus: "loading",
    statusMessage: "Map loaded.",
  });
  callbacks.onLoad();
  callbacks.onError();

  assert.deepEqual(callbacks.state, {
    mapStatus: "ready",
    statusMessage: "Map loaded.",
  });
});

test("a failed later location request removes the stale location marker", () => {
  const { markerRef, removeCount, state } = createLocationFailureState({
    locationStatus: "located",
    statusMessage: "Your location was found and the map was recentered.",
  });

  assert.equal(removeCount(), 1);
  assert.equal(markerRef.current, null);
  assert.equal(state.lastFlyTo.zoom, 13);
  assert.equal(state.lastFlyTo.duration, 500);
  assert.deepEqual(Array.from(state.lastFlyTo.center), [123.8854, 10.3157]);
  assert.equal(state.locationStatus, "fallback");
});
test("unsupported geolocation removes a previous location marker", () => {
  let markerRemovals = 0;
  const state = {};
  const markerRef = {
    current: {
      remove() {
        markerRemovals += 1;
      },
    },
  };
  const context = {
    navigator: {},
    mapRef: {
      current: {
        flyTo(options) {
          state.flyTo = options;
        },
      },
    },
    markerRef,
    locationRequestRef: { current: 3 },
    locationStatus: "located",
    METRO_CEBU_CENTER: [123.8854, 10.3157],
    DEFAULT_ZOOM: 13,
    setLocationStatus(status) {
      state.locationStatus = status;
    },
    setStatusMessage(message) {
      state.statusMessage = message;
    },
  };
  const callbackSource = ts.transpile(
    `(${findCallback("locateMe").getText(sourceFile)})`,
    { target: ts.ScriptTarget.ES2020 },
  );
  vm.runInNewContext(callbackSource, context)();

  assert.equal(markerRemovals, 1);
  assert.equal(markerRef.current, null);
  assert.equal(state.locationStatus, "fallback");
  assert.deepEqual(Array.from(state.flyTo.center), [123.8854, 10.3157]);
});

test("reset removes location marker and restores Metro Cebu", () => {
  let markerRemovals = 0;
  const state = {};
  const markerRef = {
    current: {
      remove() {
        markerRemovals += 1;
      },
    },
  };
  const context = {
    mapRef: {
      current: {
        flyTo(options) {
          state.flyTo = options;
        },
      },
    },
    markerRef,
    locationRequestRef: { current: 8 },
    METRO_CEBU_CENTER: [123.8854, 10.3157],
    DEFAULT_ZOOM: 13,
    setLocationStatus(status) {
      state.locationStatus = status;
    },
    setStatusMessage(message) {
      state.statusMessage = message;
    },
  };
  vm.runInNewContext(`(${findCallback("resetToMetroCebu").getText(sourceFile)})`, context)();

  assert.equal(markerRemovals, 1);
  assert.equal(markerRef.current, null);
  assert.equal(context.locationRequestRef.current, 9);
  assert.equal(state.locationStatus, "idle");
  assert.equal(state.statusMessage, "Map centered on Metro Cebu.");
  assert.deepEqual(Array.from(state.flyTo.center), [123.8854, 10.3157]);
});
