import { render } from "@solidjs/testing-library";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NoEditMap } from "../maps/Map";
import * as requests from "../requests";

// Mock the requests module
vi.mock("../requests", () => {
  return {
    getFarmFieldGroupsWithFields: vi.fn().mockResolvedValue([
      [
        {
          id: 1,
          name: "Nordmarka",
          draw_color: "#FF0000",
          farm_id: 1,
        },
        [
          {
            id: 10,
            name: "Jordet 1",
            map_polygon_string: `{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[1721600,10692300],[1721600,10692400],[1721700,10692400],[1721700,10692300],[1721600,10692300]]]}}`,
            farm_field_group_id: 1,
          },
        ],
      ],
    ]),
  };
});

describe("NoEditMap Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the map container correctly", async () => {
    const { container } = render(() => <NoEditMap />);

    // Check that the container rendered the viewport main and map container div
    const mapDiv = container.querySelector("#map_container");
    expect(mapDiv).toBeInTheDocument();
    expect(mapDiv).toHaveClass("map");
  });

  it("triggers fetching field groups with fields", async () => {
    render(() => <NoEditMap />);

    // Wait and verify that getFarmFieldGroupsWithFields was called on mount
    await vi.waitFor(() => {
      expect(requests.getFarmFieldGroupsWithFields).toHaveBeenCalled();
    });
  });
});
