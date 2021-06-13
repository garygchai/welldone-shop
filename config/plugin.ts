import { EggPlugin } from 'egg';

const plugin: EggPlugin = {
  cache: {
    enable: true,
    package: 'egg-cache',
  }
  // static: true,
  // nunjucks: {
  //   enable: true,
  //   package: 'egg-view-nunjucks',
  // },
};

export default plugin;
