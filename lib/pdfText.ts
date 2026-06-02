export async function extractPdfTextFromBuffer(
  buffer: ArrayBuffer | Uint8Array
) {
  const pdfjs =
    await import(
      "pdfjs-dist/legacy/build/pdf.mjs"
    );

  const data =
    buffer instanceof ArrayBuffer
      ? new Uint8Array(buffer)
      : new Uint8Array(buffer);

  const loadingTask =
    pdfjs.getDocument({
      data,
      isEvalSupported: false,
      useWorkerFetch: false,
    });

  const pdf =
    await loadingTask.promise;

  try {
    const pages: string[] =
      [];

    for (
      let pageNumber = 1;
      pageNumber <= pdf.numPages;
      pageNumber += 1
    ) {
      const page =
        await pdf.getPage(
          pageNumber
        );

      const textContent =
        await page.getTextContent();

      const pageText =
        textContent.items
          .map(
            (
              item
            ) =>
              "str" in item &&
              typeof item.str ===
                "string"
                ? item.str
                : ""
          )
          .filter(Boolean)
          .join(" ");

      pages.push(
        pageText
      );
    }

    return pages
      .join("\n\n")
      .trim();
  } finally {
    await pdf.destroy();
  }
}

export async function extractPdfTextFromDataUrl(
  dataUrl: string
) {
  const base64 =
    dataUrl.replace(
      /^data:[^;]+;base64,/,
      ""
    );

  return extractPdfTextFromBuffer(
    Buffer.from(
      base64,
      "base64"
    )
  );
}
