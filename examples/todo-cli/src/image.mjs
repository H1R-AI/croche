import { closeSync, fstatSync, openSync, readSync } from 'node:fs';
import { AppError } from './app.mjs';

/** Read only a small local image, not arbitrary text/credential files. */
export function readImage(file) {
  const fd = openSync(file, 'r');
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.size === 0 || stat.size > 3 * 1024 * 1024) {
      throw new AppError('Choose a PNG, JPEG, WebP or GIF no larger than 3 MB.');
    }
    const bytes = Buffer.alloc(stat.size);
    let read = 0;
    while (read < bytes.length) {
      const count = readSync(fd, bytes, read, bytes.length - read, read);
      if (!count) throw new AppError('The image changed while reading it. Try again.');
      read += count;
    }
    const mime = bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) ? 'image/png'
      : bytes.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex')) ? 'image/jpeg'
      : ['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString()) ? 'image/gif'
      : bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP' ? 'image/webp' : null;
    if (!mime) throw new AppError('Not a supported image. Never pass a credential or text file as an image.');
    return { data: bytes.toString('base64'), mime, alt: 'Photo of a handwritten shopping list supplied by the person.', resolution: 'high' };
  } finally { closeSync(fd); }
}
