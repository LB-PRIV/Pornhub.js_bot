import {Route} from './route'
import type {Engine} from '../core/engine'
import type {VideoPageTokenInfo} from '../types/SideoPageTokenInfo'
import type {Response} from 'node-fetch'

export async function sendAddCall(engine: Engine, vcServerUrl: string): Promise<Response | void> {
    return engine.request.get(Route.vcServer(vcServerUrl)).catch((e) => {
        console.error(e)
    })
}

export async function sendViewedEvent(engine: Engine, options: VideoPageTokenInfo): Promise<Response | undefined> {
    // `https://etahub.com/events?app_id=10896&eventName=viewed&featureName=viewed&featureValue=true&h=de.pornhub.com&msid=${pageParams.mungedSessionId}&orientation=desktopMode&osName=Windows&osVersion=10&platform=desktop&ps=videoPage&rf=${videoURL}&siteName=pornhub&vd=${pageParams.videoDuration}&vid=${pageParams.videoId}&vt=${pageParams.videoTimestamp}&ws=${pageParams.watchSessionId}`
    try {
        const viewedURL = new URL('https://etahub.com/events')
        viewedURL.searchParams.append('app_id', '10896')
        viewedURL.searchParams.append('eventName', 'viewed')
        viewedURL.searchParams.append('featureName', 'viewed')
        viewedURL.searchParams.append('featureValue', 'true')
        viewedURL.searchParams.append('h', 'www.pornhub.com')
        viewedURL.searchParams.append('msid', options.mungedSessionId)
        viewedURL.searchParams.append('orientation', 'desktopMode')
        viewedURL.searchParams.append('osName', 'Windows')
        viewedURL.searchParams.append('osVersion', '10')
        viewedURL.searchParams.append('platform', 'desktop')
        viewedURL.searchParams.append('ps', 'videoPage')
        viewedURL.searchParams.append('rf', Route.videoPage(options.videoId))
        viewedURL.searchParams.append('siteName', 'pornhub')
        viewedURL.searchParams.append('vd', options.videoDuration)
        viewedURL.searchParams.append('vid', options.videoId)
        viewedURL.searchParams.append('vt', options.videoTimestamp)
        viewedURL.searchParams.append('ws', options.watchSessionId)

        const urlEncoded = encodeURI(viewedURL.toString())
        const response = await engine.request.get(urlEncoded)
        if (!response) {
            throw new Error('failed to send viewed event')
        } else {
            return response
        }
    } catch (e) {
        console.error(e)
        return
    }
}

export async function sendTimeWatchedEvent(engine: Engine, featureValue: number, options: VideoPageTokenInfo): Promise<Response | undefined> {
    try {
        const timeWatchedURL = new URL('https://etahub.com/events')
        timeWatchedURL.searchParams.append('app_id', options.appID)
        timeWatchedURL.searchParams.append('eventName', 'timewatched')
        timeWatchedURL.searchParams.append('featureName', 'timewatched')
        timeWatchedURL.searchParams.append('featureValue', featureValue.toString())
        timeWatchedURL.searchParams.append('h', 'www.pornhub.com')
        timeWatchedURL.searchParams.append('msid', options.mungedSessionId)
        timeWatchedURL.searchParams.append('orientation', 'desktopMode')
        timeWatchedURL.searchParams.append('osName', 'Windows')
        timeWatchedURL.searchParams.append('osVersion', '10')
        timeWatchedURL.searchParams.append('platform', 'desktop')
        timeWatchedURL.searchParams.append('ps', 'videoPage')
        timeWatchedURL.searchParams.append('pt', featureValue.toString())
        timeWatchedURL.searchParams.append('rf', 'Unknown')
        timeWatchedURL.searchParams.append('siteName', 'pornhub')
        timeWatchedURL.searchParams.append('vd', options.videoDuration)
        timeWatchedURL.searchParams.append('vid', options.videoId)
        timeWatchedURL.searchParams.append('vt', options.videoTimestamp)
        timeWatchedURL.searchParams.append('ws', options.watchSessionId)

        // const timeWatchedURL = `https://etahub.com/events?app_id=${this.eventParameters.appID}&eventName=timewatched&featureName=timewatched&featureValue=${featureValue}&h=de.pornhub.com&msid=${this.eventParameters.mungedSessionId}&orientation=desktopMode&osName=Windows&osVersion=10&platform=desktop&ps=videoPage&pt=${featureValue}&rf=Unknown&siteName=pornhub&vd=${this.eventParameters.videoDuration}&vid=${this.eventParameters.videoId}&vt=${this.eventParameters.videoTimestamp}&ws=${this.eventParameters.watchSessionId}`
        const urlEncoded = encodeURI(timeWatchedURL.toString())
        const response = await engine.request.get(urlEncoded)

        if (!response) {
            throw new Error('failed to send time watched event')
        } else {
            return response
        }
    } catch (e) {
        console.error(e)
        return
    }
}
