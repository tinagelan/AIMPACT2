import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCsv, rowsToRecords } from "./parse";

describe("template import", () => {
  it("reads the team template", () => {
    const r = rowsToRecords(parseCsv(readFileSync("public/templates/team.csv", "utf8")));
    expect(r.employees).toHaveLength(2);
    expect(r.employees[0].salary.exact).toBe(9000);
    expect(r.employees[1].salary.range).toEqual({ min: 10000, max: 13000 });
    expect(r.employees[1].section14).toBe("unknown");
  });
  it("reads the software template and matches catalog tools", () => {
    const r = rowsToRecords(parseCsv(readFileSync("public/templates/software.csv", "utf8")));
    expect(r.subscriptions.map((s) => s.toolId)).toEqual(["asana", "zoom"]);
    expect(r.subscriptions[0].activeSeats).toBe(6);
  });
});
