import type { PluginApi } from '@arkadia/plugin-types';

export function setupDobywanieAliases(api: PluginApi): void {
  // #region opu - sheathe all weapons and sling shield
  api.aliases.register(/^opu$/, () => {
    api.command.send('wloz maczuge do swojego temblaka');
    api.command.send('wloz topor do swojego temblaka');
    api.command.send('wloz miecz do nitowanej pochwy');
    api.command.send('gzzarzuc zalozona tarcze');
    api.command.send('otu');
    return true;
  });

  // #region skift - swap worn shield for one from bag
  api.aliases.register(/^skift$/, () => {
    api.command.send('ot');
    api.command.send('wyj tarcze');
    api.command.send('zdejmij tarcze');
    api.command.send('wlz ja');
    api.command.send('zaloz tarcze');
    api.command.send('zt');
    return true;
  });

  // #region opus - sheathe dagger into ornate scabbard
  api.aliases.register(/^opus$/, () => {
    api.command.send('powsun sztylet do wyszukanej pochwy');
    return true;
  });

  // #region dobs - draw dagger from ornate scabbard
  api.aliases.register(/^dobs$/, () => {
    api.command.send('podobadz sztyletu z wyszukanej pochwy');
    return true;
  });

  // #region dobm - draw sword from riveted scabbard
  api.aliases.register(/^dobm$/, () => {
    api.command.send('wez miecz z nitowanej pochwy');
    api.command.send('dobadz miecza');
    api.command.send('zaloz tarcze');
    return true;
  });

  // #region dobmc - draw mace from sling
  api.aliases.register(/^dobmc$/, () => {
    api.command.send('wez maczuge ze swojego temblaka');
    api.command.send('dobadz maczugi');
    api.command.send('gzzdejmij');
    api.command.send('zaloz tarcze');
    return true;
  });

  // #region dobt - draw axe from sling
  api.aliases.register(/^dobt$/, () => {
    api.command.send('wez topor ze swojego temblaka');
    api.command.send('dobadz topora');
    api.command.send('gzzdejmij');
    api.command.send('zaloz tarcze');
    return true;
  });

  // #region db - shorthand for dob
  api.aliases.register(/^db$/, () => {
    api.command.send('dob');
    return true;
  });

  // #region skifb1 - sheathe all then redraw with weapon slot 1
  api.aliases.register(/^skifb1$/, () => {
    api.command.send('opu');
    api.command.send('dob1');
    api.command.send('dob');
    return true;
  });

  // #region dobny - re-arm after weapon break
  api.aliases.register(/^dobny$/, () => {
    api.command.send('odloz zlamane bronie');
    api.command.send('podobadz miecza z nitowanej pochwy');
    api.command.send('wyj miecz');
    api.command.send('dobadz miecza');
    api.command.send('dobadz topora');
    return true;
  });

  // #region zb! - toggle armor on/off
  {
    let czyZb = true;

    api.aliases.register(/^zb!$/, () => {
      if (!czyZb) {
        api.command.send('wlz kapelusz');
        api.command.send('wyj wszystkie zbroje');
        api.command.send('zaloz je');
        czyZb = true;
      } else {
        api.command.send('wlz wszystkie zbroje');
        api.command.send('wyj kapelusz');
        api.command.send('zaloz kapelusz');
        api.command.send('przekrzyw kapelusz nonszalancko');
        czyZb = false;
      }
      return true;
    });
  }

  // #region nytarcz - replace broken shield
  api.aliases.register(/^nytarcz$/, () => {
    api.command.send('odloz zniszczona tarcze');
    api.command.send('ot');
    api.command.send('wyj tarcze');
    api.command.send('zaloz tarcze');
    return true;
  });

  // #region macka! - take, evaluate, and drop a one-handed mace
  api.aliases.register(/^macka!$/, () => {
    api.command.send('we jednoreczna maczuge');
    api.command.send('ocen ja');
    api.command.send('odloz ja');
    return true;
  });

  // #region miecz! - take, evaluate, and drop a one-handed sword
  api.aliases.register(/^miecz!$/, () => {
    api.command.send('we jednoreczny miecz');
    api.command.send('ocen go');
    api.command.send('odloz go');
    return true;
  });
}
