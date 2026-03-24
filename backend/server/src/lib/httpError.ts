export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
  }
}

export const isHttpError = (error: unknown): error is HttpError =>
  error instanceof HttpError || (error instanceof Error && typeof (error as any).statusCode === "number");
