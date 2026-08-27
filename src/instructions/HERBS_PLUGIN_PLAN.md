# Herbs Plugin Plan

## Goal

Build a plugin helper/alias flow that can identify herbs with no real game use, pull them out of the herb bags, and sell or discard them automatically.

## What the current API already gives us

The plugin API exposes herb inventory and herb metadata through `api.herbs`:

```ts
const bags = api.herbs.getBags();
const data = await api.herbs.getData();
```

The important part is that `data.herb_id_to_use` contains the herb use/effect definitions. That is enough to distinguish truly functional herbs from filler herbs.

## How to classify a herb as “functional”

A herb should count as functional if it has at least one real use entry, not just smoke markers or empty placeholders.

In the current data model, the relevant shape is:

```ts
interface HerbUse {
  action: string;
  effect: string;
  dont_bind?: boolean;
  smokable?: boolean;
}
```

The safe rule for a plugin is:

- ignore entries where `smokable === true`
- ignore entries with missing `action` or `effect`
- consider the herb functional if at least one remaining entry is real

This gives a plugin-local rule like:

```ts
function isFunctionalHerb(uses: HerbUse[] | undefined): boolean {
  return !!uses?.some(
    (use) => !use.smokable && !!use.action && !!use.effect
  );
}
```

Any herb whose use list fails this check can be treated as dispensable filler.

## Working with bag state

`api.herbs.getBags()` returns a structure like:

```ts
Record<number, {
  herbs: Record<string, number>;
  condition?: number;
}>
```

That means a plugin can iterate each bag, inspect each herb id, and compare it against the metadata database.

## Planned workflow for a sell-all-junk alias

1. Load the herb database via `api.herbs.getData()`.
2. Build a set of junk herb ids using the rule above.
3. Iterate all herb bags with `api.herbs.getBags()`.
4. For each bag, for each herb in that bag:
   - if the herb id is in the junk set, take it out
   - send the sell command for that herb
5. Repeat until all matching junk herbs are removed.

Pseudo-code:

```ts
const data = await api.herbs.getData();
if (!data) return;

const junkHerbs = new Set<string>();
for (const [herbId, uses] of Object.entries(data.herb_id_to_use)) {
  const hasRealUse = (uses ?? []).some(
    (use) => !use.smokable && !!use.action && !!use.effect
  );

  if (!hasRealUse) {
    junkHerbs.add(herbId);
  }
}

const bags = api.herbs.getBags();
for (const [bagNum, bag] of Object.entries(bags)) {
  const bagId = Number(bagNum);
  if (!Number.isFinite(bagId)) continue;

  for (const [herbId, count] of Object.entries(bag.herbs)) {
    if (!junkHerbs.has(herbId) || count <= 0) continue;

    const taken = await api.herbs.take(herbId, count, bagId);
    if (taken > 0) {
      await api.command.send(`sprzedaj ${herbId}`);
    }
  }
}
```

## Important caveat

There is no built-in `api.herbs.sell()` or `api.herbs.getUseless()` method in the current plugin API. The plugin has to define its own logic based on the herb metadata.

So the real implementation is:

- choose a “junk herb” rule in the plugin
- use `api.herbs.getData()` to classify herbs
- use `api.herbs.take()` to remove them from inventory
- use `api.command.send()` to sell or discard them

## Recommended rule for practical use

For a plugin that tries to clear useless herbs from bags, the recommended rule is:

> Herbs are junk if they have no real non-smokable action/effect entry.

That is the least risky and easiest-to-explain definition.

## Example alias idea

```ts
api.aliases.register(/^sprzedajZiola$/i, async () => {
  const data = await api.herbs.getData();
  if (!data) {
    api.output.print("Brak danych zioł.");
    return true;
  }

  const junkHerbs = new Set<string>();
  for (const [herbId, uses] of Object.entries(data.herb_id_to_use)) {
    const hasRealUse = (uses ?? []).some(
      (use) => !use.smokable && !!use.action && !!use.effect
    );

    if (!hasRealUse) {
      junkHerbs.add(herbId);
    }
  }

  const bags = api.herbs.getBags();
  for (const [bagNum, bag] of Object.entries(bags)) {
    const bagId = Number(bagNum);
    if (!Number.isFinite(bagId)) continue;

    for (const [herbId, count] of Object.entries(bag.herbs)) {
      if (!junkHerbs.has(herbId) || count <= 0) continue;
      await api.herbs.take(herbId, count, bagId);
      await api.command.send(`sprzedaj ${herbId}`);
    }
  }

  return true;
});
```

## Conclusion

Yes — using `api.herbs.getData()` and checking `herb_id_to_use` is the correct solution for this. The plugin has enough information to separate functional herbs from junk herbs and automate the “take + sell” flow without needing a custom data source.
