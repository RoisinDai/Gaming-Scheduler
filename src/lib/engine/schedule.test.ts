import { describe, expect, it } from "vitest";
import { availabilityFor, IDS, makePlayers } from "@/test/fixtures";
import { availableOn, buildDay, buildDays, dayState } from "./schedule";
import { updateDates } from "./availability";

const players = makePlayers();
const FRI = "2026-11-27";

describe("gaming schedule", () => {
  it("maps counts to visual states", () => {
    expect(dayState(0)).toBe("empty");
    expect(dayState(1)).toBe("building");
    expect(dayState(4)).toBe("building");
    expect(dayState(5)).toBe("stack");
    expect(dayState(6)).toBe("excess");
  });

  it("is empty when nobody has entered availability", () => {
    const days = buildDays([FRI, "2026-11-28"], players, availabilityFor({}));
    expect(days.every((day) => day.state === "empty" && day.playerIds.length === 0)).toBe(true);
  });

  it("shows exactly who is available, in squad order", () => {
    const availability = availabilityFor({ c: [FRI], a: [FRI], f: [FRI] });
    expect(availableOn(FRI, players, availability)).toEqual(["a", "c", "f"]);
  });

  it("flags five as a stack and six as excess without excluding anyone", () => {
    const five = availabilityFor(Object.fromEntries(IDS.slice(0, 5).map((id) => [id, [FRI]])));
    expect(buildDay(FRI, players, five)).toMatchObject({ count: 5, state: "stack" });

    const six = availabilityFor(Object.fromEntries(IDS.map((id) => [id, [FRI]])));
    const day = buildDay(FRI, players, six);
    expect(day.state).toBe("excess");
    expect(day.playerIds).toEqual([...IDS]);
  });

  it("updates as soon as someone changes their calendar", () => {
    const availability = availabilityFor(Object.fromEntries(IDS.slice(0, 5).map((id) => [id, [FRI]])));
    expect(buildDay(FRI, players, availability).state).toBe("stack");
    const changed: Record<string, string[]> = { ...availability, f: updateDates(availability.f, [FRI], true) };
    expect(buildDay(FRI, players, changed).state).toBe("excess");
    const removed = { ...changed, a: updateDates(changed.a, [FRI], false) };
    expect(buildDay(FRI, players, removed)).toMatchObject({ count: 5, state: "stack" });
  });
});
