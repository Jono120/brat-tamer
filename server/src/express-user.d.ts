/** Passport serializes `Express.User`; session strategies attach `{ id }`. */
declare global {
  namespace Express {
    interface User {
      id: string;
    }
  }
}

export {};
