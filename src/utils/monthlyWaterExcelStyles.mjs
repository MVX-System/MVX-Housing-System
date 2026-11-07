/** PR-10K.4 — accountant-approved header style contract.
 * Requires xlsx-js-style@1.2.0, NOT the SheetJS Community Edition writer.
 * The tests independently inspect the OOXML styles.xml for real styles.
 */
export function styleMonthlyApartmentWorksheet(sheet, dividerIndices = [1, 7, 13, 16]) {
  if (!sheet || typeof sheet !== "object") throw new Error("PR10K4_INVALID_WORKSHEET");
  const dividers = new Set(dividerIndices);
  const letters = "ABCDEFGHIJKLMNOPQR";
  const borderColor = { rgb: "64748B" };
  for (let col = 0; col < 18; col++) {
    const cell = sheet[`${letters[col]}2`];
    if (!cell) throw new Error(`PR10K4_MISSING_HEADER:${letters[col]}`);
    cell.s = {
      font: { bold: true },
      alignment: { vertical: "center" },
      ...(dividers.has(col) ? {
        border: { left: { style: "medium", color: borderColor } },
      } : {}),
    };
  }
  // Actual frozen panes are writer-dependent; do not claim this is supported
  // by xlsx-js-style.  Keep a readable merged legend and filter on row 2.
  sheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 17 } }];
  sheet["!rows"] = [{ hpt: 24 }, { hpt: 24 }];
  return sheet;
}
