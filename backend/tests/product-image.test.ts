import {expect,it} from 'vitest';
import sharp from 'sharp';
import {normalizeProductImage} from '../src/modules/productos/productImage.js';

it('decodes and resizes real images to a bounded JPEG without retaining the original format',async()=>{
  const input=await sharp({create:{width:1600,height:900,channels:4,background:'#68a98880'}}).png().toBuffer();
  const result=await normalizeProductImage('data:image/png;base64,'+input.toString('base64'));
  const metadata=await sharp(Buffer.from(result.split(',')[1],'base64')).metadata();
  expect(metadata.format).toBe('jpeg');
  expect(metadata.width).toBe(640);
  expect(metadata.height).toBe(360);
  expect(metadata.exif).toBeUndefined();
  expect(result.length).toBeLessThan(480_000);
});

it('rejects executable formats, malformed encodings, corrupt files and oversized payloads',async()=>{
  for(const input of [
    undefined,'https://example.test/photo.jpg',
    'data:image/svg+xml;base64,'+Buffer.from('<svg/>').toString('base64'),
    'data:image/jpeg;base64,'+Buffer.from('not an image').toString('base64'),
    'data:image/png;base64,abc','a'.repeat(480_001),
  ])await expect(normalizeProductImage(input)).rejects.toMatchObject({statusCode:400});
});

it('rejects large pixel dimensions before decoding the image',async()=>{
  const input=await sharp({create:{width:4000,height:4000,channels:3,background:'#fff'}}).png().toBuffer();
  await expect(normalizeProductImage('data:image/png;base64,'+input.toString('base64'))).rejects.toMatchObject({statusCode:400});
});
