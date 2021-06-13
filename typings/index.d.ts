import 'egg';

declare module 'egg' {
  interface Application {
    cache: any,
    translation: any
  }
}
