/* eslint-disable no-new */
import { Service } from 'egg';
import * as puppeteer from 'puppeteer'
import * as cheerio from 'cheerio'
// declare const navigator
// declare const window
declare const document

type Attrs = Array<{
  attr_key: string
  attr_value: string
}>

export default class O17Shop extends Service {
  browser
  public async getPage() {
    this.browser = this.browser || await puppeteer.launch({ignoreDefaultArgs: ["--enable-automation"], headless: true}); //去除自动化测试的提醒
    const page:any = this.browser.newPage();
    // await page.evaluateOnNewDocument(() => { //在每个新页面打开前执行以下脚本
    //   const newProto = navigator.__proto__;
    //   delete newProto.webdriver;  //删除navigator.webdriver字段
    //   navigator.__proto__ = newProto;
    //   window.chrome = {};  //添加window.chrome字段，为增加真实性还需向内部填充一些值
    //   window.chrome.app = {"InstallState":"hehe", "RunningState":"haha", "getDetails":"xixi", "getIsInstalled":"ohno"};
    //   window.chrome.csi = function(){};
    //   window.chrome.loadTimes = function(){};
    //   window.chrome.runtime = function(){};
    //   Object.defineProperty(navigator, 'userAgent', {  //userAgent在无头模式下有headless字样，所以需覆写
    //       get: () => "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.113 Safari/537.36",
    //   });
    //   Object.defineProperty(navigator, 'plugins', {  //伪装真实的插件信息
    //       get: () => [{"description": "Portable Document Format",
    //                   "filename": "internal-pdf-viewer",
    //                   "length": 1,
    //                   "name": "Chrome PDF Plugin"}]
    //   });
    //   Object.defineProperty(navigator, 'languages', { //添加语言
    //       get: () => ["zh-CN", "zh", "en"],
    //   });
    //   const originalQuery = window.navigator.permissions.query; //notification伪装
    //   window.navigator.permissions.query = (parameters) => (
    //   parameters.name === 'notifications' ?
    //     Promise.resolve({ state: Notification.permission }) :
    //     originalQuery(parameters)
    //   );
    // })
    return page
  }
  public closeBrowser() {
    this.browser.close()
  }
  public async getProductNum(brandUrl) {
    const page = await this.getPage()
    await page.goto(`${brandUrl}.json`)
    const result = await page.evaluate(() =>  {
      return JSON.parse(document.querySelector("body").innerText);
    });
    page.close()
    return result.collection?.products_count
  }
  public async getProductUrls(brandUrl) {
    // const productNum = await this.getProductNum(brandUrl)
    // const pageSize = Math.ceil(productNum / 36)
    let totalProductUrls = []
    for (let i = 1; i <= 1; i++) {
      const pageUrl = `${brandUrl}?page=${i}`
      const page = await this.getPage()
      await page.goto(pageUrl, {
        waitUntil: 'domcontentloaded'
      });
      const productUrls = await page.$$eval('.grid-link__container a', links => {
        return links.map(link => link.href)
      })
      page.close()
      totalProductUrls = totalProductUrls.concat(productUrls)
    }
    return totalProductUrls
  }
  public async getProductListData(pageUrls) {
    const promises = pageUrls.map(async url => this.getProductItem(url))
    return Promise.all(promises)
  }
  public async getProductItem(pageUrl) {
    const page = await this.getPage()
    await page.goto(`${pageUrl}.json`)
    const result = await page.evaluate(() =>  {
      return JSON.parse(document.querySelector("body").innerText);
    });
    page.close()
    result.product.url = pageUrl
    return result.product
  }
  public async getBrandUrls() {
    const brandUrls = {
      we11done: {
        mens: 'https://017shop.ca/collections/mens-we11done',
        womens: 'https://017shop.ca/collections/womens-we11done'
      }
    }
    return brandUrls
  }
  public async toWexinProduct(product) {
    product = await this.conboTranslate(product)
    const titleText = await this.toWexinTitle(product)
    const descText = await this.toWexinDesc(product)
    const wexinImages:any = await this.toWexinImages(product.images)
    const wexinSkus = this.toWexinSkus(product, wexinImages)
    const wexinCategories = await this.toWexinCategory(product)
    const spu = {
      "out_product_id": product.id.toString(),
      "out_product_url": product.url,
      "title": titleText,
      "sub_title": descText,
      "head_img": wexinImages.map(i => i.src),
      "desc_info": {
        "desc": descText,
        "imgs": wexinImages.map(i => i.src),
      },
      "model": product.url, // 借用这个字段来存储原017商品
      "brand_id": 2100000000,
      "cats": wexinCategories,
      "attrs": await this.toWexinAttrs(product),
      "skus": wexinSkus,
      "express_info": {
        "template_id": 18959325,
      }
    }
    return spu
  }
  async toWexinTitle(product): Promise<string> {
    let titleText = product.title || ''
    if (product) {
      titleText = `${product.brand_name.toUpperCase()} ${titleText}`
    }
    return titleText
  }
  async toWexinDesc(product): Promise<string> {
    let descText = product.body_html || ''
    descText = descText.replace(/你知道吗\s*/g, '')
    descText = descText + "商品价格已经包含关税、商品增值税以及邮费。"
    return descText
  }
  toWexinSkus(product, images) {
    const wexinSkus = product.variants.map(sku => {
      const skuImage = images.find(image => {
        return image.position === sku.position
      })
      return {
        "out_product_id": sku.product_id.toString(),
        "out_sku_id": sku.id.toString(),
        "thumb_img": skuImage && skuImage.src,
        "sale_price": this.toWexinPrice(sku.compare_at_price || sku.price || 0),
        "market_price": this.toWexinMarketPrice(sku.compare_at_price || sku.price || 0),
        "stock_num": sku.inventory_quantity,
        "sku_attrs":[{
          attr_key: '选择尺寸',
          attr_value: sku.option1 === "One Size" ? "均码" : sku.option1,
        }]
      }
    })
    return wexinSkus
  }
  async toWexinAttrs(product): Promise<Attrs> {
    // 必须属性
    const promises = product.options.map(async option => {
      const attr:any = {}
      switch(option.name) {
        case 'Size':
          attr.attr_key = '尺码'
          if (option.values.length === 1) {
            attr.attr_value = await this.tranlate(option.values[0])
          } else {
            attr.attr_value = option.values.join(' ')
          }
          break
        case 'Color':
          attr.attr_key = '颜色'
          attr.attr_value = option.values.join(' ')
          attr.attr_value = await this.tranlate(attr.attr_value)
          break
      }
      return attr
    })
    let attrs:Attrs = await Promise.all(promises);
    attrs = attrs.concat([{
      attr_key: '品牌',
      attr_value: 'WE11DOME',
    },{
      attr_key: '产地',
      attr_value: '国外',
    }])
    const parentCateName = await this.tranlate(product.parent_category)
    if (['男装', '女装'].includes(parentCateName)) {
      attrs = attrs.concat([{
        attr_key: '适用性别',
        attr_value: parentCateName === "男装" ? '男' : '女'
      }])
    }
    return attrs
  }
  async toWexinImages(images) {
    return Promise.all(images.map(async image => {
      const imageUrl = image.src
      const wexinUrl = await this.service.wexinAPI.uploadImage(imageUrl)
      image.src = wexinUrl
      return image
    }))
  }
  async toWexinCategory(product) {
    // PS：微信小商店要求必须有3级类目，否则后台会报错
    // PS：先特殊处理WE11DONE的商品
    let categories: Array<{
      cat_id: string,
      level: number
    }> = []
    // 鞋子特殊处理
    if (product.title.match(/鞋/g)) {
      const topCategory = this.getCategoryId('鞋靴', 0)
      const secondCateName = product.parent_category === "mens" ? '流行男鞋' : '时尚女鞋'
      const secondCategory = this.getCategoryId(secondCateName, topCategory.cat_id)
      const thirdCateName = '休闲鞋'
      const thirdCategory = this.getCategoryId(thirdCateName, secondCategory.cat_id)
      categories = [{
        cat_id: topCategory.cat_id,
        level: 0,
      },
      {
        cat_id: secondCategory.cat_id,
        level: 0,
      },
      {
        cat_id: thirdCategory.cat_id,
        level: 0,
      }]
      return categories
    }
    // 剩下的默认都是服饰内衣下面的类目
    let topCategory = this.getCategoryId("服饰内衣", 0)
    categories.push({
      cat_id: topCategory.cat_id,
      level: 0
    })
    // 2级类目处理，默认只有男装、女装、服饰配件
    if (product.title.match(/(包|腰带|帽|袜)$/g)) {
      // 匹配这些关键词的都是服饰配件
      const secondCategory = this.getCategoryId("服饰配件", topCategory.cat_id)
      categories.push({
        cat_id: secondCategory.cat_id,
        level: 0
      })
      // 3级类目处理，通过翻译匹配，无法匹配则默认写入”遮阳帽“
      const productType = await this.tranlate(product.product_type)
      let thirdCategory = this.getCategoryId(productType, secondCategory.cat_id)
      if (!thirdCategory) {
        thirdCategory = this.getCategoryId("遮阳帽", secondCategory.cat_id)
      }
      categories.push({
        cat_id: thirdCategory.cat_id,
        level: 0
      })
    } else {
      // 剩下的都是男装女装
      let secondCateName = await this.tranlate(product.parent_category)
      const secondCategory = this.getCategoryId(secondCateName, topCategory.cat_id)
      categories.push({
        cat_id: secondCategory.cat_id,
        level: 0
      })
      // 3级类目处理，通过翻译匹配，无法匹配则默认写入”短裤“
      const productType = await this.tranlate(product.product_type)
      let thirdCategory = this.getCategoryId(productType, secondCategory.cat_id)
      if (!thirdCategory) {
        thirdCategory = this.getCategoryId("短裤", secondCategory.cat_id)
      }
      categories.push({
        cat_id: thirdCategory.cat_id,
        level: 0
      })
    }
    return categories
  }
  getCategoryId(categoryName, parentId = 0) {
    const categoryList = require(`${this.app.baseDir}/config/wexin_category.json`)
    const category = categoryList.find(item => item.name === categoryName && item.f_cat_id === parentId)
    return category
  }
  toWexinPrice(price) {
    let wexinPrice = this.CAD2CNY(price)
    wexinPrice = wexinPrice + this.ctx.app.config.expressPay // 加上邮费
    return wexinPrice * 100
  }
  toWexinMarketPrice(price) {
    // 统一按市场价打八折
    let wexinPrice = this.toWexinPrice(price)
    let marketPrice =  Math.round(wexinPrice / this.ctx.app.config.discount / 100) * 100
    return marketPrice
  }
  CAD2CNY(money) {
    // 乘以美元汇率
    const exchangeRate = this.app.config.exchangeRate
    return Math.round(exchangeRate * parseFloat(money))
  }
  async tranlate(text): Promise<string> {
    const defaultText = require(`${this.app.baseDir}/config/translation.json`)
    let transText = defaultText[text]
    // 记录下找不到翻译文本
    if (!transText) {
      this.ctx.logger.info(`没有默认翻译：${text} `)
      return text
    }
    return transText
  }
  async conboTranslate(product): Promise<object> {
    // 需要翻译的字段
    const descText = cheerio.load(product.body_html).text()
    const transText = `${product.title}\n${descText.replace(/\n/g, '')}`
    const transResult = await this.ctx.service.translater.translate(transText)
    if (transResult) {
      product.title = transResult[0].dst
      product.body_html = transResult[1].dst
    }
    return product
  }
}
