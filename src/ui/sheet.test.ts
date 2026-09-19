import { describe, expect, it } from "vitest";
import { trip } from "../data/loadTrip";
import { lodgingAreaName, overnightStayLabel, statusLabel } from "./sheet";

describe("locked Thai overlay copy", () => {
  it("maps visit status to locked Thai", () => {
    expect(statusLabel("visited")).toBe("ไปแล้ว");
    expect(statusLabel("today")).toBe("วันนี้");
    expect(statusLabel("upcoming")).toBe("ยังไม่ถึง");
  });

  it("names overnight areas from lodging data", () => {
    const [asakusa, aoto] = trip.lodging;
    expect(lodgingAreaName(asakusa)).toBe("Asakusa");
    expect(lodgingAreaName(aoto)).toBe("Aoto");
    expect(overnightStayLabel(trip, "2026-09-18")).toBe("ค้างคืนที่ Asakusa");
    expect(overnightStayLabel(trip, "2026-09-19")).toBe("ค้างคืนที่ Aoto");
    expect(overnightStayLabel(trip)).toBe("ค้างคืนที่ Asakusa / Aoto");
  });
});
