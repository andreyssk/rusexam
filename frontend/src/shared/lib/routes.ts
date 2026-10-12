/** The screen where an attempt is being taken (not its result page). It gets its own fixed action bar instead of the tab bar. */
export const isAttemptRunPath = (pathname: string) => /^\/attempts\/\d+\/?$/.test(pathname)
