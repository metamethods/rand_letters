import { createClient } from 'redis';
import { atprotoAgent, createImage, generateUniqueWord } from './lib';

const redisClient = await createClient({
  url: Bun.env.REDIS_DATABASE,
})
  .on('error', (err) => console.log('Redis Client Error', err))
  .connect();

const bskyClient = await atprotoAgent(
  Bun.env.BSKY_SERVICE,
  Bun.env.BSKY_USERNAME,
  Bun.env.BSKY_PASSWORD
);

const word = await generateUniqueWord(
  redisClient,
  Number(Bun.env.WORD_MIN),
  Number(Bun.env.WORD_MAX)
);
const image = await createImage(word);

Bun.file('preview.png').writer().write(image);

const { data } = await bskyClient.uploadBlob(new Blob([image]));

await bskyClient.post({
  text: word,
  embed: {
    $type: 'app.bsky.embed.images',
    images: [
      {
        image: data.blob,
        alt: word,
      },
    ],
  },
});

await redisClient.set(word, word);
await redisClient.disconnect();
