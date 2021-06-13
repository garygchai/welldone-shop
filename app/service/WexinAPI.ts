import { Service } from 'egg';
import axios from 'axios'

export default class WexinAPI extends Service {
  async getAccessTotken() {
    const accessToken = await this.app.cache.get('access_token')
    if (accessToken) {
      return accessToken
    }
    const {
      appid,
      secret
    } = this.ctx.app.config.weixin
    const res = await this.ctx.curl(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`, {
      method: 'POST',
      dataType: 'json'
    })
    const {
      access_token,
      expires_in
    } = res.data
    this.app.cache.set('access_token', access_token, expires_in)
    return access_token
  }
  async getProductDetail(productId) {
    const accessToken = await this.getAccessTotken()
    const url = `https://api.weixin.qq.com/product/spu/get?access_token=${accessToken}`
    const res = await this.ctx.curl(url, {
      method: 'POST',
      data: {
        "product_id": productId,
        // "need_edit_spu": 1
      }
    })
    return res.data
  }
  async getProductByOutId(outProductId) {
    const accessToken = await this.getAccessTotken()
    const res = await axios({
      url: `https://api.weixin.qq.com/product/spu/get?access_token=${accessToken}`,
      method: 'POST',
      data: {
        out_product_id: outProductId,
        need_edit_spu: 1
      }
    })
    if (res.data.errcode) {
      return null
    }
    return res.data.data
  }
  async addProduct(product) {
    try {
      const accessToken = await this.getAccessTotken()
      const res = await axios({
        url: `https://api.weixin.qq.com/product/spu/add?access_token=${accessToken}`,
        method: 'POST',
        data: product
      })
      return res.data
    } catch(error) {
      this.ctx.logger.error(error)
      return null
    }
  }
  async updateProduct(product) {
    try {
      const accessToken = await this.getAccessTotken()
      const res = await axios({
        url: `https://api.weixin.qq.com/product/spu/update?access_token=${accessToken}`,
        method: 'POST',
        data: product
      })
      return res.data
    } catch(error) {
      return null
    }
  }
  async uploadImage(imageUrl) {
    const accessToken = await this.getAccessTotken()
    const res = await axios({
      url: 'https://api.weixin.qq.com/product/img/upload?access_token='+accessToken,
      method: 'POST',
      params: {
        upload_type: 1,
        resp_type: 1,
        width: 1024,
        height: 1434,
      },
      data: {
        img_url: imageUrl
      }
    })
    return res.data.pic_file.temp_img_url
  }
  async getCatogory() {
    try {
      const accessToken = await this.getAccessTotken()
      const res = await axios({
        url: `https://api.weixin.qq.com/product/category/get?access_token=${accessToken}`,
        method: 'POST',
        data: {
          f_cat_id: 0
        }
      })
      return res.data.cat_list
    } catch(error) {
      return null
    }
  }
  async batchAddSku(skus) {
    const result: any = await Promise.all(skus.map(async sku => this.addSku(sku)))
    return result.map(res => res.data)
  }
  async batchUpdateSku(skus) {
    return Promise.all(skus.map(async sku => {
      const existSku = await this.getSku(sku.out_sku_id)
      if (existSku) {
        existSku.out_product_id = sku.out_product_id
        existSku.out_sku_id = sku.out_sku_id
        await this.updateSku(sku)
      } else {
        await this.addSku(sku)
      }
    }))
  }
  async addSku(sku) {
    const accessToken = await this.getAccessTotken()
    const res = await axios({
      url: `https://api.weixin.qq.com/product/sku/add?access_token=${accessToken}`,
      method: 'POST',
      data: sku
    })
    return res.data
  }
  async updateSku(sku) {
    const accessToken = await this.getAccessTotken()
    const res = await axios({
      url: `https://api.weixin.qq.com/product/sku/update?access_token=${accessToken}`,
      method: 'POST',
      data: sku
    })
    return res.data
  }
  async batchGetSku(productId) {
    const accessToken = await this.getAccessTotken()
    const res = await axios({
      url: `https://api.weixin.qq.com/product/sku/get_list?access_token=${accessToken}`,
      method: 'POST',
      data: {
        "product_id": productId,
        "need_edit_sku": 0,     //	默认0:获取线上数据, 1:获取草稿数据
        "need_real_stock": 0    // 默认0:获取草稿库存, 1:获取线上真实库存
      }
    })
    return res.data
  }
  async getSku(outSkuId) {
    const accessToken = await this.getAccessTotken()
    try {
      const res = await axios({
        url: `https://api.weixin.qq.com/product/sku/get?access_token=${accessToken}`,
        method: 'POST',
        data: {
          "out_sku_id": outSkuId,
          "need_edit_sku": 0,     // 默认0:获取线上数据, 1:获取草稿数据
          "need_real_stock": 0    // 默认0:获取草稿库存, 1:获取线上真实库存
        }
      })
      return res.data.data
    } catch(error) {
      return null
    }
  }
  async deleteSku() {
    const accessToken = await this.getAccessTotken()
    try {
      const res = await axios({
        url: `https://api.weixin.qq.com/product/sku/del?access_token=${accessToken}`,
        method: 'POST',
        data: {
          "product_id": 40327978,
          "sku_id": 85510550,
        }
      })
      return res.data
    } catch(error) {
      return null
    }
  }
}
