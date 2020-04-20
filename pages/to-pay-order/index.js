const app = getApp()
const WXAPI = require('apifm-wxapi')
const AUTH = require('../../utils/auth')
const wxpay = require('../../utils/pay.js')

Page({
  data: {
    wxlogin: true,

    totalScoreToPay: 0,
    goodsList: [],
    isNeedLogistics: 0, // 是否需要物流信息
    allGoodsPrice: 0,
    yunPrice: 0,
    allGoodsAndYunPrice: 0,
    goodsJsonStr: "",
    orderType: "", //订单类型，购物车下单或立即支付下单，默认是购物车，
    pingtuanOpenId: undefined, //拼团的话记录团号

    hasNoCoupons: true,
    coupons: [],
    youhuijine: 0, //优惠券金额
    curCoupon: null, // 当前选择使用的优惠券
    curCouponShowText: '请选择使用优惠券', // 当前选择使用的优惠券
    allowSelfCollection: '0', // 是否允许到店自提
    peisongType: 'kd', // 配送方式 kd,zq 分别表示快递/到店自取
    remark: '',
    contact: '',
  },
  onShow() {
    AUTH.checkHasLogined().then(isLogined => {
      this.setData({
        wxlogin: isLogined
      })
      if (isLogined) {
        this.doneShow()
      }
    })
  },
  async doneShow() {
    this.data.peisongType = 'zq'
    let allowSelfCollection = wx.getStorageSync('ALLOW_SELF_COLLECTION')
    if (!allowSelfCollection || allowSelfCollection != '1') {
      allowSelfCollection = '0'
      this.data.peisongType = 'kd'
    }

    let shopList = [];
    const token = wx.getStorageSync('token')
    //立即购买下单
    if ("buyNow" == this.data.orderType) {
      var buyNowInfoMem = wx.getStorageSync('buyNowInfo');
      this.data.kjId = buyNowInfoMem.kjId;
      if (buyNowInfoMem && buyNowInfoMem.shopList) {
        shopList = buyNowInfoMem.shopList
      }
    } else {
      //购物车下单
      const res = await WXAPI.shippingCarInfo(token)
      if (res.code == 0) {
        shopList = res.data.items
      }
    }
    this.setData({
      goodsList: shopList,
      allowSelfCollection: allowSelfCollection,
      peisongType: this.data.peisongType
    });
    this.initShippingAddress()
  },

  onLoad(e) {
    let _data = {
      isNeedLogistics: 1
    }
    if (e.orderType) {
      _data.orderType = e.orderType
    }
    if (e.pingtuanOpenId) {
      _data.pingtuanOpenId = e.pingtuanOpenId
    }
    this.setData(_data);
  },

  getDistrictId: function (obj, aaa) {
    if (!obj) {
      return "";
    }
    if (!aaa) {
      return "";
    }
    return aaa;
  },
  remarkChange(e) {
    this.data.remark = e.detail.value
  },
  contactChange(e) {
    this.data.contact = e.detail.value
  },
  goCreateOrder() {
    // 查看自提点信息
    var that = this;
    const { curZTAddressData } = that.data;
    if (that.data.peisongType == 'zq') {
      if (!curZTAddressData) {
        wx.hideLoading();
        wx.showToast({
          title: '请设置自提点',
          icon: 'none'
        });
        return;
      }

      if (that.data.contact.length != 11) {
        wx.hideLoading();
        wx.showToast({
          title: '请填写您的联系方式',
          icon: 'none'
        });
        return;
      }
    }

    // 请求通知，发送订单
    wx.requestSubscribeMessage({
      // tmplIds: ['ITVuuD_cwYN-5BjXne8cSktDo43xetj0u-lpvFZEQQs',
      //   'dw9Tzh9r0sw7Gjab0ovQJx3bP3gdXmF_FZvpnxPd6hc'],
      tmplIds: ['Vp-JRDbUoEWjPkYk03C6xwlxkDGEpMOcnm0DpW6t6Kg'],
      success(res) {

      },
      fail(e) {
        console.error(e)
        wx.showModal({
          title: '错误',
          content: `${JSON.stringify(e)}`,
          showCancel: false
        })
      },
      complete: (e) => {
        this.createOrder(true)
      },
    })
  },
  createOrder: function (e) {
    var that = this;
    var loginToken = wx.getStorageSync('token') // 用户登录 token
    var remark = this.data.remark; // 备注信息

    // abson: 自提点业务适合为 zq
    let { peisongType } = that.data;
    // peisongType = peisongType == "zt" ? "zq" : peisongType;

    let postData = {
      token: loginToken,
      goodsJsonStr: that.data.goodsJsonStr,
      remark: remark,
      peisongType: peisongType,
      isCanHx: true
    };
    if (that.data.kjId) {
      postData.kjid = that.data.kjId
    }
    if (that.data.pingtuanOpenId) {
      postData.pingtuanOpenId = that.data.pingtuanOpenId
    }
    if (that.data.isNeedLogistics > 0 && postData.peisongType == 'kd') {
      if (!that.data.curAddressData) {
        wx.hideLoading();
        wx.showToast({
          title: '请设置收货地址',
          icon: 'none'
        });
        return;
      }
      if (postData.peisongType == 'kd') {
        postData.provinceId = that.data.curAddressData.provinceId;
        postData.cityId = that.data.curAddressData.cityId;
        if (that.data.curAddressData.districtId) {
          postData.districtId = that.data.curAddressData.districtId;
        }
        postData.address = that.data.curAddressData.address;
        postData.linkMan = that.data.curAddressData.linkMan;
        postData.mobile = that.data.curAddressData.mobile;
        postData.code = that.data.curAddressData.code;
      }
    }

    // 自提点数据设置，为订单扩展字段
    const { curZTAddressData } = that.data;
    if (postData.peisongType == 'zq') {
      postData.addAddress = curZTAddressData.address;
      postData.mobile = curZTAddressData.mobile;
      postData.linkMan = curZTAddressData.linkMan;
      postData.extJsonStr = JSON.stringify({
        "zt_addr": `自提点 地址：${curZTAddressData.address}`,
        "zt_mob": `自提点 团长手机：${curZTAddressData.mobile}`,
        "zt_linkman": `自提点 团长：${curZTAddressData.linkMan}`,
        "zt_customer": `顾客手机：${that.data.contact}`
      })
    }

    if (that.data.curCoupon) {
      postData.couponId = that.data.curCoupon.id;
    }
    if (!e) {
      postData.calculate = "true";
    }

    WXAPI.orderCreate(postData).then(function (res) {
      if (res.code != 0) {
        wx.showModal({
          title: '错误',
          content: res.msg,
          showCancel: false
        })
        return;
      }

      if (e && "buyNow" != that.data.orderType) {
        // 清空购物车数据
        WXAPI.shippingCarInfoRemoveAll(loginToken)
      }
      if (!e) {
        that.setData({
          totalScoreToPay: res.data.score,
          isNeedLogistics: res.data.isNeedLogistics,
          allGoodsPrice: res.data.amountTotle,
          allGoodsAndYunPrice: res.data.amountLogistics + res.data.amountTotle,
          yunPrice: res.data.amountLogistics
        });
        that.getMyCoupons();
        return;
      }
      that.processAfterCreateOrder(res)
    })
  },
  async processAfterCreateOrder(res) {
    // 直接弹出支付，取消支付的话，去订单列表
    const res1 = await WXAPI.userAmount(wx.getStorageSync('token'))
    if (res1.code != 0) {
      wx.showToast({
        title: '无法获取用户资金信息',
        icon: 'none'
      })
      wx.redirectTo({
        url: "/pages/order-list/index"
      });
      return
    }
    const money = res.data.amountReal * 1 - res1.data.balance * 1
    if (money <= 0) {
      wx.redirectTo({
        url: "/pages/order-list/index"
      })
    } else {
      wxpay.wxpay('order', money, res.data.id, "/pages/order-list/index");
    }
  },
  async initShippingAddress() {
    const res = await WXAPI.defaultAddress(wx.getStorageSync('token'))
    if (res.code == 0) {
      this.setData({
        curAddressData: res.data.info
      });
    } else {
      this.setData({
        curAddressData: null
      });
    }

    // const szres = await WXAPI.jsonList({ token: wx.getStorageSync('token'), type: "zt-address" })
    // const zt_id = szres.data[0].jsonData.zt_id
    const zt_id = JSON.parse(wx.getStorageSync("zt_addr")).zt_id;
    console.log(`zt_id: ${zt_id}`)
    if (zt_id !== 0) {
      const zt_res = await WXAPI.request('/mock/address/zt_address', true, 'get', {});

      const r = JSON.parse(zt_res)
      if (r.code == 0) {
        let info = {}
        r.data.map((v) => {
          if (v.id == zt_id) {
            info = v;
          }
        });
        this.setData({
          curZTAddressData: info
        });
      }
    }

    this.processYunfei();
  },
  processYunfei() {
    var goodsList = this.data.goodsList
    if (goodsList.length == 0) {
      return;
    }
    var goodsJsonStr = "[";
    var isNeedLogistics = 0;
    var allGoodsPrice = 0;


    let inviter_id = 0;
    let inviter_id_storge = wx.getStorageSync('referrer');
    if (inviter_id_storge) {
      inviter_id = inviter_id_storge;
    }
    for (let i = 0; i < goodsList.length; i++) {
      let carShopBean = goodsList[i];
      if (carShopBean.logistics || carShopBean.logisticsId) {
        isNeedLogistics = 1;
      }
      allGoodsPrice += carShopBean.price * carShopBean.number;

      var goodsJsonStrTmp = '';
      if (i > 0) {
        goodsJsonStrTmp = ",";
      }
      if (carShopBean.sku && carShopBean.sku.length > 0) {
        let propertyChildIds = ''
        carShopBean.sku.forEach(option => {
          propertyChildIds = propertyChildIds + ',' + option.optionId + ':' + option.optionValueId
        })
        carShopBean.propertyChildIds = propertyChildIds
      }
      goodsJsonStrTmp += '{"goodsId":' + carShopBean.goodsId + ',"number":' + carShopBean.number + ',"propertyChildIds":"' + carShopBean.propertyChildIds + '","logisticsType":0, "inviter_id":' + inviter_id + '}';
      goodsJsonStr += goodsJsonStrTmp;


    }
    goodsJsonStr += "]";
    this.setData({
      isNeedLogistics: isNeedLogistics,
      goodsJsonStr: goodsJsonStr,
    });
    this.createOrder();
  },
  addAddress: function () {
    wx.navigateTo({
      url: "/pages/address-add/index"
    })
  },
  selectAddress: function () {
    wx.navigateTo({
      url: "/pages/select-address/index"
    })
  },
  selectZTAddress: function () {
    wx.navigateTo({
      url: "/pages/select-ztaddress/index"
    })
  },
  async getMyCoupons() {
    const res = await WXAPI.myCoupons({
      token: wx.getStorageSync('token'),
      status: 0
    })
    if (res.code == 0) {
      var coupons = res.data.filter(entity => {
        return entity.moneyHreshold <= this.data.allGoodsAndYunPrice;
      })
      if (coupons.length > 0) {
        coupons.forEach(ele => {
          ele.nameExt = ele.name + ' [满' + ele.moneyHreshold + '元可减' + ele.money + '元]'
        })
        this.setData({
          hasNoCoupons: false,
          coupons: coupons
        });
      }
    }
  },
  bindChangeCoupon: function (e) {
    const selIndex = e.detail.value;
    this.setData({
      youhuijine: this.data.coupons[selIndex].money,
      curCoupon: this.data.coupons[selIndex],
      curCouponShowText: this.data.coupons[selIndex].nameExt
    });
  },
  radioChange(e) {
    this.setData({
      peisongType: e.detail.value
    })
    this.processYunfei()
  },
  cancelLogin() {
    wx.navigateBack()
  },
  processLogin(e) {
    if (!e.detail.userInfo) {
      wx.showToast({
        title: '已取消',
        icon: 'none',
      })
      return;
    }
    AUTH.register(this);
  },
})