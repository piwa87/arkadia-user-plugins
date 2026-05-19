import type { PluginApi } from '@arkadia/plugin-types';

export function setupFatigue(api: PluginApi): () => void {
  const tag = 'ra:fatigue';

  api.triggers.register(
    /^Rozgladasz sie energicznie, a twoje pelne werwy spojrzenie nie pozostawia watpliwosci co do tego, ze jestes (.*) i gotow[a-z] do dalszej drogi/,
    (_line, matches) => {
      if (!matches) return null;
      api.output.print(`\nTwoje zmeczenie --->  <green>${matches[1].toUpperCase()}\n`);
      return null;
    },
    tag,
  );

  api.triggers.register(
    /^Pochylasz sie opierajac swe dlonie na kolanach, by zaczerpnac tchu, a twoja strudzona mina wyraznie wskazuje, ze jestes (.*)$/,
    (_line, matches) => {
      if (!matches) return null;
      api.output.print(`\nTwoje zmeczenie --->  <yellow>${matches[1].toUpperCase()}\n`);
      return null;
    },
    tag,
  );

  api.triggers.register(
    /^Wzdychajac gleboko starasz sie zaczerpnac nieco nieco tchu i wyrownac ciezki oddech wyraznie sugerujacy, iz jestes (.*)$/,
    (_line, matches) => {
      if (!matches) return null;
      api.output.print(`\nTwoje zmeczenie --->  <yellow>${matches[1].toUpperCase()}\n`);
      return null;
    },
    tag,
  );

  api.triggers.register(
    /^Oddychajac plytko przykladasz dlon do skroni ocierajac z niej kilka kropel potu wyraznie sugerujacych, ze jestes (.*)$/,
    (_line, matches) => {
      if (!matches) return null;
      api.output.print(`\nTwoje zmeczenie --->  <yellow>${matches[1].toUpperCase()}\n`);
      return null;
    },
    tag,
  );

  api.triggers.register(
    /^(.*) oznajmiasz, ze (opadles|opadlas) kompletnie z sil, po czym (.*) zginasz sie w pol/,
    (_line, matches) => {
      if (!matches) return null;
      api.output.print(`\nTwoje zmeczenie --->  <red>${matches[3].toUpperCase()}\n`);
      return null;
    },
    tag,
  );

  api.triggers.register(
    /^(.*) rozglada sie energicznie, a (jego|jej) pelne werwy spojrzenie nie pozostawia watpliwosci co to tego, ze jest (.*) i (gotowy|gotowa) do dalszej drogi/,
    (_line, matches) => {
      if (!matches) return null;
      api.output.print(`\nZmeczenie --->  <grey>${matches[1]} --->  <green>${matches[3].toUpperCase()}\n`);
      return null;
    },
    tag,
  );

  api.triggers.register(
    /^(.*) wzdycha gleboko starajac sie zaczerpnac nieco tchu i wyrownac ciezki oddech, ktory wyraznie sugeruje, ze jest (.*)$/,
    (_line, matches) => {
      if (!matches) return null;
      api.output.print(`\nZmeczenie --->  <grey>${matches[1]} --->  <yellow>${matches[2].toUpperCase()}\n`);
      return null;
    },
    tag,
  );

  api.triggers.register(
    /^(.*) oddychajac plytko przyklada dlon do skroni ocierajac z niej kilka kropel potu sugerujacych, ze jest (.*)$/,
    (_line, matches) => {
      if (!matches) return null;
      api.output.print(`\nZmeczenie --->  <grey>${matches[1]} --->  <yellow>${matches[2].toUpperCase()}\n`);
      return null;
    },
    tag,
  );

  api.triggers.register(
    /^(.*) ciezkim sapaniem oznajmia, ze (opadl|opadla) kompletnie z sil, po czym (.*) zgina sie w pol/,
    (_line, matches) => {
      if (!matches) return null;
      api.output.print(`\nZmeczenie --->  <grey>${matches[1]} --->  <red>${matches[3].toUpperCase()}\n`);
      return null;
    },
    tag,
  );

  api.triggers.register(
    /^(.*) pochyliwszy sie opiera swe dlonie na kolanach, by zaczerpnac tchu, a po j(ego|ej) strudzona minie mozesz wywnioskowac, ze jest (.*)$/,
    (_line, matches) => {
      if (!matches) return null;
      api.output.print(`\nZmeczenie --->  <grey>${matches[1]} --->  <red>${matches[3].toUpperCase()}\n`);
      return null;
    },
    tag,
  );

  api.triggers.register(
    /wykonuje gesty oznaczajace "gotow" i "pytanie"\.$/,
    (line) => {
      api.bind.set('snprzekaz gotow');
      return line;
    },
    tag,
  );

  return () => {
    api.triggers.removeByTag(tag);
  };
}
