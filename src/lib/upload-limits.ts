// Shared between the server upload path and client upload forms.
// Vercel caps serverless request bodies at ~4.5 MB, so anything larger can
// never reach a server action in production. Enforce 4 MB end to end.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_UPLOAD_LABEL = "4 MB";
