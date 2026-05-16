import type { PluginApi, PluginInfo } from '@arkadia/plugin-types';
import { registerTextAlias } from '../lib/registerTextAlias';

export async function init(api: PluginApi): Promise<PluginInfo> {
  const tag = 'jensEmocje';

  // ── aliases (alphabetical) ───────────────────────────────────────────────

  // #region ce
  api.aliases.register(/^ce$/, () => {
    // original had GMCP daylight check for Buongiorno/Buonasera — not implemented
    api.command.send('powiedz Buongiorno');
    api.command.send('uklon sie uprzejmie');
    return true;
  });

  // #region cmo
  registerTextAlias(api, /^cmo(?:\s+(.+))?$/, 'cmoknij');

  // #region haha
  registerTextAlias(api, /^haha(?:\s+(.+))?$/, 'zasmiej sie');

  // #region hm?
  registerTextAlias(api, /^hm\?(?:\s+(.+))?$/, 'zamrucz pytajaco');

  // #region kiw
  registerTextAlias(api, /^kiw(?:\s+(.+))?$/, 'kiwnij');

  // #region krz1
  api.aliases.register(/^krz1$/, () => {
    api.command.send('pkrzyknij glosno Z A S L A N I A C !');
    return true;
  });

  // #region krz2
  api.aliases.register(/^krz2$/, () => {
    api.command.send('pkrzyknij gromko L A M A C !');
    return true;
  });

  // #region kurw
  registerTextAlias(api, /^kurw(?:\s+(.+))?$/, 'gpklnij');

  // #region ma
  registerTextAlias(api, /^ma(?:\s+(.+))?$/, 'machnij reka krotko');

  // #region mach
  registerTextAlias(api, /^mach(?:\s+(.+))?$/, 'machnij reka');

  // #region obr
  registerTextAlias(api, /^obr(?:\s+(.+))?$/, 'rdobracaj monete');

  // #region par
  registerTextAlias(api, /^par(?:\s+(.+))?$/, 'parsknij');

  // #region pod
  registerTextAlias(api, /^pod(?:\s+(.+))?$/, 'podaj reke');

  // #region pok
  registerTextAlias(api, /^pok(?:\s+(.+))?$/, 'pokiwaj');

  // #region pokr
  registerTextAlias(api, /^pokr(?:\s+(.+))?$/, 'pokrec');

  // #region roll
  registerTextAlias(api, /^roll(?:\s+(.+))?$/, 'przewroc oczyma');

  // #region roz
  registerTextAlias(api, /^roz(?:\s+(.+))?$/, 'rozejrzyj sie');

  // #region semig
  registerTextAlias(api, /^semig(?:\s+(.+))?$/, 'rdprzyciagnij uwage');

  // #region superwejscie
  api.aliases.register(/^superwejscie$/, () => {
    api.command.send('chrzaknij dwornie');
    api.command.send('podskocz fantazyjnie');
    api.command.send('uklon sie zamaszyscie');
    api.command.send('pokrec sie');
    api.command.send('usiadz na drugiej kanapie');
    api.command.send('przeciagnij sie rzesko');
    return true;
  });

  // #region usr1
  registerTextAlias(api, /^usr1(?:\s+(.+))?$/, 'rdusmiech na mysl o wyzwaniu');

  // #region usr2
  registerTextAlias(api, /^usr2(?:\s+(.+))?$/, 'rdusmiech na mysl o zakladzie');

  // #region usr3
  registerTextAlias(api, /^usr3(?:\s+(.+))?$/, 'rdusmiech na mysl o zysku');

  // #region uwa
  registerTextAlias(api, /^uwa(?:\s+(.+))?$/, 'rdrzuc kilka uwag o');

  // #region wypat
  registerTextAlias(api, /^wypat(?:\s+(.+))?$/, 'rdwypatruj niebezpieczenstwa');

  // #region wyb
  registerTextAlias(api, /^wyb(?:\s+(.+))?$/, 'wybalusz');

  // #region wytr
  registerTextAlias(api, /^wytr(?:\s+(.+))?$/, 'wytrzeszcz oczy');

  // #region wys1
  registerTextAlias(api, /^wys1(?:\s+(.+))?$/, 'rdwysmiej czyny');

  // #region wys2
  registerTextAlias(api, /^wys2(?:\s+(.+))?$/, 'rdwysmiej slowa');

  // #region zag
  registerTextAlias(api, /^zag(?:\s+(.+))?$/, 'zagwizdz');

  // #region zagw
  registerTextAlias(api, /^zagw(?:\s+(.+))?$/, 'rdzagwizdz');

  // #region zam
  registerTextAlias(api, /^zam(?:\s+(.+))?$/, 'zamrucz niecenzuralnie');

  // #region zar
  registerTextAlias(api, /^zar(?:\s+(.+))?$/, 'zarechocz');

  // #region zat
  registerTextAlias(api, /^zat(?:\s+(.+))?$/, 'zatrzyj');

  // #region zd
  registerTextAlias(api, /^zd(?:\s+(.+))?$/, 'zdziw sie');

  const info: PluginInfo = {
    name: 'Jens Emocje',
    version: '0.1.0',
    description: 'Emote aliases',
  };
  api.output.print(`[${info.name} v${info.version}] loaded`);
  return info;
}
