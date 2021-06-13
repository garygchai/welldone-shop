// This file is created by egg-ts-helper@1.25.6
// Do not modify this file!!!!!!!!!

import 'egg';
import ExportO17Shop from '../../../app/service/O17Shop';
import ExportTest from '../../../app/service/Test';
import ExportTranslater from '../../../app/service/Translater';
import ExportWexinAPI from '../../../app/service/WexinAPI';
import ExportUtils from '../../../app/service/utils';

declare module 'egg' {
  interface IService {
    o17Shop: ExportO17Shop;
    test: ExportTest;
    translater: ExportTranslater;
    wexinAPI: ExportWexinAPI;
    utils: ExportUtils;
  }
}
