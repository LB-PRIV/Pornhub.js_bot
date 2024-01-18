import { getCheerio } from '../utils/cheerio'
import { getMainPage } from './getMainPage'
import { Route } from './route'
import type { Engine } from '../core/engine'
import { Cheerio, Element } from 'cheerio'
import { videoPage } from '../scrapers/pages/video'
import fs from 'fs'
import { UrlParser } from '../utils/url'

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
        const options = await getToken(engine, urlOrId)
        console.log(options.submitVote, options.submitVoteDown)
        if (voteType == "like") {
            voteUrl = options.submitVote 
        } else {
            voteUrl = options.submitVoteDown
        }
        const id = UrlParser.getVideoID(urlOrId)
        await sendViewedEvent(engine,  {...options, url: Route.videoPage(id)})
        await new Promise(r => setTimeout(r, 150));
        await sendAddCall(engine, options.vcServerUrl)
        await new Promise(r => setTimeout(r, 200));
    }

    const result = await sendRateForm(engine, voteUrl)
    return result
}

async function getToken(engine: Engine, urlOrId: string) {
    try {
        const html = await videoPage(engine, urlOrId, true) as string
        const $ = getCheerio(html)
        let token = $('[name="token"]').attr('value') || ''
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
            if (script.includes("WIDGET_RATINGS_LIKE_FAV.token ") && !token) {
                let text = script.split("WIDGET_RATINGS_LIKE_FAV.token = ")[1];
                text = text.trim().substring(0, text.length - 2);
                token = text.replace(/\"+/g, "");
            }

        })

        if (!videoActionScript) {
            throw new Error('Could not load required WIDGET_RATINGS_LIKE_FAV Object from DOM');
        }
        if (!token) {
            throw new Error('Could not load required element "TOKEN" from DOM');
        }        

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


async function sendAddCall(engine: Engine, vcServerUrl: string) {
    const res = await engine.request.get(Route.vcServer(vcServerUrl))
    const result = await res.json()
    return result
}

async function sendViewedEvent( engine: Engine ,options:{url: string, munged_session_id: string, video_duration: string, video_id: string, video_timestamp: string, watchSessionId: string}): Promise<any> {
    // `https://etahub.com/events?app_id=10896&eventName=viewed&featureName=viewed&featureValue=true&h=de.pornhub.com&msid=${pageParams.mungedSessionId}&orientation=desktopMode&osName=Windows&osVersion=10&platform=desktop&ps=videoPage&rf=${videoURL}&siteName=pornhub&vd=${pageParams.videoDuration}&vid=${pageParams.videoId}&vt=${pageParams.videoTimestamp}&ws=${pageParams.watchSessionId}`
      
    const viewedURL = new URL("https://etahub.com/events");
    viewedURL.searchParams.append("app_id", "10896");
    viewedURL.searchParams.append("eventName", "viewed");
    viewedURL.searchParams.append("featureName", "viewed");
    viewedURL.searchParams.append("featureValue", "true");
    viewedURL.searchParams.append("h", "www.pornhub.com");
    viewedURL.searchParams.append("msid", options.munged_session_id);
    viewedURL.searchParams.append("orientation", "desktopMode");
    viewedURL.searchParams.append("osName", "Windows");
    viewedURL.searchParams.append("osVersion", "10");
    viewedURL.searchParams.append("platform", "desktop");
    viewedURL.searchParams.append("ps", "videoPage");
    viewedURL.searchParams.append("rf", options.url);
    viewedURL.searchParams.append("siteName", "pornhub");
    viewedURL.searchParams.append("vd", options.video_duration);
    viewedURL.searchParams.append("vid", options.video_id);
    viewedURL.searchParams.append("vt", options.video_timestamp);
    viewedURL.searchParams.append("ws", options.watchSessionId);

    const urlEncoded = encodeURI(viewedURL.toString());
    const response = await engine.request.get(urlEncoded);
    console.log(await response.text())
    if (!response) {
        throw new Error("failed to send viewed event");
    } else {
        return response;
    }
}
