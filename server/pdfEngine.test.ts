import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { extractPdfText } from "./pdfEngine";

async function fixture(name: string) {
  const file = await readFile(`vendor/NexussPDF/test/fixtures/${name}`);
  return new Uint8Array(file);
}

describe("C-NINE NexussPDF engine", () => {
  it("extracts selectable PDF text with page maps", async () => {
    const result = await extractPdfText(await fixture("selectable.pdf"), { ocr: true });
    expect(result.method).toBe("pdfjs");
    expect(result.pageCount).toBe(2);
    expect(result.pageMap).toHaveLength(2);
    expect(result.pageMap[0].text).toContain("Selectable text should be extracted exactly");
    expect(result.text).toContain("Page 2");
  });

  it("falls back to Tesseract.js for scanned PDFs", async () => {
    const result = await extractPdfText(await fixture("scanned.pdf"), { ocr: true, language: "eng" });
    expect(result.method).toBe("tesseractjs");
    expect(result.pageCount).toBe(2);
    expect(result.pageMap[0].text).toMatch(/OCR page one/i);
    expect(result.pageMap[1].text).toMatch(/OCR page two/i);
  }, 120_000);
});
