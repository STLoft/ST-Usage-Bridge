# ST Usage Bridge

SillyTavern 서버 플러그인입니다. Gemini / Vertex AI에 직접 연결해 답장을 받을 때, 브라우저에서는 볼 수 없는 원본 `usageMetadata`(Input / Output / Thinking / Total 토큰)를 잠시 보관했다가 [ST Message Meta](https://github.com/STLoft/Message-Meta) 확장이 가져가 메시지별로 표시할 수 있게 합니다.

다른 연결 방식은 응답에 사용량이 들어 있어 ST Message Meta만으로 표시됩니다. 이 플러그인은 Gemini / Vertex AI 직접 연결에서 상세 사용량을 보고 싶을 때만 설치하면 됩니다.

## 설치

SillyTavern을 **완전히 종료한 상태**에서 진행합니다.

SillyTavern 최상위 폴더(`Start.bat`가 있는 곳)에서 터미널을 열고 아래 한 줄을 실행합니다.

```bash
git clone https://github.com/STLoft/Usage-Bridge plugins/Usage-Bridge && node plugins/Usage-Bridge/st-usage-bridge-install.mjs
```

Windows PowerShell에서 `&&` 오류가 나면 `&&`를 `;`로 바꿔 실행하세요.

Termux(안드로이드)에서는 SillyTavern 폴더로 먼저 이동한 뒤 같은 명령을 실행합니다. 폴더 위치가 다르면 `~/SillyTavern`만 바꾸세요.

```bash
cd ~/SillyTavern && git clone https://github.com/STLoft/Usage-Bridge plugins/Usage-Bridge && node plugins/Usage-Bridge/st-usage-bridge-install.mjs
```

이 명령은 세 가지를 합니다.

- 플러그인을 `plugins/Usage-Bridge`에 받습니다.
- `src/endpoints/backends/chat-completions.js`에 Gemini 응답의 `usageMetadata`를 플러그인으로 넘기는 작은 후크를 추가합니다. 처음 설치할 때 원본을 `chat-completions.js.st-usage-backup`으로 백업하고, 코드 구조가 예상과 다르면 아무것도 바꾸지 않고 멈춥니다.
- `config.yaml`의 `enableServerPlugins`를 `true`로 바꿉니다. 이미 켜져 있으면 건드리지 않습니다.

그다음 SillyTavern을 다시 실행합니다. 서버 콘솔에 아래 문구가 보이면 로드된 것입니다.

```text
[ST Usage Bridge] v1.3.1 loaded
```

`--global` 모드처럼 `config.yaml`이 설치 폴더 밖에 있으면 그 파일에서 `enableServerPlugins: true`로 직접 바꿔 주세요. 이미 폴더를 받아 둔 경우에는 `install_ST_Usage_Bridge.bat`(Termux 등에서는 `node plugins/Usage-Bridge/st-usage-bridge-install.mjs`)만 실행해도 됩니다.

## 점검

`check_ST_Usage_Bridge.bat`(Termux 등에서는 `node plugins/Usage-Bridge/st-usage-bridge-check.mjs`)를 실행하면 `config.yaml`, 플러그인, UI 확장, 코어 후크 설치 여부를 보여 줍니다.

브라우저 개발자도구 Console에서도 확인할 수 있습니다.

```js
fetch('/api/plugins/st-usage-bridge/status').then(r => r.json()).then(console.log)
```

## 업데이트

`plugins/Usage-Bridge` 폴더에서 `git pull` 한 뒤 SillyTavern을 재시작합니다. `config.yaml`의 `enableServerPluginsAutoUpdate`가 켜져 있으면 시작할 때 자동으로 갱신됩니다.

SillyTavern을 업데이트하면 `chat-completions.js`가 교체되어 코어 후크가 사라질 수 있습니다. 상세 사용량이 더 이상 들어오지 않으면 SillyTavern을 종료하고 `install_ST_Usage_Bridge.bat`(Termux 등에서는 `node plugins/Usage-Bridge/st-usage-bridge-install.mjs`)를 다시 실행하세요.

## 제거

SillyTavern을 종료하고 `uninstall_ST_Usage_Bridge.bat`(Termux 등에서는 `node plugins/Usage-Bridge/st-usage-bridge-uninstall.mjs`)를 실행해 코어 후크를 제거한 뒤 `plugins/Usage-Bridge` 폴더를 삭제합니다.

## 참고

- 플러그인은 토큰 수와 모델 이름만, 확장이 가져갈 때까지 잠시 메모리에 둡니다(사용자별 최대 40개, 가져가지 않은 값은 10분 뒤 버림).
- 확장이 가져간 사용량은 그 메시지와 함께 채팅에 저장되므로, 시간이 지난 메시지에서도 계속 볼 수 있습니다.
- 모델이 응답에 넣어 주지 않은 항목(예: Thinking)은 팝업에서 그 줄만 빠집니다.
