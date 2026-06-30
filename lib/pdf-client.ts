// Client-only helper to turn plain text into a downloadable PDF.
// jsPDF is imported lazily so it stays out of the initial bundle.

function isHeading(line: string): boolean {
  const t = line.trim();
  if (!t || t.length > 40) return false;
  const letters = t.replace(/[^a-zA-Z]/g, "");
  return letters.length >= 3 && letters === letters.toUpperCase();
}

export async function downloadTextAsPdf(
  text: string,
  filename: string,
  opts: { serif?: boolean; headingRules?: boolean } = {}
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const font = opts.serif ? "times" : "helvetica";

  const marginX = 50;
  const marginTop = 56;
  const marginBottom = 56;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - marginX * 2;
  const lineHeight = 15;
  let y = marginTop;

  const addPageIfNeeded = (needed: number) => {
    if (y + needed > pageHeight - marginBottom) {
      doc.addPage();
      y = marginTop;
    }
  };

  text.split("\n").forEach((raw, idx) => {
    const line = raw.replace(/\s+$/g, "");
    if (line.trim() === "") {
      y += lineHeight * 0.6;
      return;
    }
    const isName = idx === 0 && line.trim().length <= 60 && opts.headingRules;
    const heading = !isName && opts.headingRules !== false && isHeading(line);

    doc.setFont(font, heading || isName ? "bold" : "normal");
    doc.setFontSize(isName ? 16 : heading ? 12 : 11);

    const wrapped: string[] = doc.splitTextToSize(line, maxWidth);
    for (const piece of wrapped) {
      addPageIfNeeded(lineHeight);
      doc.text(piece, marginX, y);
      y += lineHeight;
    }
    if (heading) {
      addPageIfNeeded(4);
      doc.setDrawColor(180);
      doc.line(marginX, y - lineHeight + 3, pageWidth - marginX, y - lineHeight + 3);
      y += 2;
    }
  });

  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  doc.save(`${safe}.pdf`);
}
