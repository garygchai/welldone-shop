import { Service } from 'egg';
import axios from 'axios'
import * as md5 from 'md5'
/**
 * Test Service
 */
export default class Translater extends Service {
  public getSign(query) {
    const {
      appid,
      secret,
    } = this.ctx.app.config.baidu
    const salt = `${Date.now()}`
    const content = `${appid}${query}${salt}${secret}`
    const sign = md5(content)
    return {
      appid,
      sign,
      salt,
    }
  }
  public async translate(query) {
    try {
      const {
        appid,
        sign,
        salt,
      } = this.getSign(query)
      const res = await axios({
        url: 'https://fanyi-api.baidu.com/api/trans/vip/translate',
        method: 'POST',
        params: {
          appid,
          sign,
          salt,
          from: 'en',
          to: 'zh',
          q: query
        },
        headers: {
          'content-type': 'application/x-www-form-urlencoded'
        }
      })
      if (res.data.trans_result) {
        return res.data.trans_result
      } else {
        this.ctx.logger.error(res.data)
        return null
      }
    } catch(error) {
      this.ctx.logger.error(error)
      return null
    }
  }
}
