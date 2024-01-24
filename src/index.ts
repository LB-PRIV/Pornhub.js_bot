import { Route, getMainPage, login, logout, rate } from './apis'
import { getAutoComplete } from './apis/autoComplete'
import { sendAddCall, sendTimeWatchedEvent, sendViewedEvent } from './apis/etahub'
import { favorize } from './apis/favorize'
import { getToken, getVideoPageToken } from './apis/getToken'
import { viewVideo } from './apis/view'
import { Engine } from './core/engine'
import { WebMaster } from './core/webmaster'
import { pornstarList } from './scrapers/list/pornstars'
import { videoList } from './scrapers/list/videos'
import { albumPage } from './scrapers/pages/album'
import { modelPage, modelUploadedVideos } from './scrapers/pages/model'
import { photoPage } from './scrapers/pages/photo'
import { pornstarPage } from './scrapers/pages/pornstar'
import { randomPage } from './scrapers/pages/random'
import { recommended } from './scrapers/pages/recommended'
import { videoPage } from './scrapers/pages/video'
import { albumSearch } from './scrapers/search/album'
import { gifSearch } from './scrapers/search/gif'
import { modelSearch } from './scrapers/search/model'
import { pornstarSearch } from './scrapers/search/pornstar'
import { videoSearch } from './scrapers/search/video'
import type { AlbumSearchOptions, AutoCompleteOptions, GifSearchOptions, PornstarSearchOptions, RecommendedOptions, VideoSearchOptions } from './types'
import type { ModelVideoListOptions, PornstarListOptions, VideoListOptions } from './types/ListOptions'
import type { VideoPageTokenInfo } from './types/SideoPageTokenInfo'
import type { CycleTLSClient } from 'cycletls'
import type { RequestInit } from 'node-fetch'

export * from './types'
export * from './utils/error'
export type { AlbumPage } from './scrapers/pages/album'
export type { PhotoPage } from './scrapers/pages/photo'
export type { VideoPage } from './scrapers/pages/video'
export type { PornstarPage } from './scrapers/pages/pornstar'
export type { ModelPage } from './scrapers/pages/model'

export type { AlbumSearchResult } from './scrapers/search/album'
export type { PornstarSearchResult } from './scrapers/search/pornstar'
export type { GifSearchResult } from './scrapers/search/gif'
export type { VideoSearchResult, VideoListResult } from './scrapers/search/video'

export type { PornstarListResult } from './scrapers/list/pornstars'

export type { WebmasterCategory } from './apis/webmaster/categories'
export type { WebmasterDeleted } from './apis/webmaster/deleted'
export type { WebmasterEmbed } from './apis/webmaster/embed'
export type { WebmasterSearch } from './apis/webmaster/search'
export type { WebmasterStarsDetailed } from './apis/webmaster/stars_detailed'
export type { WebmasterStars, WebmasterStar } from './apis/webmaster/stars'
export type { WebmasterTags } from './apis/webmaster/tags'
export type { WebmasterVideoById } from './apis/webmaster/video_by_id'
export type { WebmasterVideoIsActive } from './apis/webmaster/video_is_active'

export interface PornHubConfig {
    /**
     * Dump response to file for debugging.
     *
     * Pass a path string to specify the folder, otherwise it will write to `./_dump`.
     *
     * Default to `false`.
     */
    dumpPage?: boolean | string
}

export class PornHub {
    route = Route
    engine = new Engine()
    webMaster = new WebMaster(this.engine)

    constructor(config: PornHubConfig = {}) {
        if (config.dumpPage) {
            const dumpPagePath = typeof config.dumpPage === 'string' ? config.dumpPage : ''
            this.engine.dumper.enable(dumpPagePath)
        }
    }

    setAgent(agent: RequestInit['agent']) {
        this.engine.request.setAgent(agent)
    }

    setProxy(proxy: string) {
        this.engine.request.setProxy(proxy)
    }

    setUserAgent(userAgent: string) {
        this.engine.request.setUserAgent(userAgent)
    }

    setPlatform(platform: "mobile" | "pc") {
        this.engine.request.setPlatform(platform)
    }

    setHeader(key: string, value: string) {
        this.engine.request.setHeader(key, value)
    }

    getCookieString() {
        return this.engine.request.getCookieString()
    }

    getCookies() {
        return this.engine.request.getCookies()
    }

    setCycleTLSClient(client: CycleTLSClient) {
        this.engine.request.setCycleTLSClient(client)
    }

    getCookie(key: string) {
        return this.engine.request.getCookie(key)
    }

    setCookie(key: string, value: string) {
        this.engine.request.setCookie(key, value)
    }

    deleteCookie(key: string) {
        this.engine.request.deleteCookie(key)
    }

    /**
     * See: https://github.com/pionxzh/Pornhub.js/issues/27
     * @deprecated This method is no longer needed.
     */
    async warmup() {
        console.warn('`warmup` has been deprecated. You can safely remove this method call. It has been handled internally.')
        // no-op
    }

    /**
     * Login with account and password.
     */
    login(account: string, password: string) {
        return login(this.engine, account, password)
    }

    /**
     * Logout from Pornhub.com.
     */
    logout() {
        return logout(this.engine)
    }

    /**
     * Logout from Pornhub.com.
     */
    async likeVideo(urlOrId: string, path?: string) {
        if (!this.engine.warmedUp && !path) {
            // make a call to the main page to get the cookies.
            // PornHub will redirect you to a corn video if you don't have a proper cookie set.
            // See issue: [#27 Video been redirected to a corn video](https://github.com/pionxzh/Pornhub.js/issues/27)\
            await getMainPage(this.engine)
            this.engine.warmedUp = true
        }
        return rate(this.engine, urlOrId, 'like', path)
    }

    async dislikeVideo(urlOrId: string, path?: string) {
        if (!this.engine.warmedUp && !path) {
            // make a call to the main page to get the cookies.
            // PornHub will redirect you to a corn video if you don't have a proper cookie set.
            // See issue: [#27 Video been redirected to a corn video](https://github.com/pionxzh/Pornhub.js/issues/27)\
            await getMainPage(this.engine)
            this.engine.warmedUp = true
        }
        return rate(this.engine, urlOrId, 'dislike', path)
    }

    async favorizeVideo(urlOrId: string, options?: { voteUrl: string, itemId: number }) {
        if (!this.engine.warmedUp && !options) {
            // make a call to the main page to get the cookies.
            // PornHub will redirect you to a corn video if you don't have a proper cookie set.
            // See issue: [#27 Video been redirected to a corn video](https://github.com/pionxzh/Pornhub.js/issues/27)\
            await getMainPage(this.engine)
            this.engine.warmedUp = true
        }
        return favorize(this.engine, urlOrId, options)
    }

    /**
     * Get token from Pornhub.com.
     * Most of pornhub's api need this token.
     * You can cache this token to avoid frequent requests (I'm not sure about the expiration time!).
     *
     * For now, this token is only used for `autoComplete` and `searchModel`.
     * This library will automatically get the token if you don't provide one.
     */
    getToken() {
        return getToken(this.engine)
    }

    /**
     * Get video information by url/ID
     * @param urlOrId Video ID or page url
     */
    async video(urlOrId: string) {
        if (!this.engine.warmedUp) {
            // make a call to the main page to get the cookies.
            // PornHub will redirect you to a corn video if you don't have a proper cookie set.
            // See issue: [#27 Video been redirected to a corn video](https://github.com/pionxzh/Pornhub.js/issues/27)\
            await getMainPage(this.engine)
            this.engine.warmedUp = true
        }
        return videoPage(this.engine, urlOrId)
    }

    async videoDOM(urlOrId: string) {
        if (!this.engine.warmedUp) {
            // make a call to the main page to get the cookies.
            // PornHub will redirect you to a corn video if you don't have a proper cookie set.
            // See issue: [#27 Video been redirected to a corn video](https://github.com/pionxzh/Pornhub.js/issues/27)\
            await getMainPage(this.engine)
            this.engine.warmedUp = true
        }
        return videoPage(this.engine, urlOrId, true)
    }

    async getVideoPageTokenInfos(urlOrId: string) {
        if (!this.engine.warmedUp) {
            // make a call to the main page to get the cookies.
            // PornHub will redirect you to a corn video if you don't have a proper cookie set.
            // See issue: [#27 Video been redirected to a corn video](https://github.com/pionxzh/Pornhub.js/issues/27)\
            await getMainPage(this.engine)
            this.engine.warmedUp = true
        }
        return getVideoPageToken(this.engine, urlOrId)
    }

    /**
     * Sends a viewed event to the EtaHub server.
     * This method is used to notify the EtaHub server that a video has been viewed.
     *
     * @async
     * @param {VideoPageTokenInfo} options - The options for the viewed event.
     * @returns {Promise<any>} - A promise that resolves when the viewed event has been sent.
     */
    async sendEtaHubViewedEvent(options: VideoPageTokenInfo): Promise<any> {
        return sendViewedEvent(this.engine, options)
    }

    /**
     * Sends a time watched event to the EtaHub server.
     * This method is used to notify the EtaHub server about the duration of the video watched.
     *
     * @async
     * @param {number} featureValue - The duration of the video watched.
     * @param {VideoPageTokenInfo} options - The options for the time watched event.
     * @returns {Promise<any>} - A promise that resolves when the time watched event has been sent.
     */
    async sendEtaHubTimeWatchedEvent(featureValue: number, options: VideoPageTokenInfo): Promise<any> {
        return sendTimeWatchedEvent(this.engine, featureValue, options)
    }

    /**
     * Sends an add call event to the EtaHub server.
     * This method is used to notify the EtaHub server to add a call.
     *
     * @async
     * @param {string} vcServerUrl - The URL of the VC server.
     * @returns {Promise} - A promise that resolves when the add call event has been sent.
     */
    async sendEtaHubAddCall(vcServerUrl: string): Promise<any> {
        return sendAddCall(this.engine, vcServerUrl)
    }

    /**
     * Views a video on the website.
     * This method is used to simulate viewing a video on the website for a specified duration.
     *
     * @async
     * @param {string} urlOrId - The URL or ID of the video.
     * @param {number} viewTime - The duration for which the video is viewed.
     * @param {VideoPageTokenInfo} fetchedInfos - Optional. The fetched information about the video.
     * @returns {Promise<any>} - A promise that resolves when the video has been viewed.
     */
    async viewVideo(urlOrId: string, viewTime: number, fetchedInfos?: VideoPageTokenInfo): Promise<boolean> {
        if (!this.engine.warmedUp) {
            await getMainPage(this.engine)
            this.engine.warmedUp = true
        }
        return viewVideo(this.engine, urlOrId, viewTime, fetchedInfos)
    }

    /**
     * Get album information by url/ID
     * @param urlOrId Album ID or page url
     */
    album(urlOrId: string) {
        return albumPage(this.engine, urlOrId)
    }

    /**
     * Get photo information by url/ID
     * @param urlOrId Photo ID or page url
     */
    photo(urlOrId: string) {
        return photoPage(this.engine, urlOrId)
    }

    /**
     * Get pornstar information by url/ID
     * @param urlOrName Pornstar name or page url
     */
    pornstar(urlOrName: string) {
        return pornstarPage(this.engine, urlOrName)
    }

    /**
     * Get model information by url/ID
     * @param urlOrName Model name or page url
     */
    model(urlOrName: string) {
        return modelPage(this.engine, urlOrName)
    }

    /**
     * Get list of model's uploaded videos
     * @param urlOrName Model name or page url
     * @param options Options including page number
     */
    modelVideos(urlOrName: string, options: ModelVideoListOptions = {}) {
        return modelUploadedVideos(this.engine, urlOrName, options)
    }

    /**
     * Get a random video.
     * @returns The same object as `video()`
     */
    randomVideo() {
        return randomPage(this.engine)
    }

    /**
     * Get autocomplete result by keyword.
     */
    autoComplete(keyword: string, options: AutoCompleteOptions = {}) {
        return getAutoComplete(this.engine, keyword, options)
    }

    /**
     * Search album by keyword.
     */
    searchAlbum(keyword: string, options: AlbumSearchOptions = {}) {
        return albumSearch(this.engine, keyword, options)
    }

    /**
     * Search gif by keyword.
     */
    searchGif(keyword: string, options: GifSearchOptions = {}) {
        return gifSearch(this.engine, keyword, options)
    }

    /**
     * Search pornstar by keyword.
     */
    searchPornstar(keyword: string, options: PornstarSearchOptions = {}) {
        return pornstarSearch(this.engine, keyword, options)
    }

    /**
     * Search model by keyword.
     */
    searchModel(keyword: string, options: AutoCompleteOptions = {}) {
        return modelSearch(this.engine, keyword, options)
    }

    /**
     * Search video by keyword.
     */
    searchVideo(keyword: string, options: VideoSearchOptions = {}) {
        return videoSearch(this.engine, keyword, options)
    }

    /**
     * Get video list.
     */
    videoList(options: VideoListOptions = {}) {
        return videoList(this.engine, options)
    }

    /**
     * Get pornstar list.
     */
    pornstarList(options: PornstarListOptions = {}) {
        return pornstarList(this.engine, options)
    }

    /**
     * Get recommended videos.
     */
    recommendedVideos(options: RecommendedOptions = {}) {
        return recommended(this.engine, options)
    }
}
