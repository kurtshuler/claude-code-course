import { betterAuth } from "better-auth";
import { getDb } from "./db";

function createAuth() {
  return betterAuth({
    database: getDb(),
    emailAndPassword: {
      enabled: true,
    },
  });
}

type Auth = ReturnType<typeof createAuth>;

let _auth: Auth | undefined;

export function getAuth(): Auth {
  if (!_auth) {
    _auth = createAuth();
  }
  return _auth;
}
