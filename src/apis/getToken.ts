import { videoPage } from '../scrapers/pages/video'
import { getCheerio, getDataAttribute } from '../utils/cheerio'
import { getMainPage } from './getMainPage'
import type { Engine } from '../core/engine'
import type { Element } from 'cheerio'
import {VideoPageTokenInfo} from "../types/SideoPageTokenInfo";
import fs from 'fs'

export async function getToken(engine: Engine) {
    const html = await getMainPage(engine)
    const $ = getCheerio(html)
    const inputEl = $('form#search_form input[name="search"]')
    const token = getDataAttribute<string, null>(inputEl, 'token', null)
    if (!token) throw new Error('Failed to get token')
    return token
}

export async function getVideoPageToken(engine: Engine, urlOrId: string): Promise<VideoPageTokenInfo | undefined> {
    try {
        const html = await videoPage(engine, urlOrId, true) as string
        fs.writeFileSync("debug.html", html)
        const $ = getCheerio(html)
        let token = $('[name="token"]').attr('value') || ''
        const redirect = $('[name="redirect"]').attr('value') || ''
        const videoActionScripts = $('div.allActionsContainer > script')

        let videoActionScript: any | undefined

        videoActionScripts.each((i: number, el: Element) => {
            const script = $(el).text()
            if (script.includes('WIDGET_RATINGS_LIKE_FAV ')) {
                let text = script.split('WIDGET_RATINGS_LIKE_FAV = ')[1]
                text = text.trim().substring(0, text.length - 2)
                videoActionScript = JSON.parse(text.replace(/\\+/g, ''))
            }
            if (script.includes('WIDGET_RATINGS_LIKE_FAV.token ') && !token) {
                let text = script.split('WIDGET_RATINGS_LIKE_FAV.token = ')[1]
                text = text.trim().substring(0, text.length - 2)
                token = text.replace(/\"+/g, '')
            }
        })

        if (!videoActionScript) {
            throw new Error('Could not load required WIDGET_RATINGS_LIKE_FAV Object from DOM')
        }
        if (!token) {
            throw new Error('Could not load required element "TOKEN" from DOM')
        }

        const title = $('#hd-leftColVideoPage > div > div.title-container.translate > h1 > span')?.text()
        const videoScript = $('#player > script:nth-child(1)')?.text()

        if (!videoScript) return undefined

        // get video id/vid munged_session_id/msid watch_session/ws video_duration/vd video_timestamp/vt
        const videoId: string = videoScript.match(/"video_id":(\d+),/)?.at(1) ?? ''
        const mungedSessionId = videoScript.match(/"munged_session_id":"(\w+)",/)?.at(1) ?? ''
        const watchSessionId = videoScript.match(/"watch_session":"(\w+)",/)?.at(1) ?? ''
        const videoDuration = videoScript.match(/"video_duration":(\d+),/)?.at(1) ?? ''
        const videoTimestamp = videoScript.match(/"video_timestamp":(\d+),/)?.at(1) ?? ''
        const vcServerUrl = (videoScript.match(/"vcServerUrl":"(.*?)",/)?.at(1) ?? '').replaceAll('\\', '')
        const appID = videoScript.match(/"app_id":(\d+),/)?.at(1) ?? ''

        return {
            ...videoActionScript,
            title,
            token: token ?? '',
            dataVideoId: videoActionScript?.itemId ?? -1,
            likeUrl: videoActionScript?.submitVote ?? '',
            dislikeUrl: videoActionScript?.submitVoteDown ?? '',
            favoriteUrl: videoActionScript?.favouriteUrl ?? '',
            videoId,
            mungedSessionId,
            watchSessionId,
            videoDuration,
            videoTimestamp,
            vcServerUrl,
            appID,
            redirect,
        } as VideoPageTokenInfo
    }
    catch (err) {
        return await Promise.reject(err)
    }
}
