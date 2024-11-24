declare global {
  namespace NodeJS {
    interface ProcessEnv {
      BSKY_SERVICE: string;
      BSKY_USERNAME: string;
      BSKY_PASSWORD: string;

      IMAGE_TEXT: string;
      WORD_MIN: number;
      WORD_MAX: number;

      REDIS_DATABASE: string;
    }
  }
}

export {};
