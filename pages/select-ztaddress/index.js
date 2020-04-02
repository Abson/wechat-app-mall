const WXAPI = require('apifm-wxapi')
const AUTH = require('../../utils/auth')

const app = getApp()
Page({
  data: {
    addressList: []
  },

  selectTap: async function (e) {
    var { id } = e.currentTarget.dataset;
    // WXAPI.updateAddress({
    //   token: wx.getStorageSync('token'),
    //   id: id,
    //   isDefault: 'true'
    // }).then(function (res) {
    //   wx.navigateBack({})
    // })
    const json = {
      zt_id: id,
      isDefault: 'true',
    }
    try {
      const res = await WXAPI.jsonSet({
        token: wx.getStorageSync('token'),
        type: "zt-address",
        content: JSON.stringify(json)
      })
      wx.navigateBack({})
    } catch (err) {
      wx.showToast({ title: "设置自提点失败", icon: 'none' })
    }
  },

  addAddess: function () {
    wx.navigateTo({
      url: "/pages/address-add/index"
    })
  },

  editAddess: function (e) {
    wx.navigateTo({
      url: "/pages/address-add/index?id=" + e.currentTarget.dataset.id
    })
  },

  onLoad: function () {
  },
  onShow: function () {
    this.initShippingAddress()
  },

  initShippingAddress: async function () {
    var that = this;
    try {
      const res = await WXAPI.request('/mock/address/zt_address', true, 'get', {});
      const r = JSON.parse(res)
      if (r.code !== 0) {
        wx.showToast({ title: r.msg, icon: 'none' })
        return
      }
      that.setData({
        addressList: r.data
      });
    } catch (err) {

      wx.showToast({ title: "获取自提点列表失败", icon: 'none' })
    }
  }

})