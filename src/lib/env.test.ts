import { describe, expect, it } from "vitest";
import { resolveDataSource } from "./env";

describe("data source guard", () => {
  it("defaults to mock data in development", () => {
    expect(resolveDataSource({ NODE_ENV: "development" })).toBe("mock");
  });

  it("defaults to Supabase in production", () => {
    expect(resolveDataSource({ NODE_ENV: "production" })).toBe("supabase");
  });

  it("refuses mock data and mock login in production", () => {
    expect(() => resolveDataSource({ NODE_ENV: "production", QUEUE_UP_DATA_SOURCE: "mock" })).toThrow(/production/);
  });
});
