export {};

declare global {
  interface BigInt {
    /** * Serializes BigInt to a string for JSON.stringify.
     */
    toJSON(): string;
  }
}