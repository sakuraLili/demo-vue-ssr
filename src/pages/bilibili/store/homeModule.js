import { get } from '@/utils/request'
import API from '@/utils/api'

export default {
  state: {
    bannerData: [],
    list: []
  },
  actions: {
    getBanner ({ commit }) {
      return get(API.getHomeBanner).then(result => {
        commit('initBanner', result.data)
      })
    },
    getList ({ commit }) {
      return get(API.getlist).then(result => {
        commit('initList', { list: result.data.list })
      })
    }
  },
  mutations: {
    initBanner (state, bannerList) {
      state.bannerData = bannerList
    },
    initList (state, list) {
      state.list = list
    }
  }
}
