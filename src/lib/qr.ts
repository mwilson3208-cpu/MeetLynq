import QRCode from "qrcode";

/**
 * Render `text` as a self-contained SVG QR code string (no external requests,
 * CSP-safe). Used for scannable check-in badges.
 */
export function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, { type: "svg", margin: 0, errorCorrectionLevel: "M" });
}
