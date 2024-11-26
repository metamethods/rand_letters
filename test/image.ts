import { createImage, generateWord } from '../src/lib';

const word = generateWord(Number(Bun.env.WORD_MIN), Number(Bun.env.WORD_MAX));

Bun.file('preview.png')
  .writer()
  .write(await createImage(word));
