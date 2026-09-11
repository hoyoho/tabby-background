import afZA from "../locale/af-ZA.po";
import bgBG from "../locale/bg-BG.po";
import csCZ from "../locale/cs-CZ.po";
import daDK from "../locale/da-DK.po";
import deDE from "../locale/de-DE.po";
import enGB from "../locale/en-GB.po";
import enUS from "../locale/en-US.po";
import esES from "../locale/es-ES.po";
import frFR from "../locale/fr-FR.po";
import hrHR from "../locale/hr-HR.po";
import idID from "../locale/id-ID.po";
import itIT from "../locale/it-IT.po";
import jaJP from "../locale/ja-JP.po";
import koKR from "../locale/ko-KR.po";
import plPL from "../locale/pl-PL.po";
import ptBR from "../locale/pt-BR.po";
import ptPT from "../locale/pt-PT.po";
import ruRU from "../locale/ru-RU.po";
import srSP from "../locale/sr-SP.po";
import svSE from "../locale/sv-SE.po";
import trTR from "../locale/tr-TR.po";
import ukUA from "../locale/uk-UA.po";
import zhCN from "../locale/zh-CN.po";
import zhTW from "../locale/zh-TW.po";

type BackgroundPluginTranslations = Record<string, string>;

/**
 * `po-gettext-loader` emits the parsed gettext structure:
 * `{ translations: { "": { msgid: { msgstr: [value] } } } }`.
 * Flatten it into the `{ msgid: value }` shape ngx-translate expects.
 */
function flattenPo(po: any): BackgroundPluginTranslations {
  const result: BackgroundPluginTranslations = {};
  const table = po?.translations?.[""] ?? {};
  for (const key of Object.keys(table)) {
    if (!key) {
      continue;
    }
    const value = table[key]?.msgstr?.[0];
    if (value) {
      result[key] = value;
    }
  }
  return result;
}

const poByLang: [string, any][] = [
  ["af-ZA", afZA],
  ["bg-BG", bgBG],
  ["cs-CZ", csCZ],
  ["da-DK", daDK],
  ["de-DE", deDE],
  ["en-GB", enGB],
  ["en-US", enUS],
  ["es-ES", esES],
  ["fr-FR", frFR],
  ["hr-HR", hrHR],
  ["id-ID", idID],
  ["it-IT", itIT],
  ["ja-JP", jaJP],
  ["ko-KR", koKR],
  ["pl-PL", plPL],
  ["pt-BR", ptBR],
  ["pt-PT", ptPT],
  ["ru-RU", ruRU],
  ["sr-SP", srSP],
  ["sv-SE", svSE],
  ["tr-TR", trTR],
  ["uk-UA", ukUA],
  ["zh-CN", zhCN],
  ["zh-TW", zhTW],
];

export const translations: [string, BackgroundPluginTranslations][] =
  poByLang.map(([lang, po]) => [lang, flattenPo(po)]);
