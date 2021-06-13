module.exports = {
  schedule: {
    interval: '1d', // 1 分钟间隔
    type: 'worker', // 指定所有的 worker 都需要执行
    immediate: true
  },
  async task(ctx) {
    const brandMap = await ctx.service.o17Shop.getBrandUrls()
    for (const brandName in brandMap) {
      const brandUrlMap = brandMap[brandName]
      for (const categoryName in brandUrlMap) {
        const brandUrl = brandUrlMap[categoryName]
        // 从首页进入，获取所有商品Url
        let brandProductUrls = await ctx.service.o17Shop.getProductUrls(brandUrl)
        let productUrls:any = []
        // 合并男装、女装商品
        brandProductUrls.forEach(async productUrlList => {
          productUrls = productUrls.concat(productUrlList)
        })
        // 获取商品数据
        // TODO:过滤掉已经下架的商品
        let productList = await ctx.service.o17Shop.getProductListData(productUrls.slice(0, 6))
        for (let i = 0; i < productList.length; i++) {
          if (i > 0 && i % 10 === 0) {
            // 暂停2秒
            await new Promise(r => setTimeout(r, 2000));
          }
          let product = productList[i]
          product.parent_category = categoryName
          product.brand_name = brandName
          product = await ctx.service.o17Shop.toWexinProduct(product)
          const weinSPU = await ctx.service.wexinAPI.getProductByOutId(product.out_product_id)
          if (!weinSPU) {
            // 新增
            let result = await ctx.service.wexinAPI.addProduct(product)
            result.out_product_url = product.out_product_url
            if (result.data) {
              ctx.logger.info('Add product success:', result)
            } else {
              ctx.logger.error('Add product error:', JSON.stringify(product))
            }
          } else {
            // 已存在只更新sku
            await ctx.service.wexinAPI.batchUpdateSku(product.skus)
          }
        }
      }
    }
    ctx.service.o17Shop.closeBrowser()
  },
};
