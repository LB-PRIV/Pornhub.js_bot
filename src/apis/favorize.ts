import { videoPage } from '../scrapers/pages/video'
import { getCheerio } from '../utils/cheerio'
import { Route } from './route'
import type { Engine } from '../core/engine'
import type { Element } from 'cheerio'

export interface FavouriteResult {
    action: string
    message: string
    url: string
    success: string
}

export async function favorize(engine: Engine, urlOrId: string): Promise<FavouriteResult> {
    const reqInfo = await getToken(engine, urlOrId)
    const token = reqInfo.voteUrl.split('token=')[1]
    const data = {
        token,
        toggle: 1,
        id: reqInfo.itemId,
    }

    const res = await engine.request.postForm(Route.favorize(), data)

    const result = await res.json() as FavouriteResult
    return result
}

async function getToken(engine: Engine, urlOrId: string) {
    try {
        const html = await videoPage(engine, urlOrId, true) as string
        const $ = getCheerio(html)
        const token = $('[name="token"]').attr('value') || ''
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
        })
        return { ...videoActionScript, token, redirect }
    }
    catch (err) {
        return await Promise.reject(err)
    }
}
