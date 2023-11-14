import { getCheerio } from '../utils/cheerio'
import { getMainPage } from './getMainPage'
import { Route } from './route'
import type { Engine } from '../core/engine'
import { Cheerio, Element } from 'cheerio'
import { videoPage } from '../scrapers/pages/video'

export interface RateResultSuccess {
    id: number
    msg: string
    value: string
} 

export type RateResult = RateResultSuccess | []

export async function rate(engine: Engine, urlOrId: string, voteType: "like" | "dislike", path?: string): Promise<RateResult> {
    
    let voteUrl = ""
    if (path) {
        voteUrl = path
    } else {
        const { token, submitVote, submitVoteDown  } = await getToken(engine, urlOrId)
        if (voteType == "like") {
            voteUrl = submitVote 
        } else {
            voteUrl = submitVoteDown
        }
    }

    const result = await sendRateForm(engine, voteUrl)
    return result
}

async function getToken(engine: Engine, urlOrId: string) {
    try {
        const html = await videoPage(engine, urlOrId, true) as string
        const $ = getCheerio(html)
        const token = $('[name="token"]').attr('value') || ''
        const redirect = $('[name="redirect"]').attr('value') || ''
        const videoActionScripts = $("div.allActionsContainer > script");
            
        let videoActionScript: any | undefined;
        videoActionScripts.each((i: number, el: Element) => {
            const script = $(el).text();
            if (script.includes("WIDGET_RATINGS_LIKE_FAV ")) {
                let text = script.split("WIDGET_RATINGS_LIKE_FAV = ")[1];
                text = text.trim().substring(0, text.length - 2);
                videoActionScript = JSON.parse(text.replace(/\\+/g, ""));
            }
        })
        return { ...videoActionScript, token, redirect }
    }
    catch (err) {
        return await Promise.reject(err)
    }
}
async function sendRateForm(engine: Engine, submitVote: string) {

    const res = await engine.request.post(Route.rate(submitVote), {})
    const result = await res.json() as RateResult
    return result
}
