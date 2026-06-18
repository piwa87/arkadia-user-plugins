import type { PluginApi } from '@arkadia/plugin-types';
import { registerTextAlias } from '../../../lib/registerTextAlias';

export function setupEmoteAliases(api: PluginApi): void {
  // #region ce
  api.aliases.register(/^ce$/, () => {
    const daylight = api.gmcp.get().room?.time?.daylight;
    const greeting = daylight ? 'Buongiorno' : 'Buonasera';
    api.command.send(`powiedz ${greeting}`);
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
  registerTextAlias(api, /^krz1$/, 'pkrzyknij glosno Z A S L A N I A C !');

  // #region krz2
  registerTextAlias(api, /^krz2$/, 'pkrzyknij gromko L A M A C !');

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
}
