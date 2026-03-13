import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";

import {
  EstimationPdfDocument,
  type EstimationPdfDocumentProps,
} from "./EstimationPdfDocument";

export async function renderEstimationPdf(
  props: EstimationPdfDocumentProps
): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return renderToBuffer(createElement(EstimationPdfDocument, props) as any);
}
