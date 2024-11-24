declare global {
  namespace NodeJS {
    interface ProcessEnv {
      BSKY_SERVICE: string;
      BSKY_USERNAME: string;
      BSKY_PASSWORD: string;

      IMAGE_TEXT: string;
      WORD_MIN: string;
      WORD_MAX: string;

      REDIS_DATABASE: string;
    }
  }
}

export {};
