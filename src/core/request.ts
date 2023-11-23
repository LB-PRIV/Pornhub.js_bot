import { URLSearchParams } from 'node:url'
import createDebug from 'debug'
import fetch from 'node-fetch'
import { getCheerio } from '../utils/cheerio'
import { HttpStatusError, IllegalError } from '../utils/error'
import eventEmitter from './eventEmitter'
import type { HeadersInit, RequestInit, Response } from 'node-fetch'
import { CycleTLSClient, CycleTLSResponse } from 'cycletls'
import { HttpsProxyAgent } from 'https-proxy-agent'

interface Cookie {
    value: string
    expires: Date
}

const debug = createDebug('REQUEST')
const nonExpireDate = new Date(9999, 1, 1)

// eslint-disable-next-line ts/consistent-type-definitions
type EventsMap = {
    responseHTML: {
        url: URL
        html: string
    }
    responseJSON: {
        url: URL
        json: unknown
    }
}

export class Request {
    private _agent: RequestInit['agent']
    private _proxy: string | undefined = undefined;
    private _headers: Record<string, string> = {}
    private _cookieStore: Map<string, Cookie> = new Map()
    private _cycleTLSClient: CycleTLSClient | undefined = undefined

    eventEmitter = eventEmitter<EventsMap>()

    setCycleTLSClient(cycleTLSClient: CycleTLSClient) {
        this._cycleTLSClient = cycleTLSClient
    }

    setAgent(agent: RequestInit['agent']) {
        this._agent = agent
    }

    setProxy(proxy: string) {
        this._proxy = proxy;
        this._agent = new HttpsProxyAgent(proxy);
    }

    setHeader(key: string, value: string) {
        if (key !== 'Cookie') debug(`[Header] Set: ${key}=${value}`)
        this._headers[key] = value
    }

    private _checkCookieExpired() {
        const now = Date.now()
        this._cookieStore.forEach((cookie, key) => {
            if (cookie.expires.getTime() < now) {
                debug(`[Cookie] Expired: ${key}`)
                this._cookieStore.delete(key)
            }
        })
    }
    
    private get cookieString() {
        this._checkCookieExpired()
        return Array.from(this._cookieStore).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v.value)}`).join('; ')
    }

    getCookieString() {
        return this.cookieString
    }

    getCookies(): Record<string, string> {
        this._checkCookieExpired()
        return [...this._cookieStore].reduce((acc, [k, v]) => {
            acc[k] = v.value
            return acc
        }, {} as Record<string, string>)
    }

    getCookie(key: string): string | undefined {
        this._checkCookieExpired()
        return this._cookieStore.get(key)?.value
    }

    setCookie(key: string, value: string) {
        debug(`[Cookie] Set: ${key}=${value}`)
        this._cookieStore.set(key, {
            value,
            expires: nonExpireDate,
        })
    }

    deleteCookie(key: string) {
        debug(`[Cookie] Del: ${key}`)
        this._cookieStore.delete(key)
    }

    private async _checkStatus(res: Response) {
        if (res.ok) return res

        if (res.status === 404) {
            let html = ''
            try {
                html = await res.text()
            }
            catch (error) {
                // ignore
            }

            if (/class="deterrenceWarn"/.test(html)) {
                const $ = getCheerio(html)
                const warning = $('.deterrenceWarn').text()
                if (warning) {
                    return Promise.reject(new IllegalError(warning))
                }
            }
        }
        return Promise.reject(new HttpStatusError(`${res.status} ${res.statusText} at ${res.url}`))
    }

    private async _checkStatusCycleTLS(res: CycleTLSResponse, uri: string) {
        if (res.status === 200) return res

        if (res.status === 404) {
            let html = ''
            try {
                html = res.body as string
            }
            catch (error) {
                // ignore
            }

            if (/class="deterrenceWarn"/.test(html)) {
                const $ = getCheerio(html)
                const warning = $('.deterrenceWarn').text()
                if (warning) {
                    return Promise.reject(new IllegalError(warning))
                }
            }
        }
        return Promise.reject(new HttpStatusError(`${res.status} at ${uri}`))
    }

    private _parseCookieItem(str: string): [string, Cookie] {
        const [first, ...rest] = str.split(';').map(item => item.trim())
        const [key, value] = first.split('=')
        const restAttrs = rest.reduce((acc, item) => {
            const [k, v] = item.split('=')
            acc[k.toLowerCase()] = v
            return acc
        }, {} as Record<string, string>)

        let expires = nonExpireDate
        if (restAttrs['max-age']) expires = new Date(Date.now() + Number(restAttrs['max-age']) * 1000)
        else if (restAttrs.expires) expires = new Date(restAttrs.expires)

        return [key, { value, expires }]
    }

    private _handleSetCookie(res: Response | CycleTLSResponse) {
        //console.log(`[Cookie] Received Set-Cookie: ${res.headers.raw()['set-cookie']}`)
        if (!res.headers.raw()['set-cookie']) return res

        res.headers.raw()['set-cookie'].forEach((item: string) => {
            debug(`[Cookie] Received Set-Cookie: ${item}`)
            //console.log(`[Cookie] Received Set-Cookie: ${item}`)
            const [key, cookie] = this._parseCookieItem(item)
            this._cookieStore.set(key, cookie)
        })

        return res
    }

    private _handleSetCookieCycleTLS(res: CycleTLSResponse) {

        //console.log("res.headers", res.headers)
        if (!res.headers['Set-Cookie']) return res

        res.headers['Set-Cookie'].forEach((item: string) => {
            //console.log(`[Cookie] Received Set-Cookie: ${item}`)
            debug(`[Cookie] Received Set-Cookie: ${item}`)
            const [key, cookie] = this._parseCookieItem(item)
            this._cookieStore.set(key, cookie)
        })

        return res
    }

 
    private _buildParams<U extends Record<string, any>>(data: U) {
        const params = new URLSearchParams()
        Object.keys(data).forEach((key) => {
            params.append(key, data[key])
        })
        return params
    }

    private _buildRequest<U extends Record<string, any>>(method: 'get' | 'post' | 'post-form', url: string, data?: U) {
        const headers: HeadersInit = {}
        const opts: RequestInit = { method, headers }

        //console.log("method", method, "url", url, "data", data, headers, opts)
        if (method === 'post') {
            headers['Content-Type'] = 'application/json'
            opts.body = JSON.stringify(data)
        }

        if (method === 'post-form') {
            // headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8'
            opts.method = 'post'
            if (data) opts.body = this._buildParams<U>(data)
        }

        return this.fetch(url, opts)
    }

    private async _handleListener(method: string, response: Response) {
        if (method !== 'GET') return

        const url = new URL(response.url)
        const contentType = response.headers.get('content-type') || ''

        if (this.eventEmitter.has('responseHTML')) {
            if (contentType.includes('application/json')) {
                const copiedRes = response.clone()
                const json = await copiedRes.json()
                this.eventEmitter.emit('responseJSON', { url, json })
            }
        }

        if (this.eventEmitter.has('responseJSON')) {
            if (contentType.includes('text/html')) {
                const copiedRes = response.clone()
                const html = await copiedRes.text()
                this.eventEmitter.emit('responseHTML', { url, html })
            }
        }
    }

    private async _handleListenerCycleTLS(method: string, response: CycleTLSResponse, uri: string) {
        if (method !== 'GET') return

        const url = new URL(uri)
        const contentType = response.headers['Content-Type'] || ''

        if (this.eventEmitter.has('responseHTML')) {
            if (contentType.includes('application/json')) {
                const json = response.body
                this.eventEmitter.emit('responseJSON', { url, json })
            }
        }

        if (this.eventEmitter.has('responseJSON')) {
            if (contentType.includes('text/html')) {
                const html = response.body as string
                this.eventEmitter.emit('responseHTML', { url, html })
            }
        }
    }

    async fetch(url: string, opts: RequestInit = {}): Promise<Response> {

        //const cookie = url.includes("view_video.php")?this.cookieString:this.getCookieStringWithSS()
        const headers = Object.assign({}, this._headers, opts.headers, {
            cookie: this.cookieString,
        })
        //console.log("url", url, "opts", opts, headers)

        const method = opts.method?.toUpperCase() || 'GET'
        debug(`[ RQST ] ${method} ${url}`)

        // 
        if (this._cycleTLSClient && (method === 'GET' || (method === 'POST' && (opts.body == '' || opts.body == undefined || opts.body == '{}')))) {
            
            //console.log("USING CYCLE TLS CLIENT")
            const cookieObj: {[key: string]: string} = {}
            //console.log("this._cookieStore", this._cookieStore)
            this._cookieStore.forEach((cookie, key) => {
                cookieObj[key] = cookie.value
            })
            const res = await this._cycleTLSClient(url, {
                body: method == "POST"? undefined:opts.body as string,
                headers,
                cookies: cookieObj,
                proxy: this._proxy,
                //...(this._agent && { agent: this._agent }),
            }, method.toLowerCase() as any)

            debug(`[ RESP ] ${method} ${url} ${res.status}`)
            
            this._handleListenerCycleTLS(method, res, url)

            await this._checkStatusCycleTLS(res, url)
            this._handleSetCookieCycleTLS(res)

            let result: typeof Response = {
                // @ts-ignore
                ok: res.status === 200,
                status: res.status,
                statusText: res.status.toString(),
                url: url,
                headers: {
                    raw: () => {
                        return {
                            'set-cookie': res.headers['set-cookie']
                        }
                    }
                },
                text: async () => {
                    return res.body as string
                },
                json: async () => {
                    return res.body as any
                }
            }
            //console.log("result", result)
            // @ts-ignore
            return result
        }

        //console.log("url", url, "opts", opts, "headers", headers, "this._agent", this._agent)
        const res = await fetch(url, {
            ...opts,
            headers,
            ...(this._agent && { agent: this._agent }),
        })

        debug(`[ RESP ] ${method} ${url} ${res.status} ${res.statusText}`)

        if (res.url !== url) {
            debug(`Redirected from ${url} to ${res.url}`)
        }

        this._handleListener(method, res)

        await this._checkStatus(res)
        this._handleSetCookie(res)

        return res
    }

    get(url: string) {
        return this._buildRequest('get', url)
    }

    post<U extends object = any>(url: string, data: U) {
        return this._buildRequest('post', url, data)
    }

    postForm<U extends object = any>(url: string, data: U) {
        return this._buildRequest('post-form', url, data)
    }
}
