export interface VideoPageTokenInfo {
    controller: string
    controllerUc: string
    favouriteUrl: string
    itemId: number
    itemIdNum: number
    isFavourite: number
    loggedIn: number
    text1: string
    submitVote: string
    submitVoteDown: string
    spinnerUrl: string
    voteUrl: string
    currentUp: number
    currentDown: number
    canVote: boolean
    canDownVoteBlocker: boolean
    saleVideo: boolean
    voteModalText: string
    isViewshare: string
    isPremium: boolean
    translation: Translation
    userVotedVideoDetail: number
    title: string
    token: string
    dataVideoId: number
    likeUrl: string
    dislikeUrl: string
    favoriteUrl: string
    videoId: string
    mungedSessionId: string
    watchSessionId: string
    videoDuration: string
    videoTimestamp: string
    vcServerUrl: string
    appID: string
    redirect: string
}

export interface Translation {
    warningMsg: string
    tooltipMsg1: string
    tooltipMsg2: string
}
