// Type declarations for b4a module
declare module "b4a" {
  export function toString(
    buffer: Buffer | Uint8Array,
    encoding?: "hex" | "base64" | "utf8" | "utf-8"
  ): string;

  export function from(
    data: string | Buffer | Uint8Array,
    encoding?: "hex" | "base64" | "utf8" | "utf-8"
  ): Buffer;

  export function alloc(size: number, fill?: number): Buffer;
  export function allocUnsafe(size: number): Buffer;
  export function concat(buffers: Buffer[]): Buffer;
  export function isBuffer(obj: any): obj is Buffer;
  export function compare(a: Buffer, b: Buffer): number;
  export function equals(a: Buffer, b: Buffer): boolean;
}
