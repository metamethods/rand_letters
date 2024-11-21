declare global {
  namespace NodeJS {
    interface ProcessEnv {
      BSKY_SERVICE: string;
      BSKY_EMAIL: string;
      BSKY_PASSWORD: string;

      REDIS_DATABASE: string;
    }
  }
}

export {};
