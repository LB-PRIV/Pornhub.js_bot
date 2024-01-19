import { sendAddCall, sendTimeWatchedEvent, sendViewedEvent } from './etahub'
import { getVideoPageToken } from './getToken'
import type { Engine } from '../core/engine'
import type { VideoPageTokenInfo } from '../types/SideoPageTokenInfo'
import type { Response } from 'node-fetch'

export interface RateResultSuccess {
    id: number
    msg: string
    value: string
}

export type RateResult = RateResultSuccess | []

export async function viewVideo(engine: Engine, urlOrId: string, viewTime: number, fetchedInfos?: VideoPageTokenInfo) {
    try {
        if (!fetchedInfos) {
            fetchedInfos = await getVideoPageToken(engine, urlOrId)
        }
        if (!fetchedInfos) {
            throw new Error('Failed to get video page token')
        }
        else {
            await executeDelayed(5000, () => sendTimeWatchedEvent(engine, 5, fetchedInfos!)
                .then(async (r: Response) => console.log(await r.text())))
            executeDelayed((Math.random() * 100) + 600, () => sendAddCall(engine, fetchedInfos!.vcServerUrl).then(async (r: Response) => console.log(await r.text())))

            await executeDelayed((Math.random() * 100) + 600, async () => {
                for (let i = 10; i < 30; i = i + 5) {
                    console.log('generating timewatched event:', i, 'seconds')
                    await executeDelayed(5000, () => sendTimeWatchedEvent(engine, i, fetchedInfos!).then(async (r: Response) => console.log(await r.text())))
                }
            })

            await executeDelayed((Math.random() * 100) + 1000, () => sendViewedEvent(engine, fetchedInfos!).then(async (r: Response) => console.log(await r.text())))
            await executeDelayed((Math.random() * 100) + 1000, () => sendTimeWatchedEvent(engine, viewTime, fetchedInfos!).then(async (r: Response) => console.log(await r.text())))
        }
    }
    catch (e) {
        console.error(e)
        return false
    }
    return true
}

async function executeDelayed<T>(delay: number, func: Function): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timeout = setTimeout(async () => {
            if (func === undefined) return reject(new Error('func is undefined'))
            const result = await func() as T
            clearTimeout(timeout)
            resolve(result)
        }, delay)
    })
}
