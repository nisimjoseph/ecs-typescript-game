/**
 * @module assets
 * @description TypeScript declarations for asset imports.
 * 
 * Allows importing MP3 files as data URLs via webpack's asset/inline.
 */

declare module '*.mp3' {
  const src: string;
  export default src;
}
