import type { PluginApi } from '@arkadia/plugin-types';

export function setupKurhanyTilea(api: PluginApi): () => void {
  const tag = 'ra:kurhany-tilea';

  const kruczowlosaPattern = /^[ >]*(?:Zabiles potezna kruczowlosa zjawe\.|[a-zA-Z !(),]+ zabil potezna kruczowlosa zjawe\.)$/;
  api.triggers.register(
    kruczowlosaPattern,
    (line) => {
      api.bind.set(null, () => {
        api.command.send('otworz sarkofag');
        api.command.send('wez naramienniki');
        api.command.send('wloz je do sarkofagu');
        api.command.send('wez napiersnik');
        api.command.send('wloz go do sarkofagu');
        api.command.send('wez nagolenniki');
        api.command.send('wloz je do sarkofagu');
        api.command.send('wez topor');
        api.command.send('wloz go do sarkofagu');
        api.command.send('wez miecz');
        api.command.send('wloz go do sarkofagu');
        api.command.send('wez ciezki helm z rogami');
        api.command.send('wloz go do sarkofagu');
        api.command.send('wez cwiekowana kolcza pare spodni');
        api.command.send('wloz ja do sarkofagu');
        api.command.send('sp');
      });
      return line;
    },
    tag
  );

  const rozwscieczonaPattern = /^[ >]*(?:Zabiles straszliwa rozwscieczona zjawe\.|[a-zA-Z !(),]+ zabil straszliwa rozwscieczona zjawe\.)$/;
  api.triggers.register(
    rozwscieczonaPattern,
    (line) => {
      api.bind.set(null, () => {
        api.command.send('otworz sarkofag');
        api.command.send('wez buzdygan');
        api.command.send('wloz go do sarkofagu');
        api.command.send('wez napiersnik');
        api.command.send('wloz go do sarkofagu');
        api.command.send('wez tarcze');
        api.command.send('wloz ja do sarkofagu');
        api.command.send('wez nagolenniki');
        api.command.send('wloz je do sarkofagu');
        api.command.send('wez kolczasta pare naramiennikow');
        api.command.send('wloz ja do sarkofagu');
        api.command.send('sp');
      });
      return line;
    },
    tag
  );

  const okrutnaPattern = /^[ >]*(?:Zabiles potworna okrutna zjawe\.|[a-zA-Z !(),]+ zabil potworna okrutna zjawe\.)$/;
  api.triggers.register(
    okrutnaPattern,
    (line) => {
      api.bind.set(null, () => {
        api.command.send('otworz sarkofag');
        api.command.send('wez miecz');
        api.command.send('wloz go do sarkofagu');
        api.command.send('wez napiersnik');
        api.command.send('wloz go do sarkofagu');
        api.command.send('wez tarcze');
        api.command.send('wloz ja do sarkofagu');
        api.command.send('wez ciezki helm z rogami');
        api.command.send('wloz go do sarkofagu');
        api.command.send('wez nagolenniki');
        api.command.send('wloz je do sarkofagu');
        api.command.send('wez cwiekowana kolcza pare spodni');
        api.command.send('wloz ja do sarkofagu');
        api.command.send('sp');
      });
      return line;
    },
    tag
  );

  return () => {
    api.triggers.removeByTag(tag);
  };
}
