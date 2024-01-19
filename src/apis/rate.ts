import {UrlParser} from '../utils/url'
import {Route} from './route'
import type {Engine} from '../core/engine'
import {getVideoPageToken} from "./getToken";
import {sendAddCall, sendViewedEvent} from "./etahub";

export interface RateResultSuccess {
    id: number
    msg: string
    value: string
}

export type RateResult = RateResultSuccess | []

export async function rate(engine: Engine, urlOrId: string, voteType: 'like' | 'dislike', path?: string): Promise<RateResult> {
    let voteUrl = ''
    if (path) {
        voteUrl = path
    }
    else {
        const options = await getVideoPageToken(engine, urlOrId)
        if (!options) {
            throw new Error('Failed to get video page token')
        }
        if (voteType === 'like') {
            voteUrl = options.submitVote
        }
        else {
            voteUrl = options.submitVoteDown
        }
        await sendViewedEvent(engine, options)
        await new Promise(r => setTimeout(r, 150))
        await sendAddCall(engine, options.vcServerUrl)
        await new Promise(r => setTimeout(r, 200))
    }

    return await sendRateForm(engine, voteUrl)
}

async function sendRateForm(engine: Engine, submitVote: string) {
    const res = await engine.request.post(Route.rate(submitVote), {})
    const result = await res.json() as RateResult
    return result
}
