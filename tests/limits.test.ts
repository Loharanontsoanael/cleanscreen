import { describe, expect, it } from "vitest";
import { chunks, clip } from "@/lib/limits";

describe("clip", () => {
  it("counts code points, not UTF-16 units", () => {
    expect(clip("ab😀cd", 3)).toBe("ab😀");
    expect(clip("short", 10)).toBe("short");
  });
});

describe("chunks", () => {
  it("returns one chunk when the text fits", () => {
    expect(chunks("hello", 10)).toEqual([{ text: "hello", offset: 0 }]);
  });

  it("covers the whole text with code-point offsets and no overlap", () => {
    const text = Array.from({ length: 50 }, (_, i) => `line ${i} 😀`).join("\n");
    const parts = chunks(text, 120);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.map((p) => p.text).join("")).toBe(text);
    for (const p of parts) {
      expect(Array.from(p.text).length).toBeLessThanOrEqual(120);
      expect(Array.from(text).slice(p.offset, p.offset + Array.from(p.text).length).join("")).toBe(p.text);
    }
  });

  it("prefers to cut at a line break", () => {
    const text = `${"a".repeat(95)}\n${"b".repeat(50)}`;
    expect(chunks(text, 100)[0].text).toBe(`${"a".repeat(95)}\n`);
  });
});
