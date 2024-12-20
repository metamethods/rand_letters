import { Agent, CredentialSession } from '@atproto/api';
import sharp, { fit } from 'sharp';
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

export function generateWord(min: number, max: number): string {
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
  const font = {
    font: 'Plus Jakarta Sans Bold',
    fontfile: resolve(join(FONTS_PATH, 'plus-jakarta-sans.ttf')),
  };

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
        input: await sharp({
          text: {
            text: `<span foreground="${textColor}" font-size="96pt">${word}</span>`,
            rgba: true,
            ...font,
          },
        })
          .resize({
            width: 832,
            height: 540,
            fit: fit.inside,
            withoutEnlargement: true,
          })
          .png()
          .toBuffer(),
      },
      {
        input: {
          text: {
            text: `<span foreground="${textColor}" size="32pt">${Bun.env.IMAGE_TEXT}</span>`,
            rgba: true,
            ...font,
          },
        },
        top: 16,
        left: 20,
      },
      {
        input: await sharp({
          text: {
            text: `<span foreground="${textColor}" size="32pt">@${Bun.env.BSKY_USERNAME}</span>`,
            rgba: true,
            ...font,
          },
        })
          .extend({
            right: 20,
            bottom: 16,
            background: '#0000',
          })
          .png()
          .toBuffer(),
        gravity: 'southeast',
      },
    ])
    .png()
    .toBuffer();
}
