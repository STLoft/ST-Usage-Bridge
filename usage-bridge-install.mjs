import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// This script lives in the plugin's own folder: SillyTavern/plugins/<folder>.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TARGET = path.join(ROOT, 'src', 'endpoints', 'backends', 'chat-completions.js');
const BACKUP = TARGET + '.usage-bridge-backup';

const START_MARKER = '/* Usage Bridge hook start */';
const END_MARKER = '/* Usage Bridge hook end */';

const CONFIG = path.join(ROOT, 'config.yaml');

// Server plugins are off by default; turn the switch on so the plugin loads.
function enableServerPlugins() {
    if (!fs.existsSync(CONFIG)) {
        console.log('[Usage Bridge] config.yaml이 아직 없습니다. SillyTavern을 한 번 실행한 뒤 enableServerPlugins: true 로 바꿔 주세요.');
        return;
    }

    const config = fs.readFileSync(CONFIG, 'utf8');
    const setting = /^([ \t]*enableServerPlugins[ \t]*:[ \t]*)(true|false)\b/m;
    const match = config.match(setting);

    if (match?.[2] === 'true') {
        console.log('[Usage Bridge] 서버 플러그인이 이미 켜져 있습니다.');
        return;
    }

    const eol = config.includes('\r\n') ? '\r\n' : '\n';
    const updated = match
        ? config.replace(setting, '$1true')
        : config + (config.endsWith('\n') || !config ? '' : eol) + 'enableServerPlugins: true' + eol;

    fs.writeFileSync(CONFIG, updated, 'utf8');
    console.log('[Usage Bridge] config.yaml에서 서버 플러그인을 켰습니다 (enableServerPlugins: true).');
}

function fail(message) {
    console.error('\n[Usage Bridge] 설치 실패:', message);
    process.exitCode = 1;
}

if (!fs.existsSync(TARGET)) {
    fail(`대상 파일을 찾을 수 없습니다:\n${TARGET}\n\n이 폴더가 SillyTavern/plugins 안에 있는지 확인하세요.`);
} else {
    let source = fs.readFileSync(TARGET, 'utf8');

    if (source.includes(START_MARKER)) {
        console.log('[Usage Bridge] 이미 코어 후크가 설치되어 있습니다. 변경하지 않았습니다.');
    } else {
        const functionStart = source.indexOf('async function sendMakerSuiteRequest(request, response)');
        const functionEnd = source.indexOf('async function sendAI21Request(request, response)', functionStart);

        if (functionStart < 0 || functionEnd < 0) {
            fail('현재 SillyTavern 버전에서 Gemini 처리 함수를 찾지 못했습니다. 파일은 변경하지 않았습니다.');
        } else {
            const region = source.slice(functionStart, functionEnd);
            const match = region.match(/^[ \t]*const generateResponseJson = await generateResponse\.json\(\);/m);

            if (!match || match.index === undefined) {
                fail('현재 SillyTavern 버전에서 usage 삽입 위치를 찾지 못했습니다. 파일은 변경하지 않았습니다.');
            } else {
                if (!fs.existsSync(BACKUP)) {
                    fs.copyFileSync(TARGET, BACKUP);
                    console.log('[Usage Bridge] 원본 백업 생성:', BACKUP);
                }

                const line = match[0];
                const indent = line.match(/^[ \t]*/)?.[0] || '';
                const absolute = functionStart + match.index + line.length;

                const hook = `

${indent}${START_MARKER}
${indent}globalThis.__USAGE_BRIDGE_CAPTURE__?.({
${indent}    userHandle: request.user?.profile?.handle,
${indent}    usageMetadata: generateResponseJson?.usageMetadata,
${indent}    model,
${indent}    api: useVertexAi ? 'vertexai' : 'makersuite',
${indent}    capturedAt: Date.now(),
${indent}});
${indent}${END_MARKER}`;

                source = source.slice(0, absolute) + hook + source.slice(absolute);
                fs.writeFileSync(TARGET, source, 'utf8');

                console.log('[Usage Bridge] 코어 후크 설치 완료.');
                console.log('[Usage Bridge] SillyTavern을 재시작하세요.');
            }
        }
    }
}

if (!process.exitCode) enableServerPlugins();
