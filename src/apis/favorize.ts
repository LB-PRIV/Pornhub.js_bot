import { getCheerio } from '../utils/cheerio'
import { getMainPage } from './getMainPage'
import { Route } from './route'
import type { Engine } from '../core/engine'
import { Cheerio, Element } from 'cheerio'
import { videoPage } from '../scrapers/pages/video'
import { getToken } from './getToken'
import { UrlParser } from '../utils/url'

export interface FavouriteResult {
    action: string
    message: string
    url: string
    success: string
  }
  
export async function favorize(engine: Engine, urlOrId: string): Promise<FavouriteResult> {
    
    const token = getToken(engine);
    const videoID = UrlParser.getVideoID(urlOrId)

    const res = await engine.request.post(Route.favorize(), {
        token,
        toggle: 1,
        id: videoID,
    })
    
    const result = await res.json() as FavouriteResult
    return result
}
