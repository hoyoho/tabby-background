import { pathToFileURL } from 'url'
import type { Background, BackgroundPluginConfig } from './config.provider'

/**
 * Pure CSS builders for the background plugin.
 *
 * Kept out of `BackgroundService` so the emitted rules can be unit-tested
 * without Angular, the config store or the DOM. The service still decides
 * *which* background is active; these functions only render it.
 */

/** The slice of the plugin config the font rules read. */
export type UiFontConfig = Pick<BackgroundPluginConfig,
    'uiFontEnabled' | 'uiFontFamily' | 'uiFontSize' | 'uiFontTabBarCloseBtnFix'>

/** The slice of the plugin config the "others" rules read. */
export type OthersConfig = Pick<BackgroundPluginConfig,
    'othersUnfocusedTabDimming' | 'othersFocusedTabDimming' | 'othersTabBarPersistentSpaceMinWidth' | 'othersHideFooter' | 'othersSolidPopups'>

export interface BackgroundRenderOptions {
    fadeIn: boolean
    fadeDurationMs: number
}

/**
 * Convert a filesystem path to a URL usable in CSS `url()`.
 *
 * Absolute Windows paths (e.g. `C:\Users\...`) would be parsed as an unknown
 * protocol (`C:`) inside `url()`, so we convert them to `file:///` URLs via
 * `pathToFileURL` (which also handles percent-encoding correctly).
 *
 * Relative paths resolve against the app's own `file://` origin and only
 * need forward-slash normalization + `encodeURI`.
 */
export function toFileUrl (p: string): string {
    const normalized = p.replaceAll('\\', '/')
    const isAbsolute = /^[a-zA-Z]:\//.test(normalized) || normalized.startsWith('/')
    if (!isAbsolute) {
        return encodeURI(normalized)
    }
    try {
        return pathToFileURL(p).href
    } catch {
        return `file:///${encodeURI(normalized)}`
    }
}

export function buildBackgroundCss (background: Background, options: BackgroundRenderOptions): string {
    const { backgroundPath } = background
    const { backgroundFullscreenType, backgroundFullscreenRepeatType, backgroundFullscreenPosition } = background
    const {
        backgroundOpacity,
        backgroundBlur,
        backgroundBrightness,
        backgroundContrast,
        backgroundGrayscale,
        backgroundHueRotate,
        backgroundInvert,
        backgroundSaturate,
        backgroundSepia,
    } = background
    const { backgroundListGroupTransparent, backgroundFooterTransparent, backgroundSidebarTransparent } = background

    const css = `
/* added by tabby-background plugin */
/* The image is painted above the window tint core puts on \`body\`; core keeps
   the tab containers and the terminal surface transparent for us, so no
   background needs overriding here (see GlobalStyleProvider). */
.content-tab-active::before {
  content: ""; position: fixed; left: 0; right: 0; z-index: -1; display: block; width: 100%; height: 100%;
  filter:${
    (backgroundOpacity === 100 ? '' : ` opacity(${backgroundOpacity}%)`) +
    (backgroundBlur === 0 ? '' : ` blur(${backgroundBlur}px)`) +
    (backgroundBrightness === 100 ? '' : ` brightness(${backgroundBrightness}%)`) +
    (backgroundContrast === 100 ? '' : ` contrast(${backgroundContrast}%)`) +
    (backgroundGrayscale === 0 ? '' : ` grayscale(${backgroundGrayscale}%)`) +
    (backgroundHueRotate === 0 ? '' : ` hue-rotate(${backgroundHueRotate}deg)`) +
    (backgroundInvert === 0 ? '' : ` invert(${backgroundInvert}%)`) +
    (backgroundSaturate === 100 ? '' : ` saturate(${backgroundSaturate}%)`) +
    (backgroundSepia === 0 ? '' : ` sepia(${backgroundSepia}%)`) +
    ";"
  }
  opacity: ${options.fadeIn ? 1 : 0};
  transition: opacity ${options.fadeDurationMs}ms ease-in-out;
  background-image: url("${toFileUrl(backgroundPath)}");
  background-repeat: ${backgroundFullscreenRepeatType};
  background-position: ${backgroundFullscreenPosition};
  background-size: ${backgroundFullscreenType};
}
/* group list */
${
    backgroundListGroupTransparent > 0
        ? `
.list-group {
  --bs-list-group-bg: color-mix(in srgb, var(--theme-bg-more) ${100 - backgroundListGroupTransparent}%, transparent);
}`.trim()
        : ''
}
/* footer */
${
    backgroundFooterTransparent !== 50
        ? `
footer {
  --start-page-footer-bg: color-mix(in srgb, rgba(0,0,0,1) ${100 - backgroundFooterTransparent}%, transparent);
}`.trim()
        : ''
}
/* sidebar */
${
    backgroundSidebarTransparent > 0
        ? `
.sidebar-main {
  --sidebar-bg: color-mix(in srgb, var(--theme-bg-more-2) ${100 - backgroundSidebarTransparent}%, transparent);
}`.trim()
        : ''
}`.trim()
    return css
}

export function buildUiFontCss (config: UiFontConfig): string {
    const { uiFontEnabled, uiFontFamily, uiFontSize, uiFontTabBarCloseBtnFix } = config
    if (!uiFontEnabled) {
        return ''
    }
    const uiFontCss = `
/* added by tabby-background plugin */
body {
  font-family: "${uiFontFamily}";
  font-size: ${uiFontSize}px;
}
${
    uiFontTabBarCloseBtnFix
        ? `
tab-header button {
  /*left: 8px;*/
  font-family: "Source Sans Pro";
}`.trim()
        : ''
}`.trim()
    return uiFontCss
}

export function buildOthersCss (config: OthersConfig): string {
    const { othersUnfocusedTabDimming, othersFocusedTabDimming, othersTabBarPersistentSpaceMinWidth, othersHideFooter, othersSolidPopups } = config
    let css = ''
    // Focused/unfocused follows the workspace's global focus rather than the
    // per-pane foreground tab: `.globally-focused` is set by WorkspaceComponent
    // on every session whose pane holds the global focus (all panes in
    // focus-all mode). Unfocused panes' visible sessions get dimmed by
    // `othersUnfocusedTabDimming`, the focused pane by `othersFocusedTabDimming`.
    if (othersUnfocusedTabDimming !== 0) {
        css += `\nsplit-tab>.child:not(.globally-focused) {\n  opacity: ${(100 - othersUnfocusedTabDimming) / 100};\n}\n`
    }
    if (othersFocusedTabDimming !== 0) {
        css += `\nsplit-tab>.child.globally-focused {\n  opacity: ${(100 - othersFocusedTabDimming) / 100};\n}\n`
    }
    if (othersTabBarPersistentSpaceMinWidth !== 138) {
        css += `\n.btn-space.persistent {\n  min-width: ${othersTabBarPersistentSpaceMinWidth}px !important;\n}\n`
    }
    if (othersHideFooter) {
        css += `\nfooter {\n  opacity: 0;\n}\n`
    }
    if (othersSolidPopups) {
        // Popup panels (menus, dialogs, tooltips, notifications, the search panel)
        // are core's frosted surfaces, and core tints all of them through the one
        // `--frost-tint` token (see theme.new.scss). Pointing that token back at
        // the opaque shade keeps this rule from having to list the surfaces, so
        // any surface core adds later follows along.
        //
        // `html` in the selector is only about precedence: core declares the same
        // token on `body.vibrancy`, and the plugin's styles live in their own
        // <style> element, so an equal-specificity rule would depend on the order
        // the two elements happen to be inserted in.
        css += `\nhtml body.vibrancy {\n  --frost-tint: var(--theme-bg-more-solid);\n}\n`
    }

    return css ? `/* added by tabby-background plugin */${css}` : ''
}
