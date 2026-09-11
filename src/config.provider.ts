import { ConfigProvider } from "tabby-core";
import * as uuid from "uuid";

export type FullscreenType = "contain" | "cover";
export type FullscreenRepeatType = "repeat" | "no-repeat";
export type FullscreenPosition = "top" | "bottom" | "center" | "left" | "right";

export type Background = {
  backgroundPath: string;
  backgroundFullscreenType: FullscreenType;
  backgroundFullscreenRepeatType: FullscreenRepeatType;
  backgroundFullscreenPosition: FullscreenPosition;
  backgroundOpacity: number;
  backgroundBlur: number;
  backgroundBrightness: number;
  backgroundContrast: number;
  backgroundGrayscale: number;
  backgroundHueRotate: number;
  backgroundInvert: number;
  backgroundSaturate: number;
  backgroundSepia: number;
  backgroundListGroupTransparent: number;
  backgroundFooterTransparent: number;
  backgroundSidebarTransparent: number;
};

export type AdvancedBackground = Background & {
  // profile: any; // 单会话背景配置，先不实现喵，留个坑喵~
  enabled: boolean;
  id: string;
  name: string;
  isFolder: boolean;
};

export const DefaultBackground: AdvancedBackground = {
  enabled: false,
  id: uuid.NIL,
  name: "",
  isFolder: false,
  backgroundPath: "",
  backgroundFullscreenType: "cover",
  backgroundFullscreenRepeatType: "no-repeat",
  backgroundFullscreenPosition: "center",
  backgroundOpacity: 100,
  backgroundBlur: 0,
  backgroundBrightness: 100,
  backgroundContrast: 100,
  backgroundGrayscale: 0,
  backgroundHueRotate: 0,
  backgroundInvert: 0,
  backgroundSaturate: 100,
  backgroundSepia: 0,
  backgroundListGroupTransparent: 0,
  backgroundFooterTransparent: 50,
  backgroundSidebarTransparent: 0,
};

export type BackgroundPluginConfig = Background & {
  backgroundEnabled: boolean;
  uiFontEnabled: boolean;
  uiFontFamily: string;
  uiFontSize: number;
  uiFontTabBarCloseBtnFix: boolean;
  othersInactiveTabDimming: number;
  othersActiveTabDimming: number;
  othersTabBarPersistentSpaceMinWidth: number;
  othersHideFooter: boolean;
  backgroundMode: "simple" | "advanced";
  backgrounds: AdvancedBackground[];
  backgroundAdvancedChooseType: "sequence" | "random" | "reverse";
  backgroundAdvancedSlideshowInterval: number;
  backgroundAdvancedCurrentId: string;
  backgroundLastChangedTime: number;
};

/** @hidden */
export class BackgroundConfigProvider extends ConfigProvider {
  defaults: { backgroundPlugin: BackgroundPluginConfig } = {
    backgroundPlugin: {
      backgroundEnabled: false,
      backgroundPath: "../../../data/background.jpg",
      backgroundFullscreenType: "cover",
      backgroundFullscreenRepeatType: "no-repeat",
      backgroundFullscreenPosition: "center",
      backgroundOpacity: 45,
      backgroundBlur: 0,
      backgroundBrightness: 100,
      backgroundContrast: 100,
      backgroundGrayscale: 0,
      backgroundHueRotate: 0,
      backgroundInvert: 0,
      backgroundSaturate: 100,
      backgroundSepia: 0,
      backgroundListGroupTransparent: 0,
      backgroundFooterTransparent: 50,
      backgroundSidebarTransparent: 0,
      uiFontEnabled: false,
      uiFontFamily: "Source Sans Pro",
      uiFontSize: 14,
      uiFontTabBarCloseBtnFix: true,
      othersInactiveTabDimming: 50,
      othersActiveTabDimming: 0,
      othersTabBarPersistentSpaceMinWidth: 138,
      othersHideFooter: false,
      backgroundMode: "simple",
      backgrounds: [],
      backgroundAdvancedChooseType: "sequence",
      backgroundAdvancedSlideshowInterval: 3600,
      backgroundAdvancedCurrentId: uuid.NIL,
      backgroundLastChangedTime: 0,
    },
  };
}
