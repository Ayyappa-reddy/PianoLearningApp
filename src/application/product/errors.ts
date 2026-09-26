export class ProductError extends Error {
  constructor(public readonly code: "NOT_FOUND" | "CONFLICT" | "INVALID_REFERENCE" | "DUPLICATE", message: string) {
    super(message);
    this.name = "ProductError";
  }
}
