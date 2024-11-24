import { createImage } from '../src/lib';

Bun.file('preview.png')
  .writer()
  .write(await createImage('a'));
