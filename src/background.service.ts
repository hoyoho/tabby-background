import { Injectable, Injector } from "@angular/core";
import { ConfigService, LogService, Logger, ThemesService, GlobalStyleProvider, TranslateService } from "tabby-core";
import { AdvancedBackground, Background, BackgroundPluginConfig, DefaultBackground } from "./config.provider";
import { translations } from "./translations";
import * as uuid from "uuid";
import { readdirSync } from "fs";
import path from "path";

@Injectable({ providedIn: "root" })
export class BackgroundService implements GlobalStyleProvider {
  private logger: Logger;
  pluginConfig: BackgroundPluginConfig;
  private backgroundTimer: NodeJS.Timeout;
  private fadeTimer: NodeJS.Timeout;
  private previewMode: boolean;
  private previewIndex: number;
  private slideShowList: string[];
  private slideShowCurrentIndex: number;
  private fadeIn = true;
  private readonly fadeDurationMs = 500;
  private themes: ThemesService | null = null;

  constructor(
    public config: ConfigService,
    private injector: Injector,
    private logService: LogService,
    private translate: TranslateService,
  ) {
    this.logger = this.logService.create("tabby-background");
    this.logger.info("BackgroundService ctor");

    this.previewMode = false;
    this.slideShowList = [];

    this.config.ready$.subscribe(() => {
      this.logger.info("config ready");
      this.pluginConfig = this.config.store.backgroundPlugin;
      this.applyStyle();
      setImmediate(() => {
        for (const translation of translations) {
          const [lang, trans] = translation;
          this.translate.setTranslation(lang, trans, true);
          this.logger.info("translate applied");
        }
      });
    });
  }

  // Lazily resolved: BackgroundService itself is a GlobalStyleProvider whose
  // construction ThemesService triggers, so injecting ThemesService eagerly
  // would create a DI cycle (NG0200).
  private getThemes(): ThemesService {
    return (this.themes ??= this.injector.get(ThemesService));
  }

  getStyleModuleName(): string {
    return "tabby-background";
  }

  provideStyles(): string {
    if (!this.pluginConfig) {
        return "";
    }
    if (!this.pluginConfig.backgroundEnabled) {
      return this.buildUiFontCss() + "\n" + this.buildOthersCss();
    }
    const parts: string[] = [];
    if (this.previewMode && this.pluginConfig.backgrounds[this.previewIndex]) {
      parts.push(this.buildBackgroundCss(this.pluginConfig.backgrounds[this.previewIndex]));
    } else if (this.pluginConfig.backgroundMode === "simple") {
      parts.push(this.buildBackgroundCss(this.pluginConfig));
    } else if (this.pluginConfig.backgroundAdvancedCurrentId) {
      const background = this.getBackgroundByID(this.pluginConfig.backgroundAdvancedCurrentId);
      if (background) {
        parts.push(this.buildBackgroundCss(background));
      }
    }
    parts.push(this.buildUiFontCss());
    parts.push(this.buildOthersCss());
    return parts.filter(Boolean).join("\n");
  }

  applyStyle() {
    this.leaveSlideShow();
    this.getThemes().applyStyles();
    if (this.pluginConfig.backgroundEnabled) {
      if (!this.previewMode && this.pluginConfig.backgroundMode === "advanced") {
        this.enterSlideShow();
      }
    }
  }

  apply() {
    if (this.pluginConfig.backgroundAdvancedSlideshowInterval < 5) {
      this.pluginConfig.backgroundAdvancedSlideshowInterval = 5;
    }
    this.config.save();
    this.applyStyle();
  }

  applyBackground(id: string | null, updateTimestamp = true) {
    if (id !== null) {
      this.pluginConfig.backgroundAdvancedCurrentId = id;
    }
    if (updateTimestamp) {
      this.pluginConfig.backgroundLastChangedTime = Date.now();
    }
    this.config.save();
    this.fadeIn = false;
    this.getThemes().applyStyles();
    this.leaveFadeTimer();
    this.fadeTimer = setTimeout(() => {
      this.fadeIn = true;
      this.getThemes().applyStyles();
    }, this.fadeDurationMs);
  }

  addBackground() {
    const newBackground: AdvancedBackground = Object.assign({}, DefaultBackground);
    newBackground.id = uuid.v4();
    newBackground.name = `bg${this.pluginConfig.backgrounds.length}`;
    this.pluginConfig.backgrounds.unshift(newBackground);
    this.logger.debug(`background ${newBackground.id} added...`);
    this.apply();
  }

  delBackground(i: number) {
    this.pluginConfig.backgrounds.splice(i, 1);
    this.apply();
  }

  getBackgroundByID(id: string) {
    const [advancedId, isFolder, fileName] = id.split("|");
    const background = this.pluginConfig.backgrounds.find((value) => value.id === advancedId);
    if (!background) {
      return null;
    }
    const realBackground = Object.assign({}, background);
    if (isFolder === "true") {
      realBackground.backgroundPath += `/${fileName}`;
    }
    return realBackground;
  }

  buildSlideShowList() {
    this.slideShowList = [];
    const filteredList = this.pluginConfig.backgrounds.filter((value) => value.enabled);
    for (const item of filteredList) {
      const { id, isFolder = false } = item;
      const fileName = "null";
      let files: string[] = [];
      if (item.isFolder) {
        try {
          files = readdirSync(item.backgroundPath);
        } catch {
          continue;
        }
        files = files.filter((file) => [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".tif", ".tiff"].indexOf(path.extname(file).toLocaleLowerCase()) !== -1);
        this.slideShowList.push(...files.map((value) => [id, isFolder, value].join("|")));
      } else {
        this.slideShowList.push([id, isFolder, fileName].join("|"));
      }
    }
    if (this.pluginConfig.backgroundAdvancedChooseType === "sequence") {
    } else if (this.pluginConfig.backgroundAdvancedChooseType === "reverse") {
      this.slideShowList.reverse();
    } else if (this.pluginConfig.backgroundAdvancedChooseType === "random") {
      this.slideShowList.sort(() => Math.random() - 0.5);
    }
    this.slideShowCurrentIndex = this.slideShowList.findIndex((value) => value === this.pluginConfig.backgroundAdvancedCurrentId);
    if (this.slideShowCurrentIndex === -1) {
      this.slideShowCurrentIndex = 0;
      this.pluginConfig.backgroundAdvancedCurrentId = this.slideShowList[this.slideShowCurrentIndex];
    }
  }

  enterSlideShow() {
    const handler = () => {
      this.slideShowCurrentIndex++;
      if (this.slideShowCurrentIndex > this.slideShowList.length - 1) {
        this.slideShowCurrentIndex = 0;
      }
      this.applyBackground(this.slideShowList[this.slideShowCurrentIndex]);
      this.backgroundTimer = setTimeout(handler, this.pluginConfig.backgroundAdvancedSlideshowInterval * 1000);
    };
    this.leaveSlideShow();
    this.buildSlideShowList();
    if (this.slideShowList.length === 0) {
      return;
    }

    const leftTime = this.pluginConfig.backgroundAdvancedSlideshowInterval * 1000 - (Date.now() - this.pluginConfig.backgroundLastChangedTime);
    if (leftTime > 0) {
      this.logger.info(`${leftTime / 1000} second left to change background`);
      this.applyBackground(this.slideShowList[this.slideShowCurrentIndex], false);
      this.backgroundTimer = setTimeout(handler, leftTime);
    } else {
      handler();
    }
  }

  leaveSlideShow() {
    this.leaveFadeTimer();
    if (this.backgroundTimer) {
      clearTimeout(this.backgroundTimer);
      this.backgroundTimer = undefined;
    }
  }

  private leaveFadeTimer() {
    if (this.fadeTimer) {
      clearTimeout(this.fadeTimer);
      this.fadeTimer = undefined;
    }
  }

  enterPreviewMode(i: number) {
    this.previewMode = true;
    this.previewIndex = i;
    this.leaveSlideShow();
    this.fadeIn = true;
    this.getThemes().applyStyles();
  }

  leavePreviewMode() {
    if (this.previewMode) {
      this.previewMode = false;
      this.applyStyle();
    }
  }

  buildBackgroundCss(background: Background) {
    const { backgroundPath } = background;
    const { backgroundFullscreenType, backgroundFullscreenRepeatType, backgroundFullscreenPosition } = background;
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
    } = background;
    const { backgroundListGroupTransparent, backgroundFooterTransparent, backgroundSidebarTransparent } = background;

    const css = `
/* added by tabby-background plugin */
/* background */
.content-tab-active,
tab-body,
split-tab {
  background: none;
}
.xterm-viewport {
  background: none !important;
}
.content-tab-active::after {
  content: ""; position: fixed; left: 0; right: 0; z-index: -2; display: block; width: 100%; height: 100%;
  background: var(--body-bg);
}
start-page.content-tab-active::after {
  background: var(--theme-bg-more-2);
}
.content-tab-active::before {
  content: ""; position: fixed; left: 0; right: 0; z-index: -1; display: block; width: 100%; height: 100%;
  filter:${
    (backgroundOpacity === 100 ? "" : ` opacity(${backgroundOpacity}%)`) +
    (backgroundBlur === 0 ? "" : ` blur(${backgroundBlur}px)`) +
    (backgroundBrightness === 100 ? "" : ` brightness(${backgroundBrightness}%)`) +
    (backgroundContrast === 100 ? "" : ` contrast(${backgroundContrast}%)`) +
    (backgroundGrayscale === 0 ? "" : ` grayscale(${backgroundGrayscale}%)`) +
    (backgroundHueRotate === 0 ? "" : ` hue-rotate(${backgroundHueRotate}deg)`) +
    (backgroundInvert === 0 ? "" : ` invert(${backgroundInvert}%)`) +
    (backgroundSaturate === 100 ? "" : ` saturate(${backgroundSaturate}%)`) +
    (backgroundSepia === 0 ? "" : ` sepia(${backgroundSepia}%)`) +
    ";"
  }
  opacity: ${this.fadeIn ? 1 : 0};
  transition: opacity ${this.fadeDurationMs}ms ease-in-out;
  background-image: url("${encodeURI(backgroundPath.replaceAll("\\", "/"))}");
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
    : ""
}
/* footer */
${
  backgroundFooterTransparent !== 50
    ? `
footer {
  background: color-mix(in srgb, rgba(0,0,0,1) ${100 - backgroundFooterTransparent}%, transparent) !important;
}`.trim()
    : ""
}
/* sidebar */
${
  backgroundSidebarTransparent > 0
    ? `
profile-tree {
  background-color: color-mix(in srgb, var(--theme-bg-more-2) ${100 - backgroundSidebarTransparent}%, transparent) !important;
}`.trim()
    : ""
}`.trim();
    return css;
  }

  buildUiFontCss() {
    const { uiFontEnabled, uiFontFamily, uiFontSize, uiFontTabBarCloseBtnFix } = this.pluginConfig;
    if (!uiFontEnabled) {
      return "";
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
    : ""
}`.trim();
    return uiFontCss;
  }

  buildOthersCss() {
    const { othersInactiveTabDimming, othersActiveTabDimming, othersTabBarPersistentSpaceMinWidth, othersHideFooter } = this.pluginConfig;
    let css = "/* added by tabby-background plugin */";
    if (othersInactiveTabDimming !== 50) {
      css += `\nsplit-tab>.child {\n  opacity: ${(100 - othersInactiveTabDimming) / 100};\n}\n`;
    }
    if (othersActiveTabDimming !== 0) {
      css += `\nsplit-tab>.child.focused {\n  opacity: ${(100 - othersActiveTabDimming) / 100};\n}\n`;
    }
    if (othersTabBarPersistentSpaceMinWidth !== 138) {
      css += `\n.btn-space.persistent {\n  min-width: ${othersTabBarPersistentSpaceMinWidth}px !important;\n}\n`;
    }
    if (othersHideFooter) {
      css += `\nfooter {\n  opacity: 0;\n}\n`;
    }

    return css;
  }
}