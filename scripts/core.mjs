const MODULE_ID = "activities-extended-5e";

Hooks.on("renderActivitySheet", (app, html, context, options) => {

    const effectsSection = html.querySelector(".effects-list");
    if (!effectsSection) {
        return;
    }

    const effectsListRaw = app.document.effects
    if (!effectsListRaw || effectsListRaw.length === 0) {
        return;
    }
    const effectsList = effectsListRaw.map(e => e.effect);

    const key = "applyToSelf";

    const defaultValue = false;

    for (const effectElement of effectsSection.children) {

        // Get effect
        const effect = effectsList.find(e => e.id === effectElement.getAttribute("data-effect-id"));
        if (!effect) continue;

        const checkbox = dnd5e.applications.fields.createCheckboxInput(null, {
            name: `${MODULE_ID}.${key}`,
            value: effect.getFlag(MODULE_ID, key) ?? defaultValue,
        });

        checkbox.addEventListener("change", (event) => {
            const value = event.target.checked;
            effect.setFlag(MODULE_ID, key, value)
        });

        const group = foundry.applications.fields.createFormGroup({
            label: "Apply to self",
            hint: "If this is checked, the effect will apply to the actor using the activity itself.",
            input: checkbox,
        });

        effectElement.insertAdjacentElement("beforeend", group);
    }

});

Hooks.on("dnd5e.postUseActivity", async (activity, usageConfig, results) => {

    // Check if the activity has effects
    if (!activity.effects || activity.effects.length === 0) {
        return;
    }

    // Get the effects that should apply to self
    const effectsToApply = activity.effects.filter(e => {
        const effect = e.effect;
        if (!effect) return false;

        // Check if the effect has the applyToSelf flag set to true
        return effect.getFlag(MODULE_ID, "applyToSelf") === true;
    }).map(e => e.effect);

    // Apply the effects to the actor
    const actor = activity.parent.parent.parent;
    for (const effect of effectsToApply) {
        const effectData = effect.toObject();
        // TODO: create field to optionally tie the effect to concentration (for now it will always be tied to concentration)
        const concentrationEffect = results.effects.find(e => e.statuses.has("concentrating"));
        if (concentrationEffect) {
            effectData.origin = concentrationEffect.uuid;
            const createdEffect = await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
            let dependentsFlag = concentrationEffect.getFlag("dnd5e", "dependents") || [];
            dependentsFlag.push({ uuid: createdEffect[0].uuid });
            await concentrationEffect.setFlag("dnd5e", "dependents", dependentsFlag);
        } else {
            effectData.origin = activity.uuid; // TODO: not sure if this is the correct origin
            await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
        }
    }

});

// TODO: Remove effect from chat message when applied to self
// TODO: Put "apply to self" checkbox in the additional settings panel of the activity or create a new panel with other settings possibly

// TODO: localize