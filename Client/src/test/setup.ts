import "@testing-library/jest-dom";
import "vitest-canvas-mock";
import { vi } from "vitest";

type ApexChartProps = {
  type?: string;
  series?: unknown[];
};

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: vi.fn(),
});

// Mock fetch globally
const mockFetch = vi.fn().mockImplementation(() =>
  Promise.resolve({
    json: () => Promise.resolve([]),
    ok: true,
    status: 200,
  } as Response)
);
global.fetch = mockFetch as typeof fetch;

// Mock solid-apexcharts
vi.mock("solid-apexcharts", () => {
  return {
    SolidApexCharts: (props: ApexChartProps) => {
      const el = document.createElement("div");
      el.setAttribute("data-testid", "mock-apexchart");
      el.setAttribute("data-type", props.type || "");
      el.setAttribute("data-series", JSON.stringify(props.series || []));
      el.textContent = "Mock Chart";
      return el;
    },
  };
});

// Mock OpenLayers
vi.mock("ol/Map", () => {
  return {
    default: class MockMap {
      addLayer = vi.fn();
      addOverlay = vi.fn();
      addInteraction = vi.fn();
      getView = vi.fn().mockReturnValue({
        fit: vi.fn(),
      });
      setTarget = vi.fn();
    },
  };
});

vi.mock("ol/View", () => {
  return {
    default: class MockView {
      constructor() {}
    },
  };
});

vi.mock("ol/source", () => {
  return {
    Vector: class MockVectorSource {
      constructor() {}
    },
    XYZ: class MockXYZSource {
      constructor() {}
    },
  };
});

vi.mock("ol/source/Vector", () => {
  return {
    default: class MockVectorSource {
      constructor() {}
    },
  };
});

vi.mock("ol/source/XYZ", () => {
  return {
    default: class MockXYZSource {
      constructor() {}
    },
  };
});

vi.mock("ol/layer", () => {
  return {
    Tile: class MockTileLayer {
      constructor() {}
    },
    Vector: class MockVectorLayer {
      constructor() {}
      setProperties = vi.fn();
    },
  };
});

vi.mock("ol/layer/Vector", () => {
  return {
    default: class MockVectorLayer {
      constructor() {}
      setProperties = vi.fn();
    },
  };
});

vi.mock("ol/format/GeoJSON", () => {
  return {
    default: class MockGeoJSON {
      readFeature = vi.fn().mockImplementation(() => {
        return {
          getId: () => undefined,
          getGeometry: () => {
            return {
              getInteriorPoint: () => {
                return {
                  getCoordinates: () => [1721600, 10692300],
                };
              },
              getExtent: () => [0, 0, 1, 1],
              simplifyTransformedInternal: () => {
                return {
                  getInteriorPoint: () => {
                    return {
                      getCoordinates: () => [1721600, 10692300],
                    };
                  },
                };
              },
            };
          },
          getProperties: () => ({ name: "Mock Field", "group-name": "Mock Group" }),
          set: vi.fn(),
        };
      });
    },
  };
});

vi.mock("ol/geom", () => {
  return {
    Geometry: class MockGeometry {},
    Polygon: class MockPolygon {},
  };
});

vi.mock("ol/interaction", () => {
  return {
    Select: class MockSelect {
      constructor() {}
      on = vi.fn();
    },
  };
});

vi.mock("ol/style/Style", () => {
  return {
    default: class MockStyle {
      constructor() {}
    },
  };
});

vi.mock("ol/style/Stroke", () => {
  return {
    default: class MockStroke {
      constructor() {}
    },
  };
});

vi.mock("ol/style/Fill", () => {
  return {
    default: class MockFill {
      constructor() {}
    },
  };
});

vi.mock("ol", () => {
  return {
    Feature: class MockFeature {
      constructor() {}
      getId = vi.fn().mockReturnValue(undefined);
      set = vi.fn();
      getProperties = vi.fn().mockReturnValue({});
    },
    Overlay: class MockOverlay {
      constructor() {}
    },
  };
});

vi.mock("ol/sphere", () => {
  return {
    getArea: vi.fn().mockReturnValue(12345),
  };
});
