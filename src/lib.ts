import { Agent, CredentialSession } from '@atproto/api';
import sharp from 'sharp';
import { createClient } from 'redis';
import { join, resolve } from 'path';
import { readdir } from 'node:fs/promises';
import type { BunFile } from 'bun';

// this is so dumb
type RedisClientType = ReturnType<typeof createClient>;

const ASSETS_DIRECTORY = 'assets';
const BACKGROUNDS_PATH = join(ASSETS_DIRECTORY, 'backgrounds');
const FONTS_PATH = join(ASSETS_DIRECTORY, 'fonts');

export async function atprotoAgent(
  serviceUrl: string,
  identifier: string,
  password: string
): Promise<Agent> {
  const credentialSession = new CredentialSession(new URL(serviceUrl));
  await credentialSession.login({
    identifier,
    password,
  });

  return new Agent(credentialSession);
}

function generateLetter(): string {
  const value = Math.floor(Math.random() * 29);
  if (value < 26) return String.fromCharCode(97 + value);
  else return ['?', '!', '*'][value - 26];
}

function generateWord(min: number, max: number): string {
  const length = Math.floor(Math.random() * (max - min + 1)) + min;
  return `${generateLetter().toUpperCase()}${Array.from(
    { length: length - 1 },
    generateLetter
  ).join('')}`;
}

export async function generateUniqueWord(
  redisClient: RedisClientType,
  min: number,
  max: number
): Promise<string> {
  let word = generateWord(min, max);

  while (true)
    if (await redisClient.get(word)) word = generateWord(min, max);
    else break;

  return word;
}

async function randomBackground(): Promise<string> {
  const backgrounds = await readdir(BACKGROUNDS_PATH, {});
  const backgroundPath =
    backgrounds[Math.floor(Math.random() * backgrounds.length)];
  return join(BACKGROUNDS_PATH, backgroundPath);
}

async function loadImageFromFile(file: BunFile): Promise<Buffer> {
  return Buffer.from(await file.arrayBuffer());
}

export async function createImage(word: string): Promise<Buffer> {
  const cmuSerifExtraFont = resolve(
    join(FONTS_PATH, 'cmu-classical-serif.ttf')
  );

  const backgroundPath = await randomBackground();
  const textColor = /\.dark\.[a-z]+$/.exec(backgroundPath)
    ? '#c6d0f5'
    : '#1e1e2e';

  return sharp(await loadImageFromFile(Bun.file(backgroundPath)))
    .resize({
      width: 960,
      height: 540,
    })
    .composite([
      {
        input: Buffer.from(`
          <svg width="100%" height="100%" viewBox="0 0 960 540">
            <defs>
              <style>
                @font-face {
                  font-family: "CMUClassicalSerif";
                  src: url("${cmuSerifExtraFont}") format("truetype");
                }

                text {
                  font-family: CMUClassicalSerif, sans-serif;
                }
              </style>
            </defs>

            <text 
              x="50%" 
              y="50%"
              dy="0.25em"
              text-anchor="middle" 
              font-size="128px" 
              fill="${textColor}"
            >${word}</text>

            <text
              x="100%"
              y="100%"
              dx="-1em"
              dy="-1em"
              text-anchor="end"
              font-size="32px"
              fill="${textColor}"
            >${Bun.env.IMAGE_TEXT}</text>

            <text
              dx="1em"
              dy="1.75em"
              dominant-baseline="hanging"
              text-anchor="start"
              font-size="32px"
              fill="${textColor}"
            >@${Bun.env.BSKY_USERNAME}</text>
          </svg>
        `),
      },
    ])
    .png()
    .toBuffer();
}
