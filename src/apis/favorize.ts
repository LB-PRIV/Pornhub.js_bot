import { videoPage } from '../scrapers/pages/video'
import { getCheerio } from '../utils/cheerio'
import { Route } from './route'
import type { Engine } from '../core/engine'
import type { Element } from 'cheerio'
import { getVideoPageToken } from './getToken'

export interface FavouriteResult {
    action: string
    message: string
    url: string
    success: string
}

export async function favorize(engine: Engine, urlOrId: string, options?: {voteUrl: string, itemId: number} ): Promise<FavouriteResult | undefined> {
    try {

        if (!options) {
            options = await getVideoPageToken(engine, urlOrId)
            if (!options) {
                throw new Error('Failed to get video page token')
            }
        }
        const token = options.voteUrl?.split('token=')?.at(1)
        if (!token) {
            throw new Error('Failed to get token')
        }
        const data = {
            token,
            toggle: 1,
            id: options.itemId,
        }

        const res = await engine.request.postForm(Route.favorize(), data)

        return await res.json() as FavouriteResult
    }
    catch (e) {
        console.error(e)
        return undefined
    }
}
