export type CatalogErrorCode = "NOT_FOUND" | "CONFLICT" | "INVALID_REFERENCE" | "DUPLICATE";

export class CatalogError extends Error {
  constructor(public readonly code: CatalogErrorCode, message: string) {
    super(message);
    this.name = "CatalogError";
  }
}
