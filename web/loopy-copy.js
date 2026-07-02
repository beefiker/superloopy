(function(){
  var startedAt = Date.now();
  var maxPatchWindow = 16000;
  var applying = false;
  var shellId = 'loopy-shell';
  var linksWired = false;
  var touchStartY = null;
  var targetView = null;
  var transitionTimer = null;
  var transitionFrame = null;
  var viewSwitchTimer = null;
  var anchorLockTimer = null;
  var queuedView = null;
  var edgeTimer = null;
  var readyRevealTimer = null;
  var loaderProgressObserver = null;
  var loaderProgressTimer = null;
  var transitioning = false;
  var lastWheelAt = 0;
  var languageMenuOpen = false;
  var orbitPrewarmState = 'idle';
  var activeTransitionLog = null;
  var demoRevealTimers = [];

  var views = ['hero', 'eye', 'demo'];
  var languages = [
    { code: 'en', short: 'EN', nativeName: 'English' },
    { code: 'ko', short: 'KO', nativeName: '한국어' },
    { code: 'ja', short: 'JA', nativeName: '日本語' },
    { code: 'zh', short: 'ZH', nativeName: '简体中文' },
    { code: 'es', short: 'ES', nativeName: 'Español' }
  ];

  var copyByLang = {
    en: {
      title: 'Superloopy | Done means proven',
      description: 'Superloopy is a plugin for Codex and Claude Code that makes agent work finish with a plan, a check, and inspectable evidence.',
      imageAlt: 'Superloopy dark-purple evidence loop orbit',
      brand: 'Loopy',
      navProof: 'Proof',
      navDemo: 'Demo',
      navInstall: 'Install',
      language: 'Language',
      cueProduct: 'Superloopy for agent work',
      flowLabel: 'A proof loop in four moves',
      installIntro: 'Install once, then start any Codex or Claude Code task with loopy.',
      copyAction: 'Copy',
      copiedAction: 'Copied',
      heroLabel: 'Codex and Claude Code',
      heroTitle: 'Agents finish with proof.',
      heroText: 'Type loopy before any Codex or Claude Code task. Superloopy turns the run into a visible loop: plan, edit, check, evidence.',
      install: 'Install the plugin',
      proofCta: 'See the loop',
      terminalLabel: 'Loopy command proof transcript',
      terminalCommand: 'loopy add the payments module',
      terminalPlan: 'goals.json',
      terminalProof: '.superloopy/evidence/',
      terminalGate: 'proof required',
      phasesLabel: 'Loop phases',
      phasePlan: 'Ask once',
      phasePlanText: 'start with loopy and a task',
      phaseBuild: 'Work narrow',
      phaseBuildText: 'edit only the scoped files',
      phaseReview: 'Check it',
      phaseReviewText: 'run the smallest useful validation',
      phaseVerify: 'Leave proof',
      phaseVerifyText: 'finish with artifacts, not vibes',
      eyeLabel: 'Evidence gate',
      eyeTitle: 'No proof, no done.',
      eyeText: 'Loopy changes the agent finish line. If there is no artifact under .superloopy/evidence, the loop stays open.',
      github: 'Open GitHub',
      demoCta: 'View demo',
      backStart: 'Back to first orbit',
      skillsLabel: 'Superloopy skills',
      skillLoop: '1. Plan',
      skillLoopText: 'turns the brief into criteria',
      skillFrontend: '2. Build',
      skillFrontendText: 'keeps edits scoped to the task',
      skillResearch: '3. Prove',
      skillResearchText: 'captures commands, screenshots, or files',
      skillClone: '4. Gate',
      skillCloneText: 'blocks completion when proof is missing',
      commandLabel: 'Install commands',
      crewLabel: 'Proof signals',
      crewTests: 'tests',
      crewBrowser: 'browser QA',
      crewDiffs: 'diffs',
      crewScreens: 'screenshots',
      crewNotes: 'gate JSON',
      demoLabel: 'Real demo',
      demoTitle: 'Real output. Real evidence.',
      demoText: 'The README demo rebuilt Transferloom locally, kept assets local, and passed desktop plus mobile browser checks. The output is visible and the proof is inspectable.',
      demoPromptLabel: 'Demo target',
      demoPrompt: 'Transferloom.com clone reference, rebuilt locally with browser validation and a Superloopy evidence trail.',
      withoutTitle: 'Reference target',
      withoutText: 'A real site capture gives the visual target, not a made-up placeholder.',
      withTitle: 'Verified output',
      withText: 'Superloopy records the build notes, screenshots, local assets, and QA result before closing the task.',
      demoProofLabel: 'Demo proof stack',
      demoProofA: 'capture',
      demoProofB: 'local assets',
      demoProofC: 'browser QA',
      demoProofD: 'evidence trail',
      openDemo: 'Open GitHub demo',
      backProof: 'Back to proof',
      hostCodexTitle: 'Codex',
      hostClaudeTitle: 'Claude Code',
      codexCommandA: 'codex plugin marketplace add https://github.com/beefiker/superloopy',
      codexCommandB: 'codex plugin add superloopy@beefiker',
      claudeCommandA: '/plugin marketplace add beefiker/superloopy',
      claudeCommandB: '/plugin install superloopy@beefiker',
      cloneSkillTitle: 'Clone skill',
      cloneSkillText: 'Rebuilds a real reference, keeps assets local, and verifies the output in browser.',
      frontendSkillTitle: 'Frontend skill',
      frontendSkillText: 'Turns a loose prompt into a design contract, scoped edits, and visual QA evidence.',
      beforeLabel: 'Before',
      afterLabel: 'After',
      frontendBefore: 'Generic UI, loose scope, no proof attached.',
      frontendAfter: 'Design contract, focused edits, screenshots and checks before done.',
      cardHint: 'Hover or tap a card'
    },
    ko: {
      title: 'Superloopy | 완료는 증거로 확인',
      description: 'Superloopy는 Codex와 Claude Code 작업이 계획, 확인, 검토 가능한 증거로 끝나게 하는 플러그인입니다.',
      imageAlt: 'Superloopy 다크 퍼플 증거 루프 오빗',
      brand: 'Loopy',
      navProof: '증거',
      navDemo: '데모',
      navInstall: '설치',
      language: '언어',
      cueProduct: '에이전트 작업용 Superloopy',
      flowLabel: '증거 루프 네 단계',
      installIntro: '한 번 설치한 뒤 Codex 또는 Claude Code 작업 앞에 loopy를 붙이면 됩니다.',
      copyAction: '복사',
      copiedAction: '복사됨',
      heroLabel: 'Codex와 Claude Code',
      heroTitle: '에이전트의 완료는 증거로 끝납니다.',
      heroText: 'Codex 또는 Claude Code 작업 앞에 loopy를 붙이세요. Superloopy가 실행을 계획, 수정, 확인, 증거 루프로 바꿉니다.',
      install: '플러그인 설치',
      proofCta: '루프 보기',
      terminalLabel: 'Loopy 명령 증거 기록',
      terminalCommand: 'loopy 결제 모듈을 추가해줘',
      terminalPlan: 'goals.json',
      terminalProof: '.superloopy/evidence/',
      terminalGate: 'proof required',
      phasesLabel: '루프 단계',
      phasePlan: '한 번 요청',
      phasePlanText: 'loopy와 작업으로 시작',
      phaseBuild: '좁게 수정',
      phaseBuildText: '범위 안의 파일만 변경',
      phaseReview: '확인',
      phaseReviewText: '가장 작은 유효 검증 실행',
      phaseVerify: '증거 남김',
      phaseVerifyText: '말이 아니라 산출물로 종료',
      eyeLabel: '증거 게이트',
      eyeTitle: '증거가 없으면 완료도 없습니다.',
      eyeText: 'Loopy는 에이전트의 완료선을 바꿉니다. .superloopy/evidence 아래 artifact가 없으면 루프는 열린 상태로 남습니다.',
      github: 'GitHub 열기',
      demoCta: '데모 보기',
      backStart: '첫 오빗으로',
      skillsLabel: 'Superloopy 스킬',
      skillLoop: '1. 계획',
      skillLoopText: '요청을 기준과 단계로 변환',
      skillFrontend: '2. 작업',
      skillFrontendText: '작업 범위 안에서만 수정',
      skillResearch: '3. 증명',
      skillResearchText: '명령, 스크린샷, 파일을 기록',
      skillClone: '4. 게이트',
      skillCloneText: '증거 없으면 완료 차단',
      commandLabel: '설치 명령',
      crewLabel: '증거 신호',
      crewTests: '테스트',
      crewBrowser: '브라우저 QA',
      crewDiffs: 'diff',
      crewScreens: '스크린샷',
      crewNotes: 'gate JSON',
      demoLabel: '실제 데모',
      demoTitle: '실제 결과. 실제 증거.',
      demoText: 'README 데모는 Transferloom을 로컬로 재구성하고, asset을 로컬에 보존하고, 데스크톱과 모바일 브라우저 검증을 통과했습니다. 결과는 보이고 증거는 열어볼 수 있습니다.',
      demoPromptLabel: '데모 대상',
      demoPrompt: 'Transferloom.com 클론 reference를 로컬로 재구성하고 브라우저 검증과 Superloopy evidence trail을 남긴 데모입니다.',
      withoutTitle: 'Reference target',
      withoutText: '가짜 placeholder가 아니라 실제 사이트 캡처가 시각 기준이 됩니다.',
      withTitle: '검증된 결과',
      withText: 'Superloopy는 작업 노트, 스크린샷, 로컬 asset, QA 결과를 기록한 뒤 작업을 닫습니다.',
      demoProofLabel: '데모 증거 스택',
      demoProofA: 'capture',
      demoProofB: 'local assets',
      demoProofC: '브라우저 QA',
      demoProofD: 'evidence trail',
      openDemo: 'GitHub 데모 열기',
      backProof: '증거로 돌아가기',
      hostCodexTitle: 'Codex',
      hostClaudeTitle: 'Claude Code',
      codexCommandA: 'codex plugin marketplace add https://github.com/beefiker/superloopy',
      codexCommandB: 'codex plugin add superloopy@beefiker',
      claudeCommandA: '/plugin marketplace add beefiker/superloopy',
      claudeCommandB: '/plugin install superloopy@beefiker',
      cloneSkillTitle: 'Clone skill',
      cloneSkillText: '실제 reference를 로컬로 재구성하고 asset과 브라우저 검증 증거를 남깁니다.',
      frontendSkillTitle: 'Frontend skill',
      frontendSkillText: '흐릿한 요청을 디자인 계약, 좁은 수정, 시각 QA 증거로 바꿉니다.',
      beforeLabel: 'Before',
      afterLabel: 'After',
      frontendBefore: '평범한 UI, 넓은 범위, 증거 없는 완료.',
      frontendAfter: '디자인 계약, 집중된 수정, 완료 전 스크린샷과 검증.',
      cardHint: '카드를 눌러 비교'
    },
    ja: {
      title: 'Superloopy | 完了は証拠で示す',
      description: 'SuperloopyはCodexとClaude Codeの作業を、計画、確認、検査できる証拠で終わらせるプラグインです。',
      imageAlt: 'Superloopy dark purple evidence loop orbit',
      brand: 'Loopy',
      navProof: '証拠',
      navDemo: 'デモ',
      navInstall: '導入',
      language: '言語',
      cueProduct: 'エージェント作業用Superloopy',
      flowLabel: '証拠ループの4手順',
      installIntro: '一度導入してから、CodexまたはClaude Codeのタスクの前にloopyを付けます。',
      copyAction: 'コピー',
      copiedAction: 'コピー済み',
      heroLabel: 'CodexとClaude Code',
      heroTitle: 'エージェントの完了は証拠で終わる。',
      heroText: 'CodexまたはClaude Codeのタスクの前にloopyを付けます。Superloopyは実行を計画、編集、確認、証拠のループに変えます。',
      install: 'プラグインを導入',
      proofCta: 'ループを見る',
      terminalLabel: 'Loopy command proof transcript',
      terminalCommand: 'loopy 決済モジュールを追加して',
      terminalPlan: 'goals.json',
      terminalProof: '.superloopy/evidence/',
      terminalGate: 'proof required',
      phasesLabel: 'ループ段階',
      phasePlan: '一度頼む',
      phasePlanText: 'loopyとタスクで開始',
      phaseBuild: '狭く作業',
      phaseBuildText: '範囲内のファイルだけ変更',
      phaseReview: '確認',
      phaseReviewText: '最小の有効な検証を実行',
      phaseVerify: '証拠を残す',
      phaseVerifyText: '言葉ではなく成果物で終了',
      eyeLabel: '証拠ゲート',
      eyeTitle: '証拠なしでは完了しない。',
      eyeText: 'Loopyはエージェントの完了ラインを変えます。.superloopy/evidenceにartifactがなければ、ループは開いたままです。',
      github: 'GitHubを開く',
      demoCta: 'デモを見る',
      backStart: '最初のオービットへ',
      skillsLabel: 'Superloopy skills',
      skillLoop: '1. 計画',
      skillLoopText: '依頼を基準と手順に変える',
      skillFrontend: '2. 作業',
      skillFrontendText: '範囲内でだけ編集する',
      skillResearch: '3. 証明',
      skillResearchText: 'コマンド、画像、ファイルを記録',
      skillClone: '4. ゲート',
      skillCloneText: '証拠がなければ完了を止める',
      commandLabel: '導入コマンド',
      crewLabel: '証拠シグナル',
      crewTests: 'テスト',
      crewBrowser: 'ブラウザQA',
      crewDiffs: 'diff',
      crewScreens: 'スクリーンショット',
      crewNotes: 'gate JSON',
      demoLabel: '実デモ',
      demoTitle: '実際の出力。実際の証拠。',
      demoText: 'READMEのデモはTransferloomをローカルに再構築し、アセットをローカルに保ち、デスクトップとモバイルのブラウザ検証を通過しました。結果は見えて、証拠は検査できます。',
      demoPromptLabel: 'デモ対象',
      demoPrompt: 'Transferloom.com clone referenceをローカルに再構築し、ブラウザ検証とSuperloopy evidence trailを残したデモです。',
      withoutTitle: 'Reference target',
      withoutText: '作り物のplaceholderではなく、実サイトのキャプチャを視覚基準にします。',
      withTitle: '検証済みの出力',
      withText: 'Superloopyは作業メモ、スクリーンショット、ローカルアセット、QA結果を記録してから完了します。',
      demoProofLabel: 'デモ証拠スタック',
      demoProofA: 'capture',
      demoProofB: 'local assets',
      demoProofC: 'ブラウザQA',
      demoProofD: 'evidence trail',
      openDemo: 'GitHubデモを開く',
      backProof: '証拠へ戻る',
      hostCodexTitle: 'Codex',
      hostClaudeTitle: 'Claude Code',
      codexCommandA: 'codex plugin marketplace add https://github.com/beefiker/superloopy',
      codexCommandB: 'codex plugin add superloopy@beefiker',
      claudeCommandA: '/plugin marketplace add beefiker/superloopy',
      claudeCommandB: '/plugin install superloopy@beefiker',
      cloneSkillTitle: 'Clone skill',
      cloneSkillText: '実際のreferenceをローカルに再構築し、アセットとブラウザ検証の証拠を残します。',
      frontendSkillTitle: 'Frontend skill',
      frontendSkillText: '曖昧な依頼をデザイン契約、狭い編集、視覚QA証拠に変えます。',
      beforeLabel: 'Before',
      afterLabel: 'After',
      frontendBefore: '汎用UI、広い範囲、証拠なしの完了。',
      frontendAfter: 'デザイン契約、集中した編集、完了前の画像と検証。',
      cardHint: 'カードを選択'
    },
    zh: {
      title: 'Superloopy | 完成要有证据',
      description: 'Superloopy是面向Codex和Claude Code的插件，让任务以计划、检查和可审阅证据结束。',
      imageAlt: 'Superloopy dark purple evidence loop orbit',
      brand: 'Loopy',
      navProof: '证据',
      navDemo: '演示',
      navInstall: '安装',
      language: '语言',
      cueProduct: '面向智能体工作的Superloopy',
      flowLabel: '四步证据循环',
      installIntro: '安装一次，然后在Codex或Claude Code任务前加上loopy。',
      copyAction: '复制',
      copiedAction: '已复制',
      heroLabel: 'Codex和Claude Code',
      heroTitle: '智能体以证据完成工作。',
      heroText: '在Codex或Claude Code任务前输入loopy。Superloopy把运行变成计划、编辑、检查、证据循环。',
      install: '安装插件',
      proofCta: '查看循环',
      terminalLabel: 'Loopy command proof transcript',
      terminalCommand: 'loopy 添加支付模块',
      terminalPlan: 'goals.json',
      terminalProof: '.superloopy/evidence/',
      terminalGate: 'proof required',
      phasesLabel: '循环阶段',
      phasePlan: '一次请求',
      phasePlanText: '用loopy和任务开始',
      phaseBuild: '小范围工作',
      phaseBuildText: '只改范围内文件',
      phaseReview: '检查',
      phaseReviewText: '运行最小有效验证',
      phaseVerify: '留下证据',
      phaseVerifyText: '用产物结束，而不是状态句',
      eyeLabel: '证据门',
      eyeTitle: '没有证据，就没有完成。',
      eyeText: 'Loopy改变智能体的完成线。如果.superloopy/evidence下没有artifact，循环就保持打开。',
      github: '打开GitHub',
      demoCta: '查看演示',
      backStart: '回到第一个轨道',
      skillsLabel: 'Superloopy skills',
      skillLoop: '1. 计划',
      skillLoopText: '把需求变成标准和步骤',
      skillFrontend: '2. 工作',
      skillFrontendText: '只在任务范围内编辑',
      skillResearch: '3. 证明',
      skillResearchText: '记录命令、截图或文件',
      skillClone: '4. 过门',
      skillCloneText: '缺少证据时阻止完成',
      commandLabel: '安装命令',
      crewLabel: '证据信号',
      crewTests: '测试',
      crewBrowser: '浏览器QA',
      crewDiffs: 'diff',
      crewScreens: '截图',
      crewNotes: 'gate JSON',
      demoLabel: '真实演示',
      demoTitle: '真实输出。真实证据。',
      demoText: 'README演示在本地重建了Transferloom，保留本地资产，并通过桌面和移动浏览器检查。结果可见，证据可审阅。',
      demoPromptLabel: '演示目标',
      demoPrompt: 'Transferloom.com clone reference，在本地重建，并留下浏览器验证和Superloopy evidence trail。',
      withoutTitle: 'Reference target',
      withoutText: '真实网站截图提供视觉目标，不是虚构占位图。',
      withTitle: '已验证输出',
      withText: 'Superloopy记录构建说明、截图、本地资产和QA结果，然后关闭任务。',
      demoProofLabel: '演示证据栈',
      demoProofA: 'capture',
      demoProofB: 'local assets',
      demoProofC: '浏览器QA',
      demoProofD: 'evidence trail',
      openDemo: '打开GitHub演示',
      backProof: '返回证据',
      hostCodexTitle: 'Codex',
      hostClaudeTitle: 'Claude Code',
      codexCommandA: 'codex plugin marketplace add https://github.com/beefiker/superloopy',
      codexCommandB: 'codex plugin add superloopy@beefiker',
      claudeCommandA: '/plugin marketplace add beefiker/superloopy',
      claudeCommandB: '/plugin install superloopy@beefiker',
      cloneSkillTitle: 'Clone skill',
      cloneSkillText: '在本地重建真实reference，保留资产，并留下浏览器验证证据。',
      frontendSkillTitle: 'Frontend skill',
      frontendSkillText: '把模糊需求变成设计约束、范围内编辑和视觉QA证据。',
      beforeLabel: 'Before',
      afterLabel: 'After',
      frontendBefore: '通用UI、范围松散、没有证据。',
      frontendAfter: '设计约束、聚焦编辑、完成前截图和检查。',
      cardHint: '点选卡片'
    },
    es: {
      title: 'Superloopy | Hecho significa probado',
      description: 'Superloopy es un plugin para Codex y Claude Code que hace que el trabajo del agente termine con plan, check y evidencia inspeccionable.',
      imageAlt: 'Superloopy dark-purple evidence loop orbit',
      brand: 'Loopy',
      navProof: 'Prueba',
      navDemo: 'Demo',
      navInstall: 'Instalar',
      language: 'Idioma',
      cueProduct: 'Superloopy para trabajo con agentes',
      flowLabel: 'Un loop de prueba en cuatro pasos',
      installIntro: 'Instala una vez y empieza cualquier tarea de Codex o Claude Code con loopy.',
      copyAction: 'Copiar',
      copiedAction: 'Copiado',
      heroLabel: 'Codex y Claude Code',
      heroTitle: 'Los agentes terminan con prueba.',
      heroText: 'Escribe loopy antes de una tarea de Codex o Claude Code. Superloopy convierte la ejecucion en plan, edicion, check y evidencia.',
      install: 'Instalar plugin',
      proofCta: 'Ver el loop',
      terminalLabel: 'Loopy command proof transcript',
      terminalCommand: 'loopy agrega el modulo de pagos',
      terminalPlan: 'goals.json',
      terminalProof: '.superloopy/evidence/',
      terminalGate: 'proof required',
      phasesLabel: 'Fases del loop',
      phasePlan: 'Pide una vez',
      phasePlanText: 'empieza con loopy y una tarea',
      phaseBuild: 'Trabaja acotado',
      phaseBuildText: 'edita solo lo necesario',
      phaseReview: 'Comprueba',
      phaseReviewText: 'corre la validacion minima',
      phaseVerify: 'Deja prueba',
      phaseVerifyText: 'termina con artefactos',
      eyeLabel: 'Puerta de prueba',
      eyeTitle: 'Sin prueba, no hay cierre.',
      eyeText: 'Loopy cambia la meta del agente. Si no hay artefacto bajo .superloopy/evidence, el loop queda abierto.',
      github: 'Abrir GitHub',
      demoCta: 'Ver demo',
      backStart: 'Volver al primer orbit',
      skillsLabel: 'Superloopy skills',
      skillLoop: '1. Plan',
      skillLoopText: 'convierte el brief en criterios',
      skillFrontend: '2. Build',
      skillFrontendText: 'mantiene el cambio acotado',
      skillResearch: '3. Prove',
      skillResearchText: 'captura comandos, pantallas o archivos',
      skillClone: '4. Gate',
      skillCloneText: 'bloquea el cierre si falta evidencia',
      commandLabel: 'Comandos de instalacion',
      crewLabel: 'Senales de prueba',
      crewTests: 'tests',
      crewBrowser: 'browser QA',
      crewDiffs: 'diffs',
      crewScreens: 'capturas',
      crewNotes: 'gate JSON',
      demoLabel: 'Demo real',
      demoTitle: 'Output real. Evidencia real.',
      demoText: 'La demo del README reconstruyo Transferloom en local, mantuvo assets locales y paso checks de navegador en desktop y movil. El resultado se ve y la evidencia se inspecciona.',
      demoPromptLabel: 'Objetivo demo',
      demoPrompt: 'Transferloom.com clone reference, reconstruido en local con validacion de navegador y evidence trail de Superloopy.',
      withoutTitle: 'Reference target',
      withoutText: 'Una captura real del sitio define el objetivo visual, no un placeholder inventado.',
      withTitle: 'Salida verificada',
      withText: 'Superloopy registra notas de build, capturas, assets locales y el resultado de QA antes de cerrar la tarea.',
      demoProofLabel: 'Stack de prueba',
      demoProofA: 'capture',
      demoProofB: 'local assets',
      demoProofC: 'browser QA',
      demoProofD: 'evidence trail',
      openDemo: 'Abrir demo en GitHub',
      backProof: 'Volver a prueba',
      hostCodexTitle: 'Codex',
      hostClaudeTitle: 'Claude Code',
      codexCommandA: 'codex plugin marketplace add https://github.com/beefiker/superloopy',
      codexCommandB: 'codex plugin add superloopy@beefiker',
      claudeCommandA: '/plugin marketplace add beefiker/superloopy',
      claudeCommandB: '/plugin install superloopy@beefiker',
      cloneSkillTitle: 'Clone skill',
      cloneSkillText: 'Reconstruye una referencia real, conserva assets locales y verifica en navegador.',
      frontendSkillTitle: 'Frontend skill',
      frontendSkillText: 'Convierte un prompt suelto en contrato visual, cambios acotados y evidencia QA.',
      beforeLabel: 'Before',
      afterLabel: 'After',
      frontendBefore: 'UI generica, alcance flojo, sin prueba.',
      frontendAfter: 'Contrato visual, cambios enfocados, capturas y checks antes de cerrar.',
      cardHint: 'Toca una carta'
    }
  };

  function currentCopy(){
    return copyByLang[currentLanguage] || copyByLang.en;
  }

  function readStoredLanguage(){
    try {
      return window.localStorage && window.localStorage.getItem('loopy-language');
    } catch (error) {
      return null;
    }
  }

  function normalizeLanguage(value){
    var lower = String(value || '').toLowerCase();
    if(lower.indexOf('ko') === 0) return 'ko';
    if(lower.indexOf('ja') === 0) return 'ja';
    if(lower.indexOf('zh') === 0) return 'zh';
    if(lower.indexOf('es') === 0) return 'es';
    return 'en';
  }

  function initialLanguage(){
    var params = new URLSearchParams(window.location.search);
    if(params.has('lang')) return normalizeLanguage(params.get('lang'));
    var stored = readStoredLanguage();
    if(stored) return normalizeLanguage(stored);
    return normalizeLanguage(navigator.language || 'en');
  }

  var currentLanguage = initialLanguage();

  function updateMeta(name, value){
    var meta = document.querySelector('meta[name="' + name + '"]');
    if(!meta){
      meta = document.createElement('meta');
      meta.setAttribute('name', name);
      document.head.appendChild(meta);
    }
    if(meta.getAttribute('content') !== value) meta.setAttribute('content', value);
  }

  function updateProperty(property, value){
    var meta = document.querySelector('meta[property="' + property + '"]');
    if(!meta){
      meta = document.createElement('meta');
      meta.setAttribute('property', property);
      document.head.appendChild(meta);
    }
    if(meta.getAttribute('content') !== value) meta.setAttribute('content', value);
  }

  function updateLink(rel, href){
    var link = document.querySelector('link[rel="' + rel + '"]');
    if(!link){
      link = document.createElement('link');
      link.setAttribute('rel', rel);
      document.head.appendChild(link);
    }
    if(link.getAttribute('href') !== href) link.setAttribute('href', href);
  }

  function absoluteAsset(path){
    return new URL(path, window.location.origin).href;
  }

  function patchHead(){
    var copy = currentCopy();
    var previewImage = absoluteAsset('/loopy-og.jpg');
    var pageUrl = window.location.origin + window.location.pathname;

    document.documentElement.setAttribute('lang', currentLanguage);
    document.title = copy.title;
    updateMeta('description', copy.description);
    updateMeta('apple-mobile-web-app-title', 'Loopy');
    updateMeta('theme-color', '#12061d');
    updateMeta('twitter:card', 'summary_large_image');
    updateMeta('twitter:title', copy.title);
    updateMeta('twitter:description', copy.description);
    updateMeta('twitter:image', previewImage);
    updateMeta('twitter:image:alt', copy.imageAlt);
    updateProperty('og:title', copy.title);
    updateProperty('og:description', copy.description);
    updateProperty('og:image', previewImage);
    updateProperty('og:image:width', '1200');
    updateProperty('og:image:height', '630');
    updateProperty('og:image:alt', copy.imageAlt);
    updateProperty('og:type', 'website');
    updateProperty('og:url', pageUrl);
    updateProperty('og:site_name', 'Superloopy');
    updateLink('image_src', previewImage);

    var schema = document.querySelector('script[type="application/ld+json"][data-nuxt-schema-org]');
    if(schema){
      schema.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@id': 'https://github.com/beefiker/superloopy#website',
            '@type': 'WebSite',
            inLanguage: currentLanguage,
            image: previewImage,
            name: 'Superloopy',
            url: 'https://github.com/beefiker/superloopy'
          },
          {
            '@id': 'https://github.com/beefiker/superloopy#webpage',
            '@type': 'WebPage',
            description: copy.description,
            image: previewImage,
            inLanguage: currentLanguage,
            name: copy.title,
            url: 'https://github.com/beefiker/superloopy'
          }
        ]
      });
    }
  }

  function addStyles(){
    if(document.getElementById('loopy-style')) return;
    var style = document.createElement('style');
    style.id = 'loopy-style';
    style.textContent = [
      ':root{--loopy-bg:#12061d;--loopy-bg-deep:#08040f;--loopy-panel:rgba(33,16,47,.78);--loopy-ink:#f7edff;--loopy-muted:rgba(247,237,255,.72);--loopy-quiet:rgba(247,237,255,.52);--loopy-line:rgba(247,237,255,.18);--loopy-line-strong:rgba(247,237,255,.34);--loopy-accent:#c98cff;--loopy-accent-soft:#ead2ff;--loopy-cyan:#7af0ff;--loopy-cyan-soft:#9df8ff;--loopy-shadow:rgba(8,4,15,.44)}',
      'html,body{background:var(--loopy-bg)!important;color:var(--loopy-ink)!important}',
      '#__nuxt{position:relative;z-index:1}',
      '#__nuxt,.lenis{pointer-events:none!important}',
      'body:not([data-loopy-canvas-ready="true"]) #__nuxt{z-index:40}',
      'canvas{filter:none!important;transform-origin:center center}',
      'body:not([data-loopy-canvas-ready="true"]) canvas{opacity:0!important;visibility:hidden!important;transform:translate3d(0,1.25rem,0) scale(.985)!important}',
      'body[data-loopy-canvas-ready="true"] canvas{transition:opacity .76s cubic-bezier(.33,0,.2,1),transform .76s cubic-bezier(.33,0,.2,1);transform:translate3d(0,0,0) scale(1)!important}',
      '.js-header,nav.relative.group,.ticker,[data-v-d0869570],.js-team-list,.fixed.bottom-0,.fixed.bottom-12,.fixed.top-0.right-0.h-full.w-\\[20px\\],.bg-scrollbar{display:none!important}',
      '[data-v-1b2f4e78].fixed.inset-0.z-\\[1000\\][data-loopy-loader-hidden="true"],[data-loopy-loader-hidden="true"]{opacity:0!important;visibility:hidden!important;pointer-events:none!important}',
      '[data-webgl-section]{visibility:visible!important}',
      '[data-webgl-section]>*{opacity:0!important;visibility:hidden!important;pointer-events:none!important}',
      '[data-webgl-section="landing"],[data-webgl-section="biology"],[data-webgl-section="crypto"]{height:100vh!important;min-height:100vh!important;margin:0!important;padding:0!important;overflow:hidden!important}',
      '[data-webgl-section="landing"]>*,[data-webgl-section="biology"]>*,[data-webgl-section="crypto"]>*{height:0!important;min-height:0!important;margin:0!important;padding:0!important;overflow:hidden!important}',
      '[data-webgl-section="computing"],[data-webgl-section="engineering"],[data-webgl-section="team"]{height:1px!important;min-height:1px!important;margin:0!important;padding:0!important;overflow:hidden!important}',
      '[data-webgl-section="computing"] *,[data-webgl-section="engineering"] *,[data-webgl-section="team"] *{height:0!important;min-height:0!important;margin:0!important;padding:0!important;overflow:hidden!important}',
      'html,body,#__nuxt,.lenis{scrollbar-width:none!important;-ms-overflow-style:none!important;overscroll-behavior:none!important}',
      '.lenis{position:fixed!important;left:0!important;top:-120vh!important;height:100dvh!important;overflow:hidden!important;scrollbar-color:transparent transparent!important;width:calc(100% + 2rem)!important;max-width:none!important;padding-right:2rem!important;box-sizing:content-box!important}',
      'html::-webkit-scrollbar,body::-webkit-scrollbar,#__nuxt::-webkit-scrollbar,.lenis::-webkit-scrollbar{width:0!important;height:0!important;display:none!important;background:transparent!important}',
      '.loopy-scrim{position:fixed;inset:0;z-index:2;pointer-events:none;background:linear-gradient(90deg,rgba(8,4,15,.62),rgba(18,6,29,.18) 42%,rgba(8,4,15,.38)),rgba(18,6,29,.08);transition:background .32s ease}',
      'body[data-loopy-view="eye"] .loopy-scrim{background:linear-gradient(90deg,rgba(8,4,15,.84),rgba(8,4,15,.6) 34%,rgba(18,6,29,.18) 54%,rgba(8,4,15,.24)),rgba(18,6,29,.06)}',
      'body[data-loopy-view="demo"] .loopy-scrim{background:linear-gradient(90deg,rgba(8,4,15,.36),rgba(18,6,29,.18) 39%,rgba(8,4,15,.76)),rgba(18,6,29,.03)}',
      '.loopy-scroll-meter{position:fixed;left:clamp(1rem,3vw,2rem);top:3.25rem;z-index:29;display:flex;align-items:center;gap:.38rem;pointer-events:none;opacity:.76}',
      '.loopy-scroll-meter span{width:.42rem;height:.42rem;border:1px solid var(--loopy-line-strong);border-radius:999px;background:transparent;box-shadow:none;transition:background .24s ease,border-color .24s ease,box-shadow .2s ease,transform .2s ease}',
      'body[data-loopy-view="hero"] .loopy-scroll-meter span[data-view="hero"],body[data-loopy-view="eye"] .loopy-scroll-meter span[data-view="eye"],body[data-loopy-view="demo"] .loopy-scroll-meter span[data-view="demo"]{background:var(--loopy-accent);border-color:var(--loopy-accent);box-shadow:0 0 14px rgba(201,140,255,.22)}',
      'body[data-loopy-edge] .loopy-scroll-meter span{transform:scale(1.14)}',
      'body[data-loopy-transitioning="true"] canvas{opacity:1!important;transform:translate3d(0,0,0) scale(1)!important;transition:none!important}',
      'body[data-loopy-transition-phase="settle"] canvas{opacity:1!important;transform:translate3d(0,0,0) scale(1)!important}',
      '.loopy-topbar{position:fixed;left:0;right:0;top:0;z-index:30;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1rem clamp(1rem,3vw,2rem);color:var(--loopy-ink);pointer-events:none}',
      '.loopy-brand{display:inline-flex;align-items:center;gap:.65rem;font:600 .875rem/1 Geist Mono,monospace;text-transform:uppercase;letter-spacing:.04em;pointer-events:auto;text-decoration:none;color:var(--loopy-ink)}',
      '.loopy-mark{width:1rem;height:1rem;border:1px solid var(--loopy-ink);border-radius:999px;box-shadow:inset 0 0 0 .28rem var(--loopy-bg),0 0 16px rgba(122,240,255,.16)}',
      '.loopy-topbar-right{display:flex;align-items:center;gap:.5rem;pointer-events:auto}',
      '.loopy-nav{display:flex;gap:.5rem}',
      '.loopy-nav a,.loopy-lang-button{display:inline-flex;align-items:center;justify-content:center;min-height:2.25rem;padding:0 .8rem;border:1px solid var(--loopy-line);border-radius:999px;background:rgba(18,6,29,.52);color:var(--loopy-muted);font:500 .8rem/1 Instrument Sans,sans-serif;text-decoration:none;backdrop-filter:blur(10px)}',
      '.loopy-nav a:hover,.loopy-lang-button:hover{color:var(--loopy-ink);border-color:var(--loopy-line-strong)}',
      '.loopy-lang{position:relative}',
      '.loopy-lang-button{gap:.42rem;min-width:3.4rem;cursor:pointer}',
      '.loopy-lang-button span{width:.48rem;height:.48rem;border-radius:999px;background:var(--loopy-cyan);box-shadow:0 0 16px rgba(122,240,255,.4)}',
      '.loopy-lang-menu{position:absolute;right:0;top:calc(100% + .45rem);display:grid;gap:.2rem;width:10.6rem;padding:.35rem;border:1px solid var(--loopy-line);border-radius:8px;background:rgba(8,4,15,.84);box-shadow:0 20px 60px rgba(8,4,15,.36);backdrop-filter:blur(18px);opacity:0;visibility:hidden;transform:translateY(-.25rem);transition:opacity .18s ease,visibility .18s ease,transform .18s ease}',
      '.loopy-lang[data-open="true"] .loopy-lang-menu{opacity:1;visibility:visible;transform:translateY(0)}',
      '.loopy-lang-menu button{display:flex;align-items:center;justify-content:space-between;gap:.7rem;border:0;border-radius:6px;background:transparent;color:var(--loopy-muted);padding:.62rem .65rem;font:500 .8rem/1 Instrument Sans,sans-serif;text-align:left;cursor:pointer}',
      '.loopy-lang-menu button:hover,.loopy-lang-menu button[aria-pressed="true"]{background:rgba(247,237,255,.08);color:var(--loopy-ink)}',
      '.loopy-lang-menu small{color:var(--loopy-quiet);font:600 .68rem/1 Geist Mono,monospace}',
      '.loopy-stage{position:fixed;inset:0;z-index:20;display:grid;grid-template-columns:minmax(0,1fr);align-items:center;padding:clamp(5rem,9vw,7rem) clamp(1rem,4vw,4rem);pointer-events:none;opacity:0;visibility:hidden;transition:opacity .28s ease,visibility .28s ease}',
      'body[data-loopy-view="hero"] .loopy-stage--hero,body[data-loopy-view="eye"] .loopy-stage--eye,body[data-loopy-view="demo"] .loopy-stage--demo{opacity:1;visibility:visible}',
      'body[data-loopy-transitioning="true"] .loopy-stage{transition-duration:.22s}',
      'body[data-loopy-transitioning="true"] .loopy-scrim{background:linear-gradient(90deg,rgba(8,4,15,.55),rgba(18,6,29,.12) 48%,rgba(8,4,15,.34)),rgba(18,6,29,.04)}',
      '.loopy-stage--hero{align-items:end;padding-bottom:clamp(3rem,8vw,6rem)}',
      '.loopy-stage--eye{align-items:end;padding-bottom:clamp(2rem,5vw,4rem)}',
      '.loopy-stage--demo{align-items:center}',
      '.loopy-copy{width:min(680px,100%);color:var(--loopy-ink);text-shadow:0 1px 24px var(--loopy-shadow);pointer-events:auto}',
      '.loopy-copy--hero{width:min(720px,100%)}',
      '.loopy-copy--proof{width:min(600px,100%)}',
      '.loopy-copy--demo{width:min(760px,100%);margin-left:auto}',
      '.loopy-stage--hero .loopy-copy{margin-left:auto}',
      '.loopy-stage--eye .loopy-copy{margin-left:0;margin-right:auto;width:min(600px,100%)}',
      '.loopy-label{font-family:Geist Mono,monospace;font-size:.75rem;line-height:1;letter-spacing:.08em;text-transform:uppercase;color:var(--loopy-accent-soft);margin:0 0 1rem}',
      '.loopy-title{margin:0;color:var(--loopy-ink);font-family:Instrument Sans,sans-serif;font-size:clamp(3rem,8.4vw,7.5rem);font-weight:500;line-height:.88;letter-spacing:0;max-width:760px}',
      '.loopy-title--small{font-size:clamp(2rem,4.8vw,4.6rem);max-width:520px;line-height:.94}',
      '.loopy-title--demo{font-size:clamp(2.2rem,4.8vw,4.45rem);max-width:680px;line-height:.92}',
      '.loopy-sub{margin:1.5rem 0 0;max-width:540px;color:var(--loopy-muted);font-family:Instrument Sans,sans-serif;font-size:clamp(1rem,1.8vw,1.25rem);line-height:1.5;letter-spacing:0}',
      '.loopy-actions{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:1.75rem}',
      '.loopy-btn{display:inline-flex;align-items:center;justify-content:center;min-height:3rem;padding:0 1.05rem;border:1px solid var(--loopy-line-strong);border-radius:6px;background:rgba(8,4,15,.66);color:var(--loopy-ink);font:700 .78rem/1 Geist Mono,monospace;text-transform:uppercase;letter-spacing:.04em;text-decoration:none;backdrop-filter:blur(12px);transition:transform .2s ease,border-color .2s ease,background .2s ease,color .2s ease}',
      '.loopy-btn:hover{transform:translateY(-2px);border-color:var(--loopy-accent);background:rgba(54,25,76,.82);color:var(--loopy-ink)}',
      '.loopy-btn:focus-visible,.loopy-lang-button:focus-visible,.loopy-lang-menu button:focus-visible{outline:2px solid var(--loopy-accent);outline-offset:4px}',
      '.loopy-btn--solid{background:var(--loopy-accent);border-color:var(--loopy-accent);color:var(--loopy-bg-deep)}',
      '.loopy-terminal{display:grid;gap:1px;margin-top:1.35rem;max-width:620px;border:1px solid var(--loopy-line);border-radius:8px;background:var(--loopy-line);overflow:hidden;box-shadow:0 20px 60px rgba(8,4,15,.24)}',
      '.loopy-terminal div{display:grid;grid-template-columns:5.2rem minmax(0,1fr);gap:.75rem;align-items:center;background:rgba(8,4,15,.62);padding:.72rem .85rem;color:var(--loopy-muted);font:500 .78rem/1.35 Geist Mono,monospace}',
      '.loopy-terminal b{color:var(--loopy-cyan-soft);font-weight:700;text-transform:uppercase;letter-spacing:.05em}',
      '.loopy-terminal code{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--loopy-ink);font:inherit}',
      '.loopy-proof{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;margin-top:1.15rem;max-width:720px;border:1px solid var(--loopy-line);border-radius:8px;background:var(--loopy-line);overflow:hidden}',
      '.loopy-proof span{display:block;background:rgba(8,4,15,.58);padding:.82rem .86rem;color:var(--loopy-muted)}',
      '.loopy-proof strong{display:block;color:var(--loopy-cyan-soft);font:700 .72rem/1.1 Geist Mono,monospace;text-transform:uppercase;letter-spacing:.05em}',
      '.loopy-proof small{display:block;margin-top:.42rem;color:var(--loopy-quiet);font:500 .74rem/1.35 Instrument Sans,sans-serif;letter-spacing:0;text-transform:none}',
      '.loopy-proof-flow{display:grid;gap:.55rem;margin-top:1.25rem;max-width:650px}',
      '.loopy-proof-flow span{display:grid;grid-template-columns:4.8rem minmax(0,1fr);gap:.8rem;align-items:start;border-left:2px solid var(--loopy-line-strong);background:linear-gradient(90deg,rgba(8,4,15,.68),rgba(18,6,29,.22));padding:.78rem .9rem;color:var(--loopy-muted)}',
      '.loopy-proof-flow strong{color:var(--loopy-cyan-soft);font:700 .75rem/1.15 Geist Mono,monospace;text-transform:uppercase;letter-spacing:.05em}',
      '.loopy-proof-flow small{color:var(--loopy-muted);font:500 .86rem/1.35 Instrument Sans,sans-serif}',
      '.loopy-skill-grid{display:grid;gap:.55rem;margin-top:1.2rem;max-width:650px}',
      '.loopy-skill-grid span{display:grid;grid-template-columns:5rem minmax(0,1fr);gap:.9rem;align-items:start;border:1px solid var(--loopy-line);border-radius:8px;background:rgba(8,4,15,.58);padding:.78rem .9rem;color:var(--loopy-muted)}',
      '.loopy-skill-grid strong{display:block;color:var(--loopy-ink);font:700 .72rem/1.15 Geist Mono,monospace;text-transform:uppercase;letter-spacing:.05em}',
      '.loopy-skill-grid small{display:block;color:var(--loopy-muted);font:500 .82rem/1.35 Instrument Sans,sans-serif;letter-spacing:0;text-transform:none}',
      '.loopy-command{display:grid;gap:.35rem;margin-top:.8rem;max-width:650px;border:1px solid var(--loopy-line);border-radius:8px;background:rgba(8,4,15,.58);padding:.75rem .85rem;color:var(--loopy-accent-soft);font:500 .76rem/1.35 Geist Mono,monospace}',
      '.loopy-command code{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font:inherit}',
      '.loopy-crew{display:flex;flex-wrap:wrap;gap:.45rem;margin-top:.8rem;max-width:620px}',
      '.loopy-crew span{border:1px solid var(--loopy-line);border-radius:999px;background:rgba(18,6,29,.48);padding:.46rem .65rem;color:var(--loopy-muted);font:600 .7rem/1 Geist Mono,monospace;text-transform:uppercase;letter-spacing:.05em}',
      '.loopy-prompt{margin-top:1.05rem;max-width:680px;border:1px solid var(--loopy-line);border-radius:8px;background:rgba(8,4,15,.58);padding:.85rem .95rem;color:var(--loopy-muted)}',
      '.loopy-prompt strong{display:block;color:var(--loopy-cyan-soft);font:700 .72rem/1.15 Geist Mono,monospace;text-transform:uppercase;letter-spacing:.05em}',
      '.loopy-prompt small{display:block;margin-top:.45rem;color:var(--loopy-muted);font:500 .82rem/1.35 Instrument Sans,sans-serif}',
      '.loopy-demo-showcase{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(16rem,.82fr);gap:1px;margin-top:1rem;max-width:780px;border:1px solid var(--loopy-line);border-radius:8px;background:var(--loopy-line);overflow:hidden;box-shadow:0 22px 70px rgba(8,4,15,.28)}',
      '.loopy-demo-thumb{position:relative;display:block;min-height:13rem;background:rgba(8,4,15,.7);overflow:hidden;color:var(--loopy-ink);text-decoration:none}',
      '.loopy-demo-thumb img{width:100%;height:100%;min-height:13rem;object-fit:cover;display:block;filter:saturate(.9) contrast(1.04) brightness(.82)}',
      '.loopy-demo-thumb span{position:absolute;left:.8rem;bottom:.8rem;border:1px solid var(--loopy-line-strong);border-radius:6px;background:rgba(8,4,15,.72);padding:.45rem .55rem;color:var(--loopy-cyan-soft);font:700 .68rem/1 Geist Mono,monospace;text-transform:uppercase;letter-spacing:.05em;backdrop-filter:blur(10px)}',
      '.loopy-demo-copy{display:grid;gap:1px;background:var(--loopy-line)}',
      '.loopy-demo-card,.loopy-proof-stack span{display:block;background:rgba(8,4,15,.62);padding:.72rem .82rem;color:var(--loopy-muted)}',
      '.loopy-demo-card strong,.loopy-proof-stack strong{display:block;color:var(--loopy-ink);font:700 .72rem/1.15 Geist Mono,monospace;text-transform:uppercase;letter-spacing:.05em}',
      '.loopy-demo-card small{display:block;margin-top:.38rem;color:var(--loopy-muted);font:500 .74rem/1.3 Instrument Sans,sans-serif}',
      '.loopy-proof-stack{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;margin-top:.8rem;max-width:780px;border:1px solid var(--loopy-line);border-radius:8px;background:var(--loopy-line);overflow:hidden}',
      '.loopy-proof-stack strong{color:var(--loopy-cyan-soft)}',
      '@media (max-width:860px){.loopy-copy--demo{width:min(640px,100%)}.loopy-demo-showcase,.loopy-proof-stack{max-width:100%}.loopy-demo-showcase{grid-template-columns:1fr}}',
      '@media (max-width:700px){.loopy-scrim{background:linear-gradient(180deg,rgba(8,4,15,.54),rgba(18,6,29,.04) 44%,rgba(8,4,15,.58)),rgba(18,6,29,.03)}body[data-loopy-view="eye"] .loopy-scrim{background:linear-gradient(180deg,rgba(8,4,15,.34),rgba(18,6,29,.02) 44%,rgba(8,4,15,.64)),rgba(18,6,29,.02)}body[data-loopy-view="demo"] .loopy-scrim{background:linear-gradient(180deg,rgba(8,4,15,.2),rgba(18,6,29,.05) 34%,rgba(8,4,15,.78)),rgba(18,6,29,.02)}.loopy-scroll-meter{left:1.05rem;top:3.6rem;opacity:.58}.loopy-topbar{gap:.5rem}.loopy-brand span:last-child{display:none}.loopy-nav a[href="#loopy-proof"]{display:none}.loopy-nav{gap:.35rem}.loopy-nav a,.loopy-lang-button{padding:0 .65rem;min-height:2.15rem}.loopy-lang-menu{width:9.8rem}.loopy-stage{padding:5.5rem 1rem 2rem}.loopy-stage--hero{align-items:start;padding-top:8.5rem}.loopy-stage--eye{align-items:end;padding-bottom:1.25rem}.loopy-stage--demo{align-items:end;padding-bottom:1.15rem}.loopy-stage--hero .loopy-copy,.loopy-stage--eye .loopy-copy,.loopy-copy--demo{margin:0}.loopy-copy--hero,.loopy-copy--proof,.loopy-copy--demo,.loopy-stage--eye .loopy-copy{width:100%}.loopy-title{font-size:clamp(2.45rem,12vw,4rem);line-height:.94}.loopy-title--small{font-size:clamp(2rem,8.4vw,2.75rem);max-width:21rem}.loopy-title--demo{font-size:clamp(2rem,8.8vw,3rem);max-width:22rem}.loopy-stage--eye .loopy-sub,.loopy-stage--demo .loopy-sub{margin-top:.85rem;max-width:22rem}.loopy-stage--eye .loopy-actions,.loopy-stage--demo .loopy-actions{margin-top:1rem}.loopy-terminal,.loopy-skill-grid,.loopy-command,.loopy-stage--eye .loopy-proof,.loopy-prompt,.loopy-proof-stack{display:none}.loopy-sub{max-width:21rem}.loopy-proof{grid-template-columns:repeat(2,minmax(0,1fr));max-width:100%;margin-top:1.2rem}.loopy-proof span{padding:.75rem}.loopy-proof small{display:none}.loopy-proof-flow{display:none}.loopy-btn{min-height:2.6rem}.loopy-crew{gap:.35rem;max-width:21rem}.loopy-crew span{font-size:.62rem;padding:.4rem .5rem}.loopy-demo-showcase{grid-template-columns:1fr;max-width:22rem;margin-top:.9rem}.loopy-demo-thumb{min-height:9.6rem}.loopy-demo-thumb img{min-height:9.6rem}.loopy-demo-card{padding:.75rem}.loopy-demo-card small{display:none}}',
      '.loopy-topbar{padding:1.25rem clamp(1rem,3vw,2.25rem);align-items:flex-start}',
      '.loopy-brand{gap:.75rem;font:700 .78rem/1 Geist Mono,monospace;letter-spacing:.12em}',
      '.loopy-brand small{display:block;margin-left:.35rem;color:var(--loopy-muted);font:600 .64rem/1.28 Geist Mono,monospace;letter-spacing:.12em;text-transform:uppercase}',
      '.loopy-mark{width:1.15rem;height:1.15rem;border-radius:0;transform:rotate(45deg);border:1px solid var(--loopy-cyan);box-shadow:none;background:rgba(8,4,15,.34)}',
      '.loopy-nav{gap:0;border:1px solid var(--loopy-line);background:rgba(8,4,15,.18);backdrop-filter:blur(14px)}',
      '.loopy-nav a,.loopy-lang-button{min-height:2.55rem;border:0;border-left:1px solid var(--loopy-line);border-radius:0;background:rgba(8,4,15,.34);padding:0 1.05rem;color:var(--loopy-muted);font:700 .68rem/1 Geist Mono,monospace;text-transform:uppercase;letter-spacing:.1em}',
      '.loopy-nav a:first-child{border-left:0}',
      '.loopy-nav-install{background:var(--loopy-ink)!important;color:var(--loopy-bg-deep)!important}',
      '.loopy-lang-button{border:1px solid var(--loopy-line);margin-left:.45rem;min-width:3.85rem}',
      '.loopy-lang-button span{border-radius:0;width:.42rem;height:.42rem;transform:rotate(45deg);box-shadow:none}',
      '.loopy-lang-menu{border-radius:0;border-color:var(--loopy-line-strong);padding:.2rem;background:rgba(8,4,15,.92)}',
      '.loopy-lang-menu button{border-radius:0;font:600 .78rem/1 Instrument Sans,sans-serif}',
      '.loopy-scroll-meter{top:4.45rem;gap:.28rem;flex-direction:column;align-items:flex-start}',
      '.loopy-scroll-meter span{width:.9rem;height:1px;border:0;border-radius:0;background:var(--loopy-line-strong)}',
      'body[data-loopy-view="hero"] .loopy-scroll-meter span[data-view="hero"],body[data-loopy-view="eye"] .loopy-scroll-meter span[data-view="eye"],body[data-loopy-view="demo"] .loopy-scroll-meter span[data-view="demo"]{width:1.75rem;background:var(--loopy-cyan);box-shadow:none}',
      '.loopy-stage{padding:clamp(5.5rem,9vw,7rem) clamp(1rem,4vw,4.25rem)}',
      '.loopy-stage--hero{align-items:end;padding-bottom:clamp(2rem,5.5vw,4.75rem)}',
      '.loopy-stage--eye{align-items:center}',
      '.loopy-stage--demo{align-items:center}',
      '.loopy-copy{width:min(860px,100%);text-shadow:0 1px 26px rgba(8,4,15,.5)}',
      '.loopy-copy--hero{width:min(760px,100%);margin-left:auto}',
      '.loopy-copy--proof{width:min(640px,100%)}',
      '.loopy-copy--demo{width:min(1020px,100%);margin-left:auto}',
      '.loopy-kicker{display:flex;flex-wrap:wrap;gap:0;margin:0 0 1.1rem;border-left:1px solid var(--loopy-cyan)}',
      '.loopy-kicker span{display:inline-flex;align-items:center;min-height:1.7rem;border:1px solid var(--loopy-line);border-left:0;background:rgba(8,4,15,.28);padding:0 .72rem;color:var(--loopy-cyan-soft);font:700 .62rem/1 Geist Mono,monospace;text-transform:uppercase;letter-spacing:.12em}',
      '.loopy-title{max-width:820px;font-family:Instrument Sans,sans-serif;font-size:clamp(4.25rem,9.2vw,8.8rem);font-weight:800;line-height:.82;text-transform:uppercase;letter-spacing:0}',
      '.loopy-title--small{max-width:560px;font-size:clamp(3.3rem,6.8vw,6.25rem);line-height:.84}',
      '.loopy-title--demo{max-width:520px;font-size:clamp(2.7rem,5.5vw,5.2rem);line-height:.85}',
      '.loopy-sub{max-width:46rem;margin-top:1.15rem;color:var(--loopy-muted);font-size:clamp(1rem,1.45vw,1.18rem);line-height:1.45}',
      '.loopy-actions{gap:0;margin-top:1.5rem}',
      '.loopy-btn{min-height:3.25rem;border-radius:0;border:1px solid var(--loopy-line-strong);background:rgba(8,4,15,.46);padding:0 1.1rem;color:var(--loopy-ink);font:800 .68rem/1 Geist Mono,monospace;letter-spacing:.11em;box-shadow:none}',
      '.loopy-btn + .loopy-btn{border-left:0}',
      '.loopy-btn:hover{transform:none;background:rgba(247,237,255,.1);border-color:var(--loopy-ink)}',
      '.loopy-btn--solid{background:var(--loopy-ink);border-color:var(--loopy-ink);color:var(--loopy-bg-deep)}',
      '.loopy-mission-rail{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));margin-top:1.6rem;max-width:820px;border-top:1px solid var(--loopy-line-strong);border-bottom:1px solid var(--loopy-line-strong)}',
      '.loopy-mission-rail div{min-width:0;border-left:1px solid var(--loopy-line);padding:.82rem .8rem;background:linear-gradient(180deg,rgba(8,4,15,.48),rgba(8,4,15,.18))}',
      '.loopy-mission-rail div:first-child{border-left:0}',
      '.loopy-mission-rail small,.loopy-ledger span,.loopy-host-grid h3,.loopy-signal-strip span{display:block;color:var(--loopy-cyan-soft);font:800 .62rem/1.1 Geist Mono,monospace;text-transform:uppercase;letter-spacing:.1em}',
      '.loopy-mission-rail strong{display:block;margin-top:.38rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--loopy-ink);font:700 .74rem/1.25 Geist Mono,monospace}',
      '.loopy-phase-line{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));max-width:820px;margin-top:.75rem;border-top:1px solid var(--loopy-line);border-bottom:1px solid var(--loopy-line)}',
      '.loopy-phase-line span{min-width:0;border-left:1px solid var(--loopy-line);padding:.68rem .76rem;background:rgba(8,4,15,.22)}',
      '.loopy-phase-line span:first-child{border-left:0}',
      '.loopy-phase-line b{display:block;color:var(--loopy-ink);font:800 .64rem/1 Geist Mono,monospace;text-transform:uppercase;letter-spacing:.1em}',
      '.loopy-phase-line small{display:block;margin-top:.32rem;color:var(--loopy-quiet);font:600 .72rem/1.25 Instrument Sans,sans-serif}',
      '.loopy-ledger{display:grid;margin-top:1.35rem;max-width:660px;border-top:1px solid var(--loopy-line-strong)}',
      '.loopy-ledger div{display:grid;grid-template-columns:minmax(5.4rem,.42fr) minmax(0,1fr);gap:1rem;align-items:center;border-bottom:1px solid var(--loopy-line);background:rgba(8,4,15,.22);padding:.84rem 0}',
      '.loopy-ledger strong{color:var(--loopy-ink);font:650 .92rem/1.28 Instrument Sans,sans-serif}',
      '.loopy-host-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;margin-top:1rem;max-width:660px;border:1px solid var(--loopy-line-strong);background:var(--loopy-line-strong)}',
      '.loopy-host-grid section{min-width:0;background:rgba(8,4,15,.72);padding:.82rem .85rem}',
      '.loopy-host-grid h3{margin:0 0 .55rem;color:var(--loopy-ink)}',
      '.loopy-host-grid code{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--loopy-accent-soft);font:700 .68rem/1.45 Geist Mono,monospace}',
      '.loopy-signal-strip{display:flex;flex-wrap:wrap;gap:0;margin-top:.8rem;max-width:660px;border-left:1px solid var(--loopy-line)}',
      '.loopy-signal-strip span{border:1px solid var(--loopy-line);border-left:0;background:rgba(8,4,15,.2);padding:.54rem .62rem;color:var(--loopy-muted)}',
      '.loopy-demo-grid{display:grid;grid-template-columns:minmax(18rem,1.05fr) minmax(17rem,.82fr);gap:1px;align-items:stretch;max-width:1020px;border:1px solid var(--loopy-line-strong);background:var(--loopy-line-strong)}',
      '.loopy-demo-frame{position:relative;display:block;min-height:28rem;background:rgba(8,4,15,.72);overflow:hidden;color:var(--loopy-ink);text-decoration:none}',
      '.loopy-demo-frame img{width:100%;height:100%;min-height:28rem;object-fit:cover;display:block;filter:saturate(.92) contrast(1.06) brightness(.78)}',
      '.loopy-demo-frame span{position:absolute;left:0;bottom:0;border-top:1px solid var(--loopy-line-strong);border-right:1px solid var(--loopy-line-strong);background:rgba(8,4,15,.78);padding:.78rem .9rem;color:var(--loopy-cyan-soft);font:800 .66rem/1 Geist Mono,monospace;text-transform:uppercase;letter-spacing:.1em}',
      '.loopy-demo-panel{display:flex;min-width:0;flex-direction:column;justify-content:center;background:rgba(8,4,15,.56);padding:1.35rem}',
      '.loopy-ledger--demo{margin-top:1rem}',
      '.loopy-ledger--demo div{grid-template-columns:8rem minmax(0,1fr)}',
      '.loopy-signal-strip--demo{margin-top:1rem}',
      '@media (max-width:980px){.loopy-brand small{display:none}.loopy-demo-grid{grid-template-columns:1fr}.loopy-demo-frame,.loopy-demo-frame img{min-height:18rem}.loopy-copy--demo{width:min(680px,100%)}}',
      '@media (max-width:700px){.loopy-topbar{padding:.8rem .9rem;align-items:center}.loopy-brand small{display:none}.loopy-mark{width:.95rem;height:.95rem}.loopy-nav a[href="#loopy-proof"]{display:none}.loopy-nav a,.loopy-lang-button{min-height:2.2rem;padding:0 .62rem;font-size:.6rem}.loopy-lang-button{margin-left:.25rem}.loopy-scroll-meter{top:3.25rem;left:1rem}.loopy-stage{padding:5.25rem 1rem 1.2rem}.loopy-stage--hero{align-items:start;padding-top:7.1rem}.loopy-stage--eye,.loopy-stage--demo{align-items:end}.loopy-copy--hero,.loopy-copy--proof,.loopy-copy--demo,.loopy-stage--eye .loopy-copy{width:100%;margin:0}.loopy-title{font-size:clamp(3rem,15vw,4.65rem);line-height:.86}.loopy-title--small{font-size:clamp(2.55rem,12vw,3.55rem);max-width:22rem}.loopy-title--demo{font-size:clamp(2.35rem,11vw,3.15rem);max-width:22rem}.loopy-sub{max-width:22rem;margin-top:.85rem;font-size:.94rem}.loopy-kicker{margin-bottom:.75rem}.loopy-kicker span{min-height:1.45rem;padding:0 .5rem;font-size:.55rem}.loopy-actions{margin-top:1rem}.loopy-btn{min-height:2.65rem;padding:0 .72rem;font-size:.58rem}.loopy-mission-rail{display:none}.loopy-phase-line{grid-template-columns:repeat(2,minmax(0,1fr));margin-top:.95rem}.loopy-phase-line span:nth-child(3){border-left:0;border-top:1px solid var(--loopy-line)}.loopy-phase-line span:nth-child(4){border-top:1px solid var(--loopy-line)}.loopy-mission-rail small,.loopy-ledger span,.loopy-host-grid h3,.loopy-signal-strip span{font-size:.54rem}.loopy-phase-line small{display:none}.loopy-ledger{margin-top:.9rem}.loopy-ledger div{grid-template-columns:4.7rem minmax(0,1fr);padding:.62rem 0}.loopy-ledger strong{font-size:.75rem}.loopy-host-grid{grid-template-columns:1fr;margin-top:.75rem}.loopy-host-grid code{font-size:.57rem}.loopy-signal-strip{display:none}.loopy-demo-grid{border:0;background:transparent}.loopy-demo-frame{min-height:10.5rem;border:1px solid var(--loopy-line-strong)}.loopy-demo-frame img{min-height:10.5rem}.loopy-demo-panel{padding:.9rem 0 0;background:transparent}.loopy-ledger--demo div{grid-template-columns:5.8rem minmax(0,1fr)}body[data-loopy-view="eye"] .loopy-scrim{background:linear-gradient(180deg,rgba(8,4,15,.16),rgba(8,4,15,.14) 42%,rgba(8,4,15,.82)),rgba(18,6,29,.02)}body[data-loopy-view="demo"] .loopy-scrim{background:linear-gradient(180deg,rgba(8,4,15,.08),rgba(8,4,15,.18) 38%,rgba(8,4,15,.86)),rgba(18,6,29,.02)}}',
      '.loopy-cue{display:flex;align-items:center;gap:.65rem;margin:0 0 1rem;color:var(--loopy-cyan-soft);font:800 .66rem/1 Geist Mono,monospace;letter-spacing:.14em;text-transform:uppercase}',
      '.loopy-cue:before{content:"";display:block;width:2.25rem;height:1px;background:var(--loopy-cyan);opacity:.9}',
      '.loopy-title{line-height:.94;text-transform:none;font-weight:780}',
      '.loopy-title--small,.loopy-title--demo{line-height:.96}',
      '.loopy-sub{max-width:42rem}',
      '.loopy-orbit-flow{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.62rem;max-width:820px;margin-top:1.65rem;perspective:900px}',
      '.loopy-orbit-flow article{position:relative;min-width:0;min-height:8.3rem;padding:.9rem .85rem .85rem;border:1px solid var(--loopy-line);border-top-color:var(--loopy-line-strong);background:linear-gradient(180deg,rgba(8,4,15,.58),rgba(18,6,29,.22));box-shadow:0 16px 44px rgba(8,4,15,.18);transition:transform .28s ease,border-color .28s ease,background .28s ease}',
      '.loopy-orbit-flow article:nth-child(1){transform:translateY(.35rem) rotate(-1.8deg)}',
      '.loopy-orbit-flow article:nth-child(2){transform:translateY(.05rem) rotate(.7deg)}',
      '.loopy-orbit-flow article:nth-child(3){transform:translateY(.5rem) rotate(-.8deg)}',
      '.loopy-orbit-flow article:nth-child(4){transform:translateY(.15rem) rotate(1.5deg)}',
      '.loopy-orbit-flow article:hover{transform:translateY(-.2rem) rotate(0deg);border-color:var(--loopy-cyan);background:linear-gradient(180deg,rgba(18,6,29,.72),rgba(8,4,15,.38))}',
      '.loopy-orbit-flow span{display:block;color:var(--loopy-cyan-soft);font:800 .62rem/1 Geist Mono,monospace;letter-spacing:.12em}',
      '.loopy-orbit-flow b{display:block;margin-top:1.1rem;color:var(--loopy-ink);font:760 1rem/1.1 Instrument Sans,sans-serif;letter-spacing:0}',
      '.loopy-orbit-flow small{display:block;margin-top:.45rem;color:var(--loopy-muted);font:560 .78rem/1.34 Instrument Sans,sans-serif;letter-spacing:0}',
      '.loopy-orbit-flow--proof{grid-template-columns:repeat(2,minmax(0,1fr));max-width:610px;margin-top:1.35rem}',
      '.loopy-orbit-flow--proof article{min-height:6.7rem}',
      '.loopy-install-stack{display:grid;gap:.58rem;margin-top:1rem;max-width:680px}',
      '.loopy-install-stack>p{margin:0 0 .2rem;color:var(--loopy-muted);font:620 .86rem/1.35 Instrument Sans,sans-serif}',
      '.loopy-install-strip{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:.9rem;min-width:0;border:1px solid var(--loopy-line);background:linear-gradient(90deg,rgba(8,4,15,.68),rgba(18,6,29,.28));padding:.86rem .9rem;transition:border-color .2s ease,background .2s ease}',
      '.loopy-install-strip>div{min-width:0}',
      '.loopy-install-strip:hover,.loopy-install-strip:focus-within{border-color:var(--loopy-cyan);background:linear-gradient(90deg,rgba(8,4,15,.78),rgba(33,16,47,.45))}',
      '.loopy-install-strip span{display:block;margin-bottom:.45rem;color:var(--loopy-ink);font:800 .68rem/1 Geist Mono,monospace;letter-spacing:.12em;text-transform:uppercase}',
      '.loopy-install-strip code{display:block;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--loopy-accent-soft);font:700 .7rem/1.45 Geist Mono,monospace}',
      '.loopy-copy-command{display:inline-flex;align-items:center;justify-content:center;min-width:4.6rem;min-height:2.35rem;border:1px solid var(--loopy-line-strong);background:rgba(247,237,255,.08);color:var(--loopy-ink);font:800 .62rem/1 Geist Mono,monospace;letter-spacing:.11em;text-transform:uppercase;cursor:pointer;opacity:0;transform:translateX(.35rem);transition:opacity .2s ease,transform .2s ease,background .2s ease,border-color .2s ease}',
      '.loopy-install-strip:hover .loopy-copy-command,.loopy-install-strip:focus-within .loopy-copy-command,.loopy-copy-command[data-copied="true"]{opacity:1;transform:translateX(0)}',
      '.loopy-copy-command:hover,.loopy-copy-command[data-copied="true"]{background:var(--loopy-ink);border-color:var(--loopy-ink);color:var(--loopy-bg-deep)}',
      '.loopy-demo-stage{display:grid;grid-template-columns:minmax(18rem,.72fr) minmax(35rem,1.08fr);gap:1.4rem;align-items:center;max-width:1120px}',
      '.loopy-card-hint{margin:.9rem 0 0;color:var(--loopy-quiet);font:800 .64rem/1 Geist Mono,monospace;letter-spacing:.12em;text-transform:uppercase}',
      '.loopy-demo-deck{position:relative;min-height:31rem;perspective:1200px;transform-style:preserve-3d}',
      '.loopy-skill-card{position:absolute;top:50%;left:50%;width:min(22.5rem,42vw);min-height:28rem;padding:1rem;border:1px solid var(--loopy-line-strong);background:linear-gradient(145deg,rgba(8,4,15,.82),rgba(33,16,47,.66));box-shadow:0 28px 80px rgba(8,4,15,.44);overflow:hidden;outline:0;transition:transform .46s cubic-bezier(.2,.8,.2,1),border-color .3s ease,filter .3s ease,opacity .3s ease}',
      '.loopy-skill-card--clone{transform:translate3d(-62%,-50%,0) rotate(-8deg)}',
      '.loopy-skill-card--frontend{transform:translate3d(-18%,-47%,0) rotate(8deg)}',
      '.loopy-demo-deck[data-active-card="clone"] .loopy-skill-card--clone,.loopy-skill-card--clone:hover,.loopy-skill-card--clone:focus-visible{z-index:3;transform:translate3d(-66%,-52%,4rem) rotate(-3deg);border-color:var(--loopy-cyan)}',
      '.loopy-demo-deck[data-active-card="frontend"] .loopy-skill-card--frontend,.loopy-skill-card--frontend:hover,.loopy-skill-card--frontend:focus-visible{z-index:3;transform:translate3d(-14%,-52%,4rem) rotate(3deg);border-color:var(--loopy-cyan)}',
      '.loopy-demo-deck[data-active-card="clone"] .loopy-skill-card--frontend,.loopy-demo-deck[data-active-card="frontend"] .loopy-skill-card--clone{filter:saturate(.8) brightness(.86);opacity:.82}',
      '.loopy-card-back{position:absolute;inset:.7rem;border:1px solid var(--loopy-line);opacity:.16;pointer-events:none}',
      '.loopy-card-back:before,.loopy-card-back:after{content:"";position:absolute;inset:1.6rem;border:1px solid var(--loopy-line);transform:rotate(45deg)}',
      '.loopy-card-back:after{inset:3.15rem;border-color:var(--loopy-cyan)}',
      '.loopy-card-back span{position:absolute;left:50%;top:50%;width:4.4rem;height:4.4rem;border:1px solid var(--loopy-line-strong);transform:translate(-50%,-50%) rotate(45deg)}',
      '.loopy-card-back span:nth-child(2){width:2.65rem;height:2.65rem;border-color:var(--loopy-cyan)}',
      '.loopy-card-back span:nth-child(3){width:.7rem;height:.7rem;background:var(--loopy-cyan);border-color:var(--loopy-cyan)}',
      '.loopy-skill-card-inner{position:relative;z-index:1;display:grid;gap:.82rem}',
      '.loopy-skill-eyebrow{color:var(--loopy-cyan-soft);font:900 .62rem/1 Geist Mono,monospace;letter-spacing:.14em;text-transform:uppercase}',
      '.loopy-skill-card h3{margin:.05rem 0 0;color:var(--loopy-ink);font:800 1.35rem/1.05 Instrument Sans,sans-serif;letter-spacing:0}',
      '.loopy-skill-card p{margin:0;color:var(--loopy-muted);font:560 .86rem/1.42 Instrument Sans,sans-serif}',
      '.loopy-demo-frame{min-height:0;aspect-ratio:16/10;border:1px solid var(--loopy-line);background:rgba(8,4,15,.62)}',
      '.loopy-demo-frame img{width:100%;height:100%;min-height:0;object-fit:cover;filter:saturate(.92) contrast(1.03) brightness(.82)}',
      '.loopy-compare{display:grid;gap:.65rem}',
      '.loopy-compare section{min-height:6.3rem;border:1px solid var(--loopy-line);background:rgba(8,4,15,.45);padding:.8rem}',
      '.loopy-compare section:last-child{border-color:rgba(122,240,255,.42);background:rgba(18,6,29,.48)}',
      '.loopy-compare span{display:block;color:var(--loopy-cyan-soft);font:850 .58rem/1 Geist Mono,monospace;letter-spacing:.12em;text-transform:uppercase}',
      '.loopy-compare p{margin:.58rem 0 0;color:var(--loopy-muted);font:560 .82rem/1.35 Instrument Sans,sans-serif}',
      '.loopy-mini-tags{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.1rem}',
      '.loopy-mini-tags span{border:1px solid var(--loopy-line);background:rgba(247,237,255,.06);padding:.38rem .46rem;color:var(--loopy-muted);font:800 .55rem/1 Geist Mono,monospace;letter-spacing:.1em;text-transform:uppercase}',
      '@media (max-width:980px){.loopy-demo-stage{grid-template-columns:1fr;gap:.8rem}.loopy-demo-deck{min-height:23rem}.loopy-skill-card{width:min(20rem,56vw);min-height:21rem}.loopy-skill-card p{font-size:.78rem}.loopy-compare section{min-height:5.25rem}.loopy-copy--demo{width:min(720px,100%)}}',
      '@media (max-width:700px){.loopy-cue{font-size:.56rem;margin-bottom:.7rem}.loopy-cue:before{width:1.45rem}.loopy-title{font-size:clamp(2.8rem,13.2vw,4.05rem);line-height:.98}.loopy-title--small{font-size:clamp(2.2rem,10vw,3.15rem);line-height:1;max-width:22rem}.loopy-title--demo{font-size:clamp(2.05rem,9vw,2.85rem);line-height:1;max-width:22rem}.loopy-sub{max-width:22rem}.loopy-orbit-flow{grid-template-columns:repeat(2,minmax(0,1fr));gap:.42rem;max-width:22rem;margin-top:1rem}.loopy-orbit-flow article{min-height:6.25rem;padding:.68rem;transform:none!important}.loopy-orbit-flow small{display:none}.loopy-orbit-flow b{margin-top:.85rem;font-size:.82rem}.loopy-orbit-flow--proof{display:none}.loopy-install-stack{max-width:22rem;margin-top:1rem}.loopy-install-stack>p{font-size:.78rem}.loopy-install-strip{grid-template-columns:1fr;gap:.62rem;padding:.72rem}.loopy-install-strip code{font-size:.54rem}.loopy-copy-command{opacity:1;transform:none;width:max-content;min-height:2rem;min-width:3.8rem}.loopy-demo-stage{display:block;max-width:22rem}.loopy-card-hint{display:none}.loopy-demo-deck{display:grid;gap:.55rem;min-height:0;margin-top:.85rem;perspective:none}.loopy-skill-card{position:relative;left:auto;top:auto;width:100%;min-height:0;padding:.78rem;transform:none!important}.loopy-skill-card--frontend{margin-left:1.1rem;width:calc(100% - 1.1rem)}.loopy-skill-card h3{font-size:1.05rem}.loopy-skill-card p{font-size:.73rem}.loopy-demo-frame{aspect-ratio:16/8}.loopy-compare{grid-template-columns:1fr 1fr;gap:.42rem}.loopy-compare section{min-height:4.4rem;padding:.58rem}.loopy-compare p{font-size:.64rem}.loopy-mini-tags span{font-size:.48rem}}',
      '@media (max-width:700px){body[data-loopy-view="demo"] .loopy-stage{padding-top:4.55rem;padding-bottom:.75rem}body[data-loopy-view="demo"] .loopy-cue{margin-bottom:.5rem}body[data-loopy-view="demo"] .loopy-title--demo{font-size:clamp(1.9rem,8vw,2.5rem);line-height:1}body[data-loopy-view="demo"] .loopy-sub{margin-top:.5rem;font-size:.82rem;line-height:1.32;max-width:21rem}.loopy-demo-deck{gap:.45rem;margin-top:.62rem}.loopy-skill-card{padding:.62rem}.loopy-skill-eyebrow{font-size:.52rem}.loopy-demo-frame{aspect-ratio:16/7}.loopy-skill-card h3{font-size:.94rem}.loopy-skill-card>p,.loopy-skill-card-inner>p{display:none}.loopy-mini-tags{display:none}.loopy-compare section{min-height:3.5rem;padding:.46rem}.loopy-compare p{display:block;margin-top:.38rem;font-size:.58rem;line-height:1.25}.loopy-skill-card--frontend{margin-left:.65rem;width:calc(100% - .65rem)}}',
      '.loopy-orbit-flow--rail{gap:0;max-width:780px;margin-top:1.05rem;border-top:1px solid var(--loopy-line-strong);border-bottom:1px solid var(--loopy-line-strong);perspective:none}',
      '.loopy-orbit-flow--rail article{display:grid;grid-template-columns:auto minmax(0,1fr);gap:.2rem .62rem;align-content:center;min-height:4.35rem;padding:.64rem .74rem;border:0;border-left:1px solid var(--loopy-line);background:linear-gradient(90deg,rgba(8,4,15,.58),rgba(18,6,29,.18));box-shadow:none;transform:none!important}',
      '.loopy-orbit-flow--rail article:first-child{border-left:0}',
      '.loopy-orbit-flow--rail article:hover{transform:none!important;border-color:var(--loopy-line);background:linear-gradient(90deg,rgba(8,4,15,.74),rgba(33,16,47,.28))}',
      '.loopy-orbit-flow--rail span{grid-row:1 / span 2;color:var(--loopy-cyan-soft);font-size:.66rem;align-self:start}',
      '.loopy-orbit-flow--rail b{margin:0;color:var(--loopy-ink);font-size:.92rem;line-height:1.08}',
      '.loopy-orbit-flow--rail small{margin:.08rem 0 0;color:var(--loopy-muted);font-size:.72rem;line-height:1.24}',
      '.loopy-orbit-flow--proof.loopy-orbit-flow--rail{grid-template-columns:repeat(4,minmax(0,1fr));max-width:680px;margin-top:.95rem}',
      '.loopy-orbit-flow--proof.loopy-orbit-flow--rail article{min-height:4rem}',
      '.loopy-install-stack{gap:.46rem;margin-top:.8rem;max-width:640px}',
      '.loopy-install-stack>p{font-size:.8rem;line-height:1.32}',
      '.loopy-install-strip{padding:.64rem .72rem;gap:.68rem}',
      '.loopy-install-strip span{margin-bottom:.28rem;font-size:.62rem}',
      '.loopy-install-strip code{font-size:.62rem;line-height:1.34}',
      '.loopy-copy-command{min-width:4rem;min-height:2rem;font-size:.56rem}',
      '.loopy-playing-deck{min-height:25rem;max-width:42rem;perspective:calc(var(--vh,1vh) * 100);perspective-origin:center}',
      '.loopy-playing-deck .loopy-skill-card{width:clamp(15.5rem,24vw,18.75rem);min-height:0;aspect-ratio:314 / 438;padding:.62rem;border:0;border-radius:.86rem;background:var(--loopy-ink);color:var(--loopy-bg-deep);box-shadow:0 30px 90px rgba(8,4,15,.46);transform-style:preserve-3d;overflow:hidden;transition:transform .5s cubic-bezier(.4,0,.1,1),filter .34s ease,opacity .34s ease}',
      '.loopy-playing-deck .loopy-skill-card--clone{transform:translate3d(-72%,-50%,0) rotate(-10deg)}',
      '.loopy-playing-deck .loopy-skill-card--frontend{transform:translate3d(-22%,-47%,0) rotate(8deg)}',
      '.loopy-playing-deck[data-active-card="clone"] .loopy-skill-card--clone,.loopy-playing-deck .loopy-skill-card--clone:hover,.loopy-playing-deck .loopy-skill-card--clone:focus-visible{z-index:4;transform:translate3d(-78%,-52%,4rem) rotate(-3deg)}',
      '.loopy-playing-deck[data-active-card="frontend"] .loopy-skill-card--frontend,.loopy-playing-deck .loopy-skill-card--frontend:hover,.loopy-playing-deck .loopy-skill-card--frontend:focus-visible{z-index:4;transform:translate3d(-10%,-52%,4rem) rotate(3deg)}',
      '.loopy-playing-deck[data-active-card="clone"] .loopy-skill-card--frontend,.loopy-playing-deck[data-active-card="frontend"] .loopy-skill-card--clone{filter:saturate(.9) brightness(.9);opacity:.96}',
      '.loopy-playing-deck .loopy-card-back{inset:0;border:0;border-radius:.86rem;background:var(--loopy-cyan) url("/loopy-card-back.png") center/100% 100% no-repeat;opacity:1;z-index:2;transform:rotateY(0deg);transform-origin:center;backface-visibility:hidden;will-change:transform,opacity;transition:transform .72s cubic-bezier(.22,.8,.12,1),opacity .18s linear .36s;pointer-events:none}',
      '.loopy-playing-deck .loopy-card-back:before,.loopy-playing-deck .loopy-card-back:after,.loopy-playing-deck .loopy-card-back span{display:none}',
      '.loopy-playing-deck .loopy-skill-card-inner{position:absolute;inset:.62rem;z-index:3;height:auto;display:flex;flex-direction:column;gap:.58rem;border-radius:.58rem;background:var(--loopy-ink);padding:.78rem;color:var(--loopy-bg-deep);opacity:0;transform:rotateY(180deg);transform-origin:center;backface-visibility:hidden;will-change:transform,opacity;transition:transform .72s cubic-bezier(.22,.8,.12,1),opacity .16s linear .08s}',
      '.loopy-playing-deck .loopy-skill-card--frontend .loopy-card-back,.loopy-playing-deck .loopy-skill-card--frontend .loopy-skill-card-inner{transition-delay:.18s}',
      '.loopy-playing-deck[data-card-reveal="clone"] .loopy-skill-card--clone .loopy-card-back,.loopy-playing-deck[data-card-reveal="all"] .loopy-card-back{opacity:0;transform:rotateY(-180deg)}',
      '.loopy-playing-deck[data-card-reveal="clone"] .loopy-skill-card--clone .loopy-skill-card-inner,.loopy-playing-deck[data-card-reveal="all"] .loopy-skill-card-inner{opacity:1;transform:rotateY(0deg)}',
      '.loopy-card-face-head{display:flex;align-items:center;justify-content:space-between;gap:.75rem;color:var(--loopy-bg-deep)}',
      '.loopy-card-face-head b{font:900 2.35rem/.82 Geist Mono,monospace;letter-spacing:-.06em}',
      '.loopy-card-face-head--bottom{margin-top:auto;transform:rotate(180deg)}',
      '.loopy-playing-deck .loopy-skill-eyebrow{color:var(--loopy-bg-deep);font-size:.58rem;letter-spacing:.1em}',
      '.loopy-playing-deck .loopy-skill-card h3{color:var(--loopy-bg-deep);font-size:1.05rem;line-height:1.02}',
      '.loopy-playing-deck .loopy-skill-card p{color:rgba(8,4,15,.7);font-size:.72rem;line-height:1.25}',
      '.loopy-playing-deck .loopy-demo-frame{border:1px solid rgba(8,4,15,.18);aspect-ratio:16/8.8;background:rgba(8,4,15,.06)}',
      '.loopy-playing-deck .loopy-demo-frame img{filter:saturate(.96) contrast(1.02) brightness(.9)}',
      '.loopy-playing-deck .loopy-compare{gap:.42rem}',
      '.loopy-playing-deck .loopy-compare section{min-height:4.2rem;border-color:rgba(8,4,15,.18);background:rgba(8,4,15,.045);padding:.52rem}',
      '.loopy-playing-deck .loopy-compare section:last-child{border-color:rgba(8,4,15,.32);background:rgba(8,4,15,.08)}',
      '.loopy-playing-deck .loopy-compare span{color:var(--loopy-bg-deep);font-size:.5rem}',
      '.loopy-playing-deck .loopy-compare p{color:rgba(8,4,15,.66);font-size:.62rem;line-height:1.22}',
      '.loopy-playing-deck .loopy-mini-tags{gap:.24rem}',
      '.loopy-playing-deck .loopy-mini-tags span{border-color:rgba(8,4,15,.18);background:rgba(8,4,15,.055);color:rgba(8,4,15,.72);font-size:.46rem;padding:.28rem .34rem}',
      '@media (min-width:701px) and (max-width:980px){body[data-loopy-view="eye"] .loopy-stage{align-items:end;padding-top:6.1rem;padding-bottom:.95rem}.loopy-stage--eye .loopy-copy{width:min(690px,100%)}body[data-loopy-view="eye"] .loopy-title--small{font-size:clamp(3rem,8vw,4.5rem);line-height:.92}body[data-loopy-view="eye"] .loopy-sub{margin-top:.8rem;font-size:1rem;line-height:1.34;max-width:39rem}.loopy-orbit-flow--proof.loopy-orbit-flow--rail{margin-top:.72rem}.loopy-orbit-flow--proof.loopy-orbit-flow--rail article{min-height:3.15rem;padding:.5rem .55rem}.loopy-orbit-flow--proof.loopy-orbit-flow--rail small{display:none}.loopy-orbit-flow--proof.loopy-orbit-flow--rail b{font-size:.82rem}.loopy-install-stack{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.42rem;margin-top:.52rem;max-width:690px}.loopy-install-stack>p{grid-column:1 / -1;margin:0;font-size:.74rem}.loopy-install-strip{grid-template-columns:minmax(0,1fr) auto;padding:.54rem .58rem}.loopy-install-strip code{font-size:.54rem}.loopy-install-strip code+code{display:none}.loopy-copy-command{opacity:1;transform:none;min-width:3.4rem}}',
      '@media (min-width:701px) and (max-width:980px){body[data-loopy-view="demo"] .loopy-stage{align-items:center;padding-top:6rem;padding-bottom:1rem}.loopy-copy--demo{width:min(720px,100%)}.loopy-demo-stage{display:grid;grid-template-columns:minmax(0,.82fr) minmax(0,1fr);gap:.75rem;align-items:center;max-width:720px}.loopy-title--demo{font-size:clamp(2.65rem,6.6vw,3.8rem);line-height:.92}.loopy-stage--demo .loopy-sub{font-size:.9rem;line-height:1.32;max-width:20rem}.loopy-playing-deck{min-height:18rem;height:18rem;margin-top:0}.loopy-playing-deck .loopy-skill-card{width:10.8rem!important;padding:.42rem}.loopy-playing-deck .loopy-skill-card--clone{transform:translate3d(-68%,-50%,0) rotate(-8deg)}.loopy-playing-deck .loopy-skill-card--frontend{transform:translate3d(-46%,-48%,0) rotate(8deg)}.loopy-playing-deck[data-active-card="clone"] .loopy-skill-card--clone,.loopy-playing-deck .loopy-skill-card--clone:hover,.loopy-playing-deck .loopy-skill-card--clone:focus-visible{transform:translate3d(-76%,-52%,1.6rem) rotate(-3deg)}.loopy-playing-deck[data-active-card="frontend"] .loopy-skill-card--frontend,.loopy-playing-deck .loopy-skill-card--frontend:hover,.loopy-playing-deck .loopy-skill-card--frontend:focus-visible{transform:translate3d(-50%,-52%,1.6rem) rotate(3deg)}.loopy-playing-deck .loopy-skill-card-inner{padding:.52rem;gap:.38rem}.loopy-playing-deck .loopy-skill-card h3{font-size:.82rem}.loopy-playing-deck .loopy-skill-card p{display:none}.loopy-playing-deck .loopy-demo-frame{aspect-ratio:16/7.2}.loopy-playing-deck .loopy-mini-tags{display:none}.loopy-playing-deck .loopy-compare{grid-template-columns:1fr;gap:.28rem}.loopy-playing-deck .loopy-compare section{min-height:2.8rem;padding:.42rem}.loopy-playing-deck .loopy-compare p{font-size:.54rem;margin-top:.25rem}}',
      '@media (max-width:700px){body[data-loopy-view="eye"] .loopy-stage{padding-top:4.8rem;padding-bottom:.78rem}body[data-loopy-view="eye"] .loopy-title--small{font-size:clamp(2.05rem,10.5vw,3rem);line-height:.96}body[data-loopy-view="eye"] .loopy-sub{margin-top:.62rem;font-size:.82rem;line-height:1.3}.loopy-orbit-flow--rail{grid-template-columns:repeat(2,minmax(0,1fr));max-width:22rem;margin-top:.78rem}.loopy-orbit-flow--proof.loopy-orbit-flow--rail{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));margin-top:.66rem}.loopy-orbit-flow--rail article{min-height:3.35rem;padding:.48rem .52rem}.loopy-orbit-flow--rail span{font-size:.54rem}.loopy-orbit-flow--rail b{font-size:.76rem}.loopy-orbit-flow--rail small{display:none}.loopy-install-stack{gap:.34rem;margin-top:.56rem;max-width:22rem}.loopy-install-stack>p{font-size:.68rem;line-height:1.25}.loopy-install-strip{grid-template-columns:minmax(0,1fr) auto;gap:.46rem;padding:.48rem .52rem}.loopy-install-strip span{margin-bottom:.16rem;font-size:.52rem}.loopy-install-strip code{font-size:.48rem;line-height:1.26}.loopy-install-strip code+code{display:none}.loopy-copy-command{min-width:3.3rem;min-height:1.8rem;font-size:.48rem}}',
      '@media (max-width:700px){body[data-loopy-view="demo"] .loopy-stage{padding-top:4.2rem;padding-bottom:.68rem}.loopy-demo-stage{display:grid;grid-template-columns:1fr;max-width:22rem}.loopy-playing-deck{position:relative;display:block;min-height:17.8rem;height:17.8rem;margin-top:.58rem;perspective:80rem}.loopy-playing-deck .loopy-skill-card{position:absolute!important;left:50%!important;top:50%!important;width:13.25rem!important;min-height:0!important;padding:.46rem!important;border-radius:.68rem}.loopy-playing-deck .loopy-card-back{border-radius:.68rem}.loopy-playing-deck .loopy-skill-card--clone{margin:0!important;transform:translate3d(-66%,-51%,0) rotate(-8deg)!important}.loopy-playing-deck .loopy-skill-card--frontend{margin:0!important;transform:translate3d(-28%,-47%,0) rotate(8deg)!important}.loopy-playing-deck[data-active-card="clone"] .loopy-skill-card--clone,.loopy-playing-deck .loopy-skill-card--clone:hover,.loopy-playing-deck .loopy-skill-card--clone:focus-visible{transform:translate3d(-72%,-53%,3rem) rotate(-3deg)!important}.loopy-playing-deck[data-active-card="frontend"] .loopy-skill-card--frontend,.loopy-playing-deck .loopy-skill-card--frontend:hover,.loopy-playing-deck .loopy-skill-card--frontend:focus-visible{transform:translate3d(-20%,-51%,3rem) rotate(3deg)!important}.loopy-playing-deck .loopy-skill-card-inner{padding:.52rem;gap:.38rem}.loopy-card-face-head b{font-size:1.55rem}.loopy-card-face-head--bottom{display:none}.loopy-playing-deck .loopy-skill-card h3{font-size:.78rem}.loopy-playing-deck .loopy-skill-card p{display:none}.loopy-playing-deck .loopy-demo-frame{aspect-ratio:16/7.2}.loopy-playing-deck .loopy-compare{grid-template-columns:1fr;gap:.24rem}.loopy-playing-deck .loopy-compare section{min-height:2.35rem;padding:.32rem}.loopy-playing-deck .loopy-compare p{display:block;margin-top:.2rem;font-size:.5rem}.loopy-playing-deck .loopy-mini-tags{display:none}}',
      '@media (max-width:700px){body[data-loopy-view="demo"] .loopy-stage{padding-bottom:1.5rem}body[data-loopy-view="demo"] .loopy-sub{font-size:.78rem;line-height:1.28}.loopy-playing-deck{min-height:12.4rem;height:12.4rem;margin-top:.18rem}.loopy-playing-deck .loopy-skill-card{width:9.2rem!important;padding:.34rem!important}.loopy-playing-deck .loopy-skill-card--clone{transform:translate3d(-63%,-53%,0) rotate(-8deg)!important}.loopy-playing-deck .loopy-skill-card--frontend{transform:translate3d(-31%,-54%,0) rotate(8deg)!important}.loopy-playing-deck[data-active-card="clone"] .loopy-skill-card--clone,.loopy-playing-deck .loopy-skill-card--clone:hover,.loopy-playing-deck .loopy-skill-card--clone:focus-visible{transform:translate3d(-69%,-55%,2.4rem) rotate(-3deg)!important}.loopy-playing-deck[data-active-card="frontend"] .loopy-skill-card--frontend,.loopy-playing-deck .loopy-skill-card--frontend:hover,.loopy-playing-deck .loopy-skill-card--frontend:focus-visible{transform:translate3d(-23%,-55%,2.4rem) rotate(3deg)!important}.loopy-playing-deck .loopy-skill-card-inner{padding:.38rem;gap:.24rem}.loopy-playing-deck .loopy-demo-frame{aspect-ratio:16/6.2}.loopy-playing-deck .loopy-skill-card h3{font-size:.64rem}.loopy-playing-deck .loopy-compare section{min-height:1.8rem}.loopy-playing-deck .loopy-compare p{font-size:.43rem}.loopy-card-face-head b{font-size:1.15rem}.loopy-playing-deck .loopy-skill-eyebrow{font-size:.42rem}}',
      '@media (prefers-reduced-motion:reduce){.loopy-stage,.loopy-btn,.loopy-lang-menu,.loopy-orbit-flow article,.loopy-copy-command,.loopy-skill-card,.loopy-card-back,.loopy-skill-card-inner{transition:none}}'
    ].join('');
    document.head.appendChild(style);
  }

  function escapeHtml(value){
    return String(value).replace(/[&<>"']/g, function(char){
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[char];
    });
  }

  function escapeAttr(value){
    return escapeHtml(value).replace(/\n/g, '&#10;');
  }

  function copyButtonHtml(text){
    var copy = currentCopy();
    return '<button class="loopy-copy-command" type="button" data-loopy-copy="' + escapeAttr(text) + '" aria-label="' + escapeHtml(copy.copyAction) + '"><span>' + escapeHtml(copy.copyAction) + '</span></button>';
  }

  function cardBackHtml(){
    return '<span class="loopy-card-back" aria-hidden="true"><span></span><span></span><span></span></span>';
  }

  function stageHtml(kind){
    var copy = currentCopy();
    var codexCommands = copy.codexCommandA + '\n' + copy.codexCommandB;
    var claudeCommands = copy.claudeCommandA + '\n' + copy.claudeCommandB;
    if(kind === 'hero'){
      return [
        '<main class="loopy-copy loopy-copy--hero" aria-labelledby="loopy-hero-title">',
        '<p class="loopy-cue"><span>' + escapeHtml(copy.cueProduct) + '</span></p>',
        '<h1 id="loopy-hero-title" class="loopy-title">' + escapeHtml(copy.heroTitle) + '</h1>',
        '<p class="loopy-sub">' + escapeHtml(copy.heroText) + '</p>',
        '<div class="loopy-orbit-flow loopy-orbit-flow--rail" aria-label="' + escapeHtml(copy.flowLabel) + '">',
        '<article><span>01</span><b>' + escapeHtml(copy.phasePlan) + '</b><small>' + escapeHtml(copy.phasePlanText) + '</small></article>',
        '<article><span>02</span><b>' + escapeHtml(copy.phaseBuild) + '</b><small>' + escapeHtml(copy.phaseBuildText) + '</small></article>',
        '<article><span>03</span><b>' + escapeHtml(copy.phaseReview) + '</b><small>' + escapeHtml(copy.phaseReviewText) + '</small></article>',
        '<article><span>04</span><b>' + escapeHtml(copy.phaseVerify) + '</b><small>' + escapeHtml(copy.phaseVerifyText) + '</small></article>',
        '</div>',
        '</main>'
      ].join('');
    }
    if(kind === 'eye'){
      return [
        '<section class="loopy-copy loopy-copy--proof" aria-labelledby="loopy-eye-title">',
        '<p class="loopy-cue"><span>' + escapeHtml(copy.eyeLabel) + '</span></p>',
        '<h2 id="loopy-eye-title" class="loopy-title loopy-title--small">' + escapeHtml(copy.eyeTitle) + '</h2>',
        '<p class="loopy-sub">' + escapeHtml(copy.eyeText) + '</p>',
        '<div class="loopy-orbit-flow loopy-orbit-flow--rail loopy-orbit-flow--proof" aria-label="' + escapeHtml(copy.skillsLabel) + '">',
        '<article><span>01</span><b>' + escapeHtml(copy.skillLoop.replace(/^\d+\.\s*/, '')) + '</b><small>' + escapeHtml(copy.skillLoopText) + '</small></article>',
        '<article><span>02</span><b>' + escapeHtml(copy.skillFrontend.replace(/^\d+\.\s*/, '')) + '</b><small>' + escapeHtml(copy.skillFrontendText) + '</small></article>',
        '<article><span>03</span><b>' + escapeHtml(copy.skillResearch.replace(/^\d+\.\s*/, '')) + '</b><small>' + escapeHtml(copy.skillResearchText) + '</small></article>',
        '<article><span>04</span><b>' + escapeHtml(copy.skillClone.replace(/^\d+\.\s*/, '')) + '</b><small>' + escapeHtml(copy.skillCloneText) + '</small></article>',
        '</div>',
        '<div class="loopy-install-stack" aria-label="' + escapeHtml(copy.commandLabel) + '">',
        '<p>' + escapeHtml(copy.installIntro) + '</p>',
        '<section class="loopy-install-strip"><div><span>' + escapeHtml(copy.hostCodexTitle) + '</span><code>' + escapeHtml(copy.codexCommandA) + '</code><code>' + escapeHtml(copy.codexCommandB) + '</code></div>' + copyButtonHtml(codexCommands) + '</section>',
        '<section class="loopy-install-strip"><div><span>' + escapeHtml(copy.hostClaudeTitle) + '</span><code>' + escapeHtml(copy.claudeCommandA) + '</code><code>' + escapeHtml(copy.claudeCommandB) + '</code></div>' + copyButtonHtml(claudeCommands) + '</section>',
        '</div>',
        '</section>'
      ].join('');
    }
    return [
      '<section class="loopy-copy loopy-copy--demo" aria-labelledby="loopy-demo-title">',
      '<p class="loopy-cue"><span>' + escapeHtml(copy.demoLabel) + '</span></p>',
      '<div class="loopy-demo-stage">',
      '<div>',
      '<h2 id="loopy-demo-title" class="loopy-title loopy-title--demo">' + escapeHtml(copy.demoTitle) + '</h2>',
      '<p class="loopy-sub">' + escapeHtml(copy.demoText) + '</p>',
      '<p class="loopy-card-hint">' + escapeHtml(copy.cardHint) + '</p>',
      '</div>',
      '<div class="loopy-demo-deck loopy-playing-deck" data-active-card="clone" data-card-reveal="backs" aria-label="' + escapeHtml(copy.skillsLabel) + '">',
      '<article class="loopy-skill-card loopy-skill-card--clone" data-demo-card="clone" tabindex="0">',
      cardBackHtml(),
      '<div class="loopy-skill-card-inner">',
      '<header class="loopy-card-face-head"><span class="loopy-skill-eyebrow">' + escapeHtml(copy.cloneSkillTitle) + '</span><b>C</b></header>',
      '<a class="loopy-demo-frame" href="https://github.com/beefiker/superloopy#clone-demo" target="_blank" rel="noopener noreferrer"><img src="/loopy-demo-transferloom.png" alt="Transferloom clone reference thumbnail"></a>',
      '<h3>' + escapeHtml(copy.withTitle) + '</h3>',
      '<p>' + escapeHtml(copy.cloneSkillText) + '</p>',
      '<div class="loopy-mini-tags"><span>' + escapeHtml(copy.demoProofA) + '</span><span>' + escapeHtml(copy.demoProofB) + '</span><span>' + escapeHtml(copy.demoProofC) + '</span></div>',
      '<footer class="loopy-card-face-head loopy-card-face-head--bottom"><span>' + escapeHtml(copy.demoProofLabel) + '</span><b>C</b></footer>',
      '</div>',
      '</article>',
      '<article class="loopy-skill-card loopy-skill-card--frontend" data-demo-card="frontend" tabindex="0">',
      cardBackHtml(),
      '<div class="loopy-skill-card-inner">',
      '<header class="loopy-card-face-head"><span class="loopy-skill-eyebrow">' + escapeHtml(copy.frontendSkillTitle) + '</span><b>F</b></header>',
      '<div class="loopy-compare">',
      '<section><span>' + escapeHtml(copy.beforeLabel) + '</span><p>' + escapeHtml(copy.frontendBefore) + '</p></section>',
      '<section><span>' + escapeHtml(copy.afterLabel) + '</span><p>' + escapeHtml(copy.frontendAfter) + '</p></section>',
      '</div>',
      '<h3>' + escapeHtml(copy.frontendSkillTitle) + '</h3>',
      '<p>' + escapeHtml(copy.frontendSkillText) + '</p>',
      '<div class="loopy-mini-tags"><span>DESIGN.md</span><span>' + escapeHtml(copy.crewBrowser) + '</span><span>' + escapeHtml(copy.demoProofD) + '</span></div>',
      '<footer class="loopy-card-face-head loopy-card-face-head--bottom"><span>' + escapeHtml(copy.demoProofLabel) + '</span><b>F</b></footer>',
      '</div>',
      '</article>',
      '</div>',
      '</div>',
      '</section>'
    ].join('');
  }

  function languageMenuHtml(){
    var copy = currentCopy();
    return [
      '<div class="loopy-lang" data-open="' + (languageMenuOpen ? 'true' : 'false') + '">',
      '<button class="loopy-lang-button" type="button" aria-haspopup="listbox" aria-expanded="' + (languageMenuOpen ? 'true' : 'false') + '" aria-label="' + escapeHtml(copy.language) + '"><span aria-hidden="true"></span>' + escapeHtml((languages.find(function(item){ return item.code === currentLanguage; }) || languages[0]).short) + '</button>',
      '<div class="loopy-lang-menu" role="listbox" aria-label="' + escapeHtml(copy.language) + '">',
      languages.map(function(language){
        return '<button type="button" role="option" data-loopy-lang-option="' + language.code + '" aria-pressed="' + (language.code === currentLanguage ? 'true' : 'false') + '"><span>' + escapeHtml(language.nativeName) + '</span><small>' + escapeHtml(language.short) + '</small></button>';
      }).join(''),
      '</div>',
      '</div>'
    ].join('');
  }

  function shellHtml(){
    var copy = currentCopy();
    return [
      '<div class="loopy-scrim" aria-hidden="true"></div>',
      '<div class="loopy-scroll-meter" aria-hidden="true"><span data-view="hero"></span><span data-view="eye"></span><span data-view="demo"></span></div>',
      '<div class="loopy-topbar">',
      '<a class="loopy-brand" href="#loopy-start" aria-label="Superloopy home"><span class="loopy-mark" aria-hidden="true"></span><span>' + escapeHtml(copy.brand) + '</span><small>systems online<br>proof required</small></a>',
      '<div class="loopy-topbar-right">',
      '<div class="loopy-nav" aria-label="Loopy links">',
      '<a href="#loopy-proof">' + escapeHtml(copy.navProof) + '</a>',
      '<a href="#loopy-demo">' + escapeHtml(copy.navDemo) + '</a>',
      '<a class="loopy-nav-install" href="https://github.com/beefiker/superloopy" target="_blank" rel="noopener noreferrer">' + escapeHtml(copy.navInstall) + '</a>',
      '</div>',
      languageMenuHtml(),
      '</div>',
      '</div>',
      '<div class="loopy-stage loopy-stage--hero">' + stageHtml('hero') + '</div>',
      '<div class="loopy-stage loopy-stage--eye">' + stageHtml('eye') + '</div>',
      '<div class="loopy-stage loopy-stage--demo">' + stageHtml('demo') + '</div>'
    ].join('');
  }

  function buildShell(){
    var shell = document.getElementById(shellId);
    if(!shell){
      shell = document.createElement('div');
      shell.id = shellId;
      document.body.appendChild(shell);
    }
    shell.innerHTML = shellHtml();
    document.body.setAttribute('data-loopy-lang', currentLanguage);
  }

  function muteOriginalDom(){
    var root = document.getElementById('__nuxt');
    if(!root) return;
    root.setAttribute('aria-hidden', 'true');
    root.setAttribute('inert', '');
  }

  function getScroller(){
    return document.querySelector('.lenis') || document.scrollingElement || document.documentElement;
  }

  function getLoader(){
    return document.querySelector('[data-v-1b2f4e78].fixed.inset-0.z-\\[1000\\], .fixed.inset-0.z-\\[1000\\]');
  }

  function formatLoaderPercent(value){
    var pct = Math.min(100, Math.max(0, Math.round(value || 0)));
    return String(pct).padStart(3, '0') + '%';
  }

  function readLoaderProgress(loader){
    var chunks = [];
    Array.prototype.forEach.call(loader.childNodes || [], function(node){
      if(node.nodeType === 3){
        chunks.push(node.nodeValue || '');
        return;
      }
      if(node.nodeType === 1 && !(node.classList && node.classList.contains('flex-grow'))){
        chunks.push(node.textContent || '');
      }
    });
    var text = chunks.join(' ');
    var matches = text.match(/(\d{1,3})\s*%/g);
    var source = matches && matches.length ? matches[matches.length - 1] : loader.getAttribute('data-loopy-loader-progress');
    var parsed = source ? Number(String(source).replace(/[^\d]/g, '')) : 0;
    return Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : 0;
  }

  function syncLoaderProgress(forceValue){
    var loader = getLoader();
    if(!loader) return;
    var pct = typeof forceValue === 'number' || loader.getAttribute('data-loopy-loader-hidden') === 'true' ? 100 : readLoaderProgress(loader);
    var label = formatLoaderPercent(pct);
    loader.style.setProperty('--loopy-loader-progress', Math.min(100, Math.max(0, Math.round(pct))) + '%');
    loader.setAttribute('data-loopy-loader-progress', label);
  }

  function stopLoaderProgressSync(){
    if(loaderProgressObserver){
      loaderProgressObserver.disconnect();
      loaderProgressObserver = null;
    }
    if(loaderProgressTimer){
      window.clearInterval(loaderProgressTimer);
      loaderProgressTimer = null;
    }
  }

  function wireLoaderProgress(){
    var loader = getLoader();
    if(!loader) return;
    syncLoaderProgress();
    if(!loaderProgressObserver){
      loaderProgressObserver = new MutationObserver(function(){
        syncLoaderProgress();
      });
      loaderProgressObserver.observe(loader, {childList:true, characterData:true, subtree:true});
    }
    if(!loaderProgressTimer){
      loaderProgressTimer = window.setInterval(function(){
        syncLoaderProgress();
        if(Date.now() - startedAt > maxPatchWindow || loader.getAttribute('data-loopy-loader-hidden') === 'true'){
          stopLoaderProgressSync();
        }
      }, 160);
    }
  }

  function sectionTop(name){
    var section = document.querySelector('[data-webgl-section="' + name + '"]');
    return section ? section.offsetTop : 0;
  }

  function maxScrollTop(){
    var scroller = getScroller();
    return Math.max(0, scroller.scrollHeight - scroller.clientHeight);
  }

  function clampScrollTarget(top){
    var maxTop = maxScrollTop();
    return maxTop > 0 ? Math.min(top, maxTop) : top;
  }

  function queryOffset(name, fallback){
    var params = new URLSearchParams(window.location.search);
    if(!params.has(name)) return fallback;
    var value = Number(params.get(name));
    return Number.isFinite(value) ? value : fallback;
  }

  function targetScrollTop(view){
    if(view === 'eye') return Math.max(0, sectionTop('biology') + queryOffset('loopyEyeOffset', 0));
    if(view === 'demo') return Math.max(0, sectionTop('crypto') + queryOffset('loopyDemoOffset', 0));
    return Math.max(0, sectionTop('landing'));
  }

  function nearestViewByScroll(top){
    return views.reduce(function(best, view){
      var distance = Math.abs(top - targetScrollTop(view));
      return distance < best.distance ? { view: view, distance: distance } : best;
    }, { view: 'hero', distance: Infinity });
  }

  function updateScrollClip(){
    if(transitioning || !document.getElementById(shellId)) return;
    var closest = nearestViewByScroll(getScroller().scrollTop);
    if(closest.distance > 90){
      document.body.setAttribute('data-loopy-scroll-clipped', 'true');
    } else {
      document.body.removeAttribute('data-loopy-scroll-clipped');
    }
  }

  function dispatchScrollEvents(includeResize){
    var scroller = getScroller();
    window.dispatchEvent(new Event('scroll'));
    scroller.dispatchEvent(new Event('scroll'));
    if(includeResize) window.dispatchEvent(new Event('resize'));
  }

  function setScrollTop(top, includeResize){
    var scroller = getScroller();
    scroller.scrollTop = top;
    dispatchScrollEvents(includeResize);
    updateScrollClip();
  }

  function lockCurrentViewScroll(duration){
    if(anchorLockTimer) window.clearTimeout(anchorLockTimer);
    var lockView = normalizeView(targetView || document.body.getAttribute('data-loopy-view') || 'hero');
    var until = performance.now() + duration;

    function align(){
      if(transitioning){
        anchorLockTimer = null;
        return;
      }
      if(normalizeView(targetView || document.body.getAttribute('data-loopy-view') || 'hero') !== lockView) return;
      var anchorTop = targetScrollTop(lockView);
      var currentTop = getScroller().scrollTop;
      if(Math.abs(currentTop - anchorTop) > 2 && Math.abs(currentTop - anchorTop) < window.innerHeight * 0.65){
        setScrollTop(anchorTop, false);
      }
    }

    function tick(){
      align();
      if(performance.now() < until){
        anchorLockTimer = window.setTimeout(tick, 40);
      } else {
        anchorLockTimer = null;
      }
    }

    tick();
    [120, 360, 820, 1500].forEach(function(delay){
      window.setTimeout(align, delay);
    });
  }

  function prewarmOrbitTargets(done){
    if(orbitPrewarmState === 'done'){
      if(done) done();
      return;
    }
    if(orbitPrewarmState === 'running') return;
    orbitPrewarmState = 'running';
    var heroTop = targetScrollTop('hero');
    var eyeTop = targetScrollTop('eye');
    var demoTop = targetScrollTop('demo');
    var finalTop = targetScrollTop(targetView || 'hero');
    var points = [
      heroTop + (eyeTop - heroTop) * 0.24,
      heroTop + (eyeTop - heroTop) * 0.56,
      heroTop + (eyeTop - heroTop) * 0.84,
      eyeTop,
      eyeTop + 1,
      eyeTop + (demoTop - eyeTop) * 0.14,
      eyeTop + (demoTop - eyeTop) * 0.38,
      eyeTop + (demoTop - eyeTop) * 0.66,
      eyeTop + (demoTop - eyeTop) * 0.9,
      demoTop,
      finalTop
    ];
    var index = 0;

    function step(){
      if(index < points.length){
        setScrollTop(points[index], false);
        index += 1;
        window.setTimeout(step, 128);
        return;
      }
      orbitPrewarmState = 'done';
      setScrollTop(finalTop, false);
      if(done) done();
    }

    step();
  }

  function prefersReducedMotion(){
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function viewIndex(view){
    var index = views.indexOf(view);
    return index >= 0 ? index : 0;
  }

  function normalizeView(view){
    return views.indexOf(view) >= 0 ? view : 'hero';
  }

  function stepView(direction){
    var currentIndex = viewIndex(targetView || 'hero');
    return views[Math.max(0, Math.min(views.length - 1, currentIndex + direction))];
  }

  function pulseEdge(){
    if(edgeTimer) window.clearTimeout(edgeTimer);
    document.body.setAttribute('data-loopy-edge', targetView || 'hero');
    edgeTimer = window.setTimeout(function(){
      edgeTimer = null;
      document.body.removeAttribute('data-loopy-edge');
    }, 220);
  }

  function clearTransitionWork(){
    if(transitionTimer) window.clearTimeout(transitionTimer);
    if(viewSwitchTimer) window.clearTimeout(viewSwitchTimer);
    if(anchorLockTimer) window.clearTimeout(anchorLockTimer);
    if(transitionFrame){
      if(transitionFrame.raf && window.cancelAnimationFrame) window.cancelAnimationFrame(transitionFrame.raf);
      if(transitionFrame.timeout) window.clearTimeout(transitionFrame.timeout);
    }
    transitionTimer = null;
    transitionFrame = null;
    viewSwitchTimer = null;
    anchorLockTimer = null;
  }

  function easeInOutCubic(progress){
    return progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
  }

  function scheduleTransitionStep(step){
    var done = false;
    var frame = { raf: null, timeout: null };
    function run(now){
      if(done) return;
      done = true;
      if(frame.raf && window.cancelAnimationFrame) window.cancelAnimationFrame(frame.raf);
      if(frame.timeout) window.clearTimeout(frame.timeout);
      transitionFrame = null;
      step(now || performance.now());
    }
    if(window.requestAnimationFrame) frame.raf = window.requestAnimationFrame(run);
    frame.timeout = window.setTimeout(function(){ run(performance.now()); }, 40);
    transitionFrame = frame;
  }

  function animateScrollTop(top, done){
    var scroller = getScroller();
    var startTop = scroller.scrollTop;
    var distance = top - startTop;

    clearTransitionWork();
    if(prefersReducedMotion() || Math.abs(distance) < 2){
      setScrollTop(top, true);
      if(done) done();
      return;
    }

    transitioning = true;
    document.body.setAttribute('data-loopy-transitioning', 'true');
    document.body.setAttribute('data-loopy-transition-phase', 'travel');
    activeTransitionLog = {
      from: Math.round(startTop),
      to: Math.round(top),
      startedAt: performance.now(),
      frames: []
    };
    window.__loopyLastTransition = activeTransitionLog;

    function logTransitionFrame(phase, value){
      if(!activeTransitionLog) return;
      activeTransitionLog.frames.push({
        t: Math.round(performance.now() - activeTransitionLog.startedAt),
        phase: phase,
        scrollTop: Math.round(value)
      });
    }
    logTransitionFrame('start', startTop);

    var startedAtMs = 0;
    var elapsedMs = 0;
    var lastTop = startTop;
    var duration = Math.min(880, Math.max(640, Math.abs(distance) / 7.8));
    var maxFrameDelta = 420;
    var maxProgressStep = 54;
    var lastNow = 0;
    activeTransitionLog.plannedDurationMs = Math.round(duration + 120);
    activeTransitionLog.maxFrameDelta = maxFrameDelta;
    activeTransitionLog.maxProgressStepMs = maxProgressStep;

    function finish(){
      var settledTop = targetScrollTop(targetView || document.body.getAttribute('data-loopy-view') || 'hero');
      if(Number.isFinite(settledTop) && Math.abs(settledTop - top) < window.innerHeight * 0.45){
        top = settledTop;
      }
      transitionFrame = null;
      logTransitionFrame('finish', top);
      if(activeTransitionLog) activeTransitionLog.to = Math.round(top);
      setScrollTop(top, false);
      if(done) done();
      document.body.setAttribute('data-loopy-transition-phase', 'settle');
      transitionTimer = window.setTimeout(function(){
        transitionTimer = null;
        transitioning = false;
        document.body.removeAttribute('data-loopy-transitioning');
        document.body.removeAttribute('data-loopy-transition-phase');
        if(activeTransitionLog){
          activeTransitionLog.durationMs = Math.round(performance.now() - activeTransitionLog.startedAt);
          activeTransitionLog.settled = true;
        }
        activeTransitionLog = null;
        updateScrollClip();
        lockCurrentViewScroll(2200);
        syncDemoCardRevealForView(targetView || 'hero');
        if(queuedView){
          var nextQueuedView = queuedView;
          queuedView = null;
          if(nextQueuedView !== targetView) setView(nextQueuedView);
        }
      }, 180);
    }

    function step(now){
      if(!transitioning) return;
      if(!startedAtMs){
        startedAtMs = now;
        lastNow = now;
      }
      var frameGap = Math.max(16, now - lastNow);
      lastNow = now;
      elapsedMs = Math.min(duration, elapsedMs + Math.min(frameGap, maxProgressStep));
      var progress = Math.min(1, elapsedMs / duration);
      var targetTop = startTop + distance * easeInOutCubic(progress);
      var frameDelta = targetTop - lastTop;
      var chunkCount = Math.max(1, Math.min(10, Math.ceil(Math.abs(frameDelta) / maxFrameDelta)));
      var nextTop = targetTop;
      for(var chunk = 1; chunk <= chunkCount; chunk += 1){
        var chunkTop = lastTop + frameDelta * (chunk / chunkCount);
        setScrollTop(chunkTop, false);
        logTransitionFrame('travel', chunkTop);
      }
      lastTop = nextTop;

      if(Math.abs(top - nextTop) < 1 || progress >= 1){
        finish();
        return;
      }

      scheduleTransitionStep(step);
    }

    scheduleTransitionStep(step);
  }

  function setView(view, options){
    var nextView = normalizeView(view);
    var instant = options && options.instant;
    var previousView = normalizeView(targetView || document.body.getAttribute('data-loopy-view') || 'hero');
    var nextScrollTop = targetScrollTop(nextView);
    patchHead();
    if(instant){
      clearTransitionWork();
      transitioning = false;
      queuedView = null;
      targetView = nextView;
      document.body.removeAttribute('data-loopy-transitioning');
      document.body.removeAttribute('data-loopy-transition-phase');
      document.body.setAttribute('data-loopy-view', targetView);
      setScrollTop(nextScrollTop, true);
      updateScrollClip();
      syncDemoCardRevealForView(targetView);
      return;
    }
    if(transitioning){
      queuedView = nextView;
      return;
    }
    if(targetView === nextView){
      pulseEdge();
      return;
    }
    queuedView = null;
    var previousScrollTop = targetScrollTop(previousView);
    var currentScrollTop = getScroller().scrollTop;
    if(Math.abs(currentScrollTop - previousScrollTop) > 2 && Math.abs(currentScrollTop - previousScrollTop) < window.innerHeight * 0.28){
      setScrollTop(previousScrollTop, false);
    }
    targetView = nextView;
    animateScrollTop(nextScrollTop, function(){
      document.body.setAttribute('data-loopy-view', targetView);
      updateScrollClip();
      syncDemoCardRevealForView(targetView);
    });
    if(viewSwitchTimer) window.clearTimeout(viewSwitchTimer);
    viewSwitchTimer = window.setTimeout(function(){
      viewSwitchTimer = null;
      document.body.setAttribute('data-loopy-view', targetView);
      syncDemoCardRevealForView(targetView);
    }, 110);
  }

  function hideLoaderWhenReady(){
    var canvas = document.querySelector('canvas');
    var loader = getLoader();
    if(!canvas || !loader) return;
    if(canvas.style.visibility === 'hidden' || Number(canvas.style.opacity) <= 0) return;
    if(!targetView) return;
    if(orbitPrewarmState !== 'done'){
      prewarmOrbitTargets(hideLoaderWhenReady);
      return;
    }

    var targetTop = targetScrollTop(targetView);
    if(Math.abs(getScroller().scrollTop - targetTop) > 3){
      setScrollTop(targetTop, true);
      return;
    }

    if(readyRevealTimer || document.body.getAttribute('data-loopy-canvas-ready') === 'true') return;
    readyRevealTimer = window.setTimeout(function(){
      window.requestAnimationFrame(function(){
        window.requestAnimationFrame(function(){
          readyRevealTimer = null;
          document.body.setAttribute('data-loopy-canvas-ready', 'true');
          loader.setAttribute('data-loopy-loader-hidden', 'true');
          loader.setAttribute('aria-hidden', 'true');
          syncLoaderProgress(100);
          window.setTimeout(stopLoaderProgressSync, 520);
        });
      });
    }, 120);
  }

  function languageCodeIsSupported(code){
    return languages.some(function(language){ return language.code === code; });
  }

  function setLanguage(code){
    if(!languageCodeIsSupported(code)) return;
    currentLanguage = code;
    languageMenuOpen = false;
    try {
      if(window.localStorage) window.localStorage.setItem('loopy-language', currentLanguage);
    } catch (error) {}
    patchHead();
    buildShell();
    if(targetView) document.body.setAttribute('data-loopy-view', targetView);
    syncDemoCardRevealForView(targetView || 'hero');
  }

  function writeClipboardText(text){
    if(navigator.clipboard && navigator.clipboard.writeText){
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function(resolve, reject){
      var textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy') ? resolve() : reject(new Error('copy failed'));
      } catch (error) {
        reject(error);
      } finally {
        document.body.removeChild(textarea);
      }
    });
  }

  function markCopyButton(button){
    var label = button.querySelector('span');
    var copy = currentCopy();
    var original = label ? label.textContent : copy.copyAction;
    button.setAttribute('data-copied', 'true');
    if(label) label.textContent = copy.copiedAction;
    window.setTimeout(function(){
      button.removeAttribute('data-copied');
      if(label) label.textContent = original || copy.copyAction;
    }, 1400);
  }

  function setActiveDemoCard(card){
    var deck = document.querySelector('.loopy-demo-deck');
    if(deck && card) deck.setAttribute('data-active-card', card);
  }

  function clearDemoCardRevealTimers(){
    demoRevealTimers.forEach(function(timer){ window.clearTimeout(timer); });
    demoRevealTimers = [];
  }

  function recordDemoCardReveal(phase){
    var log = window.__loopyCardRevealLog || [];
    log.push({
      phase: phase,
      t: Math.round(performance.now())
    });
    window.__loopyCardRevealLog = log.slice(-8);
  }

  function setDemoCardReveal(phase){
    var deck = document.querySelector('.loopy-demo-deck');
    if(!deck) return;
    deck.setAttribute('data-card-reveal', phase);
    recordDemoCardReveal(phase);
  }

  function resetDemoCardReveal(){
    clearDemoCardRevealTimers();
    var deck = document.querySelector('.loopy-demo-deck');
    if(!deck) return;
    setActiveDemoCard('clone');
    deck.setAttribute('data-card-reveal', 'backs');
    window.__loopyCardRevealLog = [];
  }

  function startDemoCardReveal(){
    var deck = document.querySelector('.loopy-demo-deck');
    if(!deck) return;
    if(deck.getAttribute('data-card-reveal') !== 'backs' && window.__loopyCardRevealLog && window.__loopyCardRevealLog.length) return;
    clearDemoCardRevealTimers();
    window.__loopyCardRevealLog = [];
    setActiveDemoCard('clone');
    setDemoCardReveal('backs');
    if(prefersReducedMotion()){
      setDemoCardReveal('all');
      lockCurrentViewScroll(1200);
      return;
    }
    demoRevealTimers.push(window.setTimeout(function(){
      setActiveDemoCard('clone');
      setDemoCardReveal('clone');
    }, 130));
    demoRevealTimers.push(window.setTimeout(function(){
      setActiveDemoCard('frontend');
      setDemoCardReveal('all');
      lockCurrentViewScroll(1200);
    }, 500));
  }

  function syncDemoCardRevealForView(view){
    if(view === 'demo' && transitioning) return;
    if(view === 'demo') startDemoCardReveal();
    else resetDemoCardReveal();
  }

  function viewFromHash(hash){
    if(hash === '#loopy-proof') return 'eye';
    if(hash === '#loopy-demo') return 'demo';
    return 'hero';
  }

  function wireLinks(){
    if(linksWired) return;
    linksWired = true;
    function stopNativeScroll(event){
      event.preventDefault();
      if(event.stopImmediatePropagation) event.stopImmediatePropagation();
      else event.stopPropagation();
    }
    function handleWheel(event){
      if(event._loopyWheelHandled) return;
      event._loopyWheelHandled = true;
      stopNativeScroll(event);
      if(Math.abs(event.deltaY) < 12) return;
      if(Date.now() - lastWheelAt < 780) return;
      lastWheelAt = Date.now();
      setView(stepView(event.deltaY > 0 ? 1 : -1));
    }
    document.addEventListener('click', function(event){
      var langButton = event.target && event.target.closest ? event.target.closest('.loopy-lang-button') : null;
      if(langButton){
        event.preventDefault();
        languageMenuOpen = !languageMenuOpen;
        buildShell();
        if(targetView) document.body.setAttribute('data-loopy-view', targetView);
        return;
      }

      var langOption = event.target && event.target.closest ? event.target.closest('[data-loopy-lang-option]') : null;
      if(langOption){
        event.preventDefault();
        setLanguage(langOption.getAttribute('data-loopy-lang-option'));
        return;
      }

      var copyButton = event.target && event.target.closest ? event.target.closest('[data-loopy-copy]') : null;
      if(copyButton){
        event.preventDefault();
        var text = copyButton.getAttribute('data-loopy-copy') || '';
        writeClipboardText(text).then(function(){
          markCopyButton(copyButton);
        }).catch(function(){
          markCopyButton(copyButton);
        });
        return;
      }

      var demoCard = event.target && event.target.closest ? event.target.closest('[data-demo-card]') : null;
      if(demoCard){
        setActiveDemoCard(demoCard.getAttribute('data-demo-card'));
      }

      var loopyLink = event.target && event.target.closest ? event.target.closest('a[href="#loopy-proof"],a[href="#loopy-start"],a[href="#loopy-demo"]') : null;
      if(loopyLink){
        event.preventDefault();
        languageMenuOpen = false;
        setView(viewFromHash(loopyLink.getAttribute('href')));
        return;
      }

      if(languageMenuOpen && !(event.target && event.target.closest && event.target.closest('.loopy-lang'))){
        languageMenuOpen = false;
        buildShell();
        if(targetView) document.body.setAttribute('data-loopy-view', targetView);
      }
    });
    document.addEventListener('pointerover', function(event){
      var demoCard = event.target && event.target.closest ? event.target.closest('[data-demo-card]') : null;
      if(demoCard) setActiveDemoCard(demoCard.getAttribute('data-demo-card'));
    });
    document.addEventListener('focusin', function(event){
      var demoCard = event.target && event.target.closest ? event.target.closest('[data-demo-card]') : null;
      if(demoCard) setActiveDemoCard(demoCard.getAttribute('data-demo-card'));
    });
    window.addEventListener('wheel', handleWheel, {passive:false, capture:true});
    document.addEventListener('wheel', handleWheel, {passive:false, capture:true});
    window.addEventListener('touchstart', function(event){
      touchStartY = event.touches && event.touches.length ? event.touches[0].clientY : null;
    }, {passive:true, capture:true});
    window.addEventListener('touchmove', function(event){
      if(touchStartY == null) return;
      stopNativeScroll(event);
    }, {passive:false, capture:true});
    window.addEventListener('touchend', function(event){
      if(touchStartY == null) return;
      var touch = event.changedTouches && event.changedTouches.length ? event.changedTouches[0] : null;
      if(touch && Math.abs(touchStartY - touch.clientY) > 28){
        setView(stepView(touchStartY > touch.clientY ? 1 : -1));
      }
      touchStartY = null;
    }, {passive:true, capture:true});
    window.addEventListener('keydown', function(event){
      if(['ArrowDown','PageDown',' '].indexOf(event.key) >= 0){
        event.preventDefault();
        setView(stepView(1));
      }
      if(['ArrowUp','PageUp'].indexOf(event.key) >= 0){
        event.preventDefault();
        setView(stepView(-1));
      }
      if(event.key === 'Home'){
        event.preventDefault();
        setView('hero');
      }
      if(event.key === 'End'){
        event.preventDefault();
        setView('demo');
      }
    });
    window.addEventListener('scroll', updateScrollClip, {passive:true});
    getScroller().addEventListener('scroll', updateScrollClip, {passive:true});
  }

  function apply(){
    if(applying) return;
    applying = true;
    try{
      wireLoaderProgress();
      addStyles();
      patchHead();
      buildShell();
      muteOriginalDom();
      wireLinks();
      if(!targetView){
        setView(viewFromHash(window.location.hash), {instant:true});
      } else {
        document.body.setAttribute('data-loopy-view', targetView);
        updateScrollClip();
        syncDemoCardRevealForView(targetView);
      }
      hideLoaderWhenReady();
    } finally {
      applying = false;
    }
  }

  function start(){
    apply();
    [250, 750, 1500, 3000, 6000, 10000].forEach(function(delay){
      window.setTimeout(apply, delay);
    });
    new MutationObserver(function(){
      if(Date.now() - startedAt < maxPatchWindow) window.requestAnimationFrame(apply);
    }).observe(document.getElementById('__nuxt') || document.body, {childList:true, subtree:true});
    new MutationObserver(function(){
      if(Date.now() - startedAt < maxPatchWindow) window.requestAnimationFrame(patchHead);
    }).observe(document.head, {attributes:true, childList:true, subtree:true});
  }

  function queueStart(){
    wireLoaderProgress();
    window.setTimeout(start, 1400);
  }

  wireLoaderProgress();
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', wireLoaderProgress, {once:true});
  }

  if(document.readyState === 'complete'){
    queueStart();
  } else {
    window.addEventListener('load', queueStart, {once:true});
  }
})();
