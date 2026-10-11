'use strict';

const BRIDGE_GLOBAL = '__ST_USAGE_BRIDGE_CAPTURE__';
const MAX_QUEUE = 40;
const ENTRY_TTL_MS = 10 * 60 * 1000;

/** @type {Map<string, Array<any>>} */
const queues = new Map();

function userKey(value) {
    const key = String(value || '').trim();
    return key || 'default-user';
}

function cleanQueue(key) {
    const now = Date.now();
    const queue = queues.get(key) || [];
    const fresh = queue.filter(entry => now - Number(entry.capturedAt || 0) <= ENTRY_TTL_MS);

    if (fresh.length) {
        queues.set(key, fresh.slice(-MAX_QUEUE));
    } else {
        queues.delete(key);
    }

    return queues.get(key) || [];
}

function finiteToken(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : null;
}

function normalizeGeminiUsage(usageMetadata, payload = {}) {
    if (!usageMetadata || typeof usageMetadata !== 'object') return null;

    const input = finiteToken(usageMetadata.promptTokenCount);
    const output = finiteToken(usageMetadata.candidatesTokenCount);
    const thinking = finiteToken(usageMetadata.thoughtsTokenCount);
    const total = finiteToken(usageMetadata.totalTokenCount);

    if (input === null && output === null && thinking === null && total === null) {
        return null;
    }

    return {
        input,
        output,
        thinking,
        total,

        hasInput: input !== null,
        hasOutput: output !== null,
        hasThinking: thinking !== null,
        hasTotal: total !== null,

        totalDerived: false,
        thinkingRelation: 'separate',
        format: 'gemini',

        model: String(payload.model || ''),
        api: String(payload.api || ''),
        capturedAt: Number(payload.capturedAt || Date.now()),
    };
}

function capture(payload = {}) {
    try {
        const usage = normalizeGeminiUsage(payload.usageMetadata, payload);
        if (!usage) return false;

        const key = userKey(payload.userHandle);
        const queue = cleanQueue(key);

        queue.push({
            usage,
            model: usage.model,
            api: usage.api,
            capturedAt: usage.capturedAt,
        });

        if (queue.length > MAX_QUEUE) {
            queue.splice(0, queue.length - MAX_QUEUE);
        }

        queues.set(key, queue);

        console.debug(
            '[ST Usage Bridge] captured:',
            key,
            {
                input: usage.input,
                output: usage.output,
                thinking: usage.thinking,
                total: usage.total,
                model: usage.model,
                api: usage.api,
            },
        );

        return true;
    } catch (error) {
        console.warn('[ST Usage Bridge] capture failed:', error);
        return false;
    }
}

function resolveRequestUser(req) {
    return userKey(
        req?.user?.profile?.handle ||
        req?.user?.profile?.name ||
        req?.user?.handle,
    );
}

function modelMatches(entryModel, requestedModel) {
    if (!requestedModel) return true;

    const a = String(entryModel || '').toLowerCase();
    const b = String(requestedModel || '').toLowerCase();

    if (!a || !b) return true;
    return a === b || a.includes(b) || b.includes(a);
}

async function init(router) {
    globalThis[BRIDGE_GLOBAL] = capture;

    router.get('/status', (req, res) => {
        const key = resolveRequestUser(req);
        const queue = cleanQueue(key);

        res.json({
            ok: true,
            id: 'st-usage-bridge',
            version: '1.3.1',
            user: key,
            queued: queue.length,
        });
    });

    router.get('/claim', (req, res) => {
        const key = resolveRequestUser(req);
        const queue = cleanQueue(key);
        const requestedModel = String(req.query?.model || '');

        if (!queue.length) {
            return res.sendStatus(204);
        }

        // maxAge/minAge (ms before now) limit the claim to usage captured while the
        // asking reply was generating, so another request's usage is never handed out.
        const maxAge = Number(req.query?.maxAge);
        const minAge = Number(req.query?.minAge) || 0;
        let index;

        if (Number.isFinite(maxAge) && maxAge > 0) {
            const now = Date.now();
            const inWindow = entry => {
                const age = now - Number(entry.capturedAt || 0);
                return age <= maxAge && age >= minAge;
            };

            // The reply's own response is the last one captured in its window.
            index = queue.findLastIndex(entry =>
                inWindow(entry) && modelMatches(entry.model, requestedModel)
            );

            if (index < 0) index = queue.findLastIndex(inWindow);
            if (index < 0) return res.sendStatus(204);
        } else {
            index = queue.findIndex(entry =>
                modelMatches(entry.model, requestedModel)
            );

            if (index < 0) index = 0;
        }

        const [entry] = queue.splice(index, 1);

        if (queue.length) {
            queues.set(key, queue);
        } else {
            queues.delete(key);
        }

        return res.json({
            ok: true,
            usage: entry.usage,
        });
    });

    router.post('/clear', (req, res) => {
        const key = resolveRequestUser(req);
        queues.delete(key);
        return res.json({ ok: true });
    });

    console.log('[ST Usage Bridge] v1.3.1 loaded');
}

async function exit() {
    if (globalThis[BRIDGE_GLOBAL] === capture) {
        delete globalThis[BRIDGE_GLOBAL];
    }

    queues.clear();
}

module.exports = {
    init,
    exit,
    info: {
        id: 'st-usage-bridge',
        name: 'ST Usage Bridge',
        description: 'Bridges Gemini/Vertex token usage metadata to the ST Message Meta UI extension.',
    },
};
