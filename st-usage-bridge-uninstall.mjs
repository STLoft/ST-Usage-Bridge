import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// This script lives in the plugin's own folder: SillyTavern/plugins/<folder>.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TARGET = path.join(ROOT, 'src', 'endpoints', 'backends', 'chat-completions.js');

const START_MARKER = '/* ST Usage Bridge hook start */';
const END_MARKER = '/* ST Usage Bridge hook end */';

if (!fs.existsSync(TARGET)) {
    console.error('[ST Usage Bridge] 대상 파일을 찾을 수 없습니다:', TARGET);
    process.exitCode = 1;
} else {
    let source = fs.readFileSync(TARGET, 'utf8');
    const start = source.indexOf(START_MARKER);
    const end = source.indexOf(END_MARKER, start);

    if (start < 0 || end < 0) {
        console.log('[ST Usage Bridge] 설치된 코어 후크가 없습니다.');
    } else {
        const lineStart = source.lastIndexOf('\n', start);
        const lineEnd = source.indexOf('\n', end + END_MARKER.length);
        let removeFrom = lineStart >= 0 ? lineStart : start;
        // The installer puts one blank line before the hook.
        if (lineStart > 0 && source[lineStart - 1] === '\n') removeFrom = lineStart - 1;
        const removeTo = lineEnd >= 0 ? lineEnd : end + END_MARKER.length;

        source = source.slice(0, removeFrom) + source.slice(removeTo);
        fs.writeFileSync(TARGET, source, 'utf8');

        console.log('[ST Usage Bridge] 코어 후크 제거 완료.');
        console.log('플러그인/브라우저 확장 폴더는 필요하면 수동 삭제하세요.');
    }
}
