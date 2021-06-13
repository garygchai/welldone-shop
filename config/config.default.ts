import { EggAppConfig, EggAppInfo, PowerPartial } from 'egg';

export default (appInfo: EggAppInfo) => {
  const config = {} as PowerPartial<EggAppConfig>;

  // override config from framework / plugin
  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + '_1623071752188_9837';

  // add your egg config in here
  config.middleware = [];

  // add your special config in here
  const bizConfig = {
    exchangeRate: 5.4, // 汇率先写死5.4
    discount: 0.8, // 现价=市场价打8折
    expressPay: 350 // 运费
  };

  config.weixin = {
    appid: 'wx1d9709e129e96a65',
    secret: '825aa6c0bc32039bfeb7af34df393917'
  }

  config.baidu = {
    appid: '20210609000858192',
    secret: 'NSEU7Ga2z5tykxiSrUKV',
    api: 'https://fanyi-api.baidu.com/api/trans/vip/translate'
  }
  config.cache = {
    default: 'memory',
    stores: {
      memory: {
        driver: 'memory',
        max: 100,
        ttl: 7200,
      },
    },
  }

  // the return config will combines to EggAppConfig
  return {
    ...config,
    ...bizConfig,
  };
};
