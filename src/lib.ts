import { Agent, CredentialSession } from '@atproto/api';
import sharp from 'sharp';
import { createClient } from 'redis';
import { join, resolve } from 'path';
import { readdir } from 'node:fs/promises';

// this is so dumb
type RedisClientType = ReturnType<typeof createClient>;

const ASSETS_DIRECTORY = 'assets';
const BACKGROUNDS_PATH = join(ASSETS_DIRECTORY, 'backgrounds');
const FONTS_PATH = join(ASSETS_DIRECTORY, 'fonts');

const TEXT_COLOR_OVERRIDES: { [key: string]: string } = {
  'rex.png': '#c6d0f5',
  'numbers-dark.png': '#c6d0f5',
};

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

function generateWord(): string {
  const length = Math.floor(Math.random() * 4) + 2;
  return `${generateLetter().toUpperCase()}${Array.from(
    { length: length - 1 },
    generateLetter
  ).join('')}`;
}

export async function generateUniqueWord(
  redisClient: RedisClientType
): Promise<string> {
  let word = generateWord();

  while (true)
    if (await redisClient.get(word)) word = generateWord();
    else break;

  await redisClient.set(word, word);

  return word;
}

async function randomBackground(): Promise<[Buffer, string]> {
  const backgrounds = await readdir(BACKGROUNDS_PATH, {});
  const backgroundPath =
    backgrounds[Math.floor(Math.random() * backgrounds.length)];
  return [
    Buffer.from(
      await Bun.file(join(BACKGROUNDS_PATH, backgroundPath)).arrayBuffer()
    ),
    backgroundPath,
  ];
}

export async function createImage(word: string): Promise<Buffer> {
  const cmuSerifExtraFont = {
    font: 'CMU Serif Extra',
    fontfile: resolve(join(FONTS_PATH, 'cmu-serif-extra.ttf')),
  };

  const [background, backgroundPath] = await randomBackground();
  const textColor = TEXT_COLOR_OVERRIDES[backgroundPath] || '#1e1e2e';

  return sharp(background)
    .resize({
      width: 960,
      height: 540,
    })
    .composite([
      {
        input: {
          text: {
            text: `<span foreground="${textColor}" size="128pt">${word}</span>`,
            rgba: true,
            ...cmuSerifExtraFont,
          },
        },
      },
      {
        input: {
          text: {
            text: `<span foreground="${textColor}" size="24pt"><b>2-5 Random Letters Every 10 minutes
            Maintained by metamethods</b></span>`,
            rgba: true,
            ...cmuSerifExtraFont,
          },
        },
        gravity: 'southeast',
      },
    ])
    .png()
    .toBuffer();
}
