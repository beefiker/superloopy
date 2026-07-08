// Locale dictionary for the landing page (EN source text -> de/ko/es).
// Core entries ported from the legacy web/assets/superloopy-locale-copy.js
// dictionary; page-specific additions translated for this layout.
// Generated + hand-extended — safe to edit.

export const HERO_TITLE = {
  en: ["Take control of", "agent work"],
  de: ["Agentenarbeit unter", "Kontrolle"],
  ko: ["에이전트 작업을", "통제하세요"],
  es: ["Controla el trabajo", "de agentes"],
};

export const LOCALE_TEXTS = {
  "Superloopy runs agent work in a loop until proof exists: plan, act, evidence, gate.": {
    "de": "Superloopy führt Agentenarbeit im Loop aus, bis Belege vorliegen: Plan, Aktion, Evidenz, Gate.",
    "ko": "Superloopy는 계획, 실행, 증거, 게이트가 남을 때까지 에이전트 작업을 루프로 돌립니다.",
    "es": "Superloopy ejecuta el trabajo del agente en loop hasta que exista prueba: plan, acción, evidencia y gate."
  },
  "Start loop": {
    "de": "Loop starten",
    "ko": "루프 시작",
    "es": "Iniciar loop"
  },
  "Install loop": {
    "de": "Loop installieren",
    "ko": "루프 설치",
    "es": "Instalar loop"
  },
  "Evidence-first loops for Codex and Claude Code": {
    "de": "Evidenz zuerst: Loops für Codex und Claude Code",
    "ko": "Codex와 Claude Code를 위한 증거 우선 루프",
    "es": "Loops con evidencia primero para Codex y Claude Code"
  },
  "Superloopy keeps agents moving inside a bounded loop, then lets evidence decide when the work is done.": {
    "de": "Superloopy hält Agenten in einem begrenzten Loop in Bewegung – und Belege entscheiden, wann die Arbeit fertig ist.",
    "ko": "Superloopy는 에이전트를 정해진 루프 안에서 계속 움직이게 하고, 작업 완료는 증거가 결정합니다.",
    "es": "Superloopy mantiene al agente en un loop acotado y deja que la evidencia decida cuándo el trabajo está terminado."
  },
  "Every run writes artifacts under .superloopy/evidence, so results can be checked after the chat.": {
    "de": "Jeder Lauf schreibt Artefakte nach .superloopy/evidence, sodass Ergebnisse auch nach dem Chat prüfbar bleiben.",
    "ko": "모든 실행은 산출물을 .superloopy/evidence에 기록하므로, 채팅이 끝난 뒤에도 결과를 확인할 수 있습니다.",
    "es": "Cada ejecución escribe artefactos en .superloopy/evidence, así los resultados se pueden revisar después del chat."
  },
  "Use loopy for focused work, research, frontend, and clone flows without changing the proof rule.": {
    "de": "Nutze loopy für fokussierte Arbeit, Recherche, Frontend und Clone-Flows – die Beweisregel bleibt dieselbe.",
    "ko": "집중 작업, 리서치, 프런트엔드, 클론 플로에 loopy를 그대로 쓰세요. 증거 규칙은 바뀌지 않습니다.",
    "es": "Usa loopy para trabajo enfocado, investigación, frontend y flujos de clonado sin cambiar la regla de la prueba."
  },
  "Plans, commands, screenshots, and reports stay linked to the goal instead of disappearing into chat.": {
    "de": "Pläne, Befehle, Screenshots und Berichte bleiben mit dem Ziel verknüpft, statt im Chat zu verschwinden.",
    "ko": "계획, 명령, 스크린샷, 보고서는 채팅 속으로 사라지지 않고 목표와 연결된 채 남습니다.",
    "es": "Los planes, comandos, capturas e informes quedan ligados a la meta en vez de perderse en el chat."
  },
  "Completion requires a named artifact and a clear pass, blocker, or next action.": {
    "de": "Fertig heißt: ein benanntes Artefakt und ein klares Ergebnis – bestanden, blockiert oder nächster Schritt.",
    "ko": "완료로 인정되려면 이름이 명시된 산출물과 함께 통과, 블로커, 다음 행동 중 하나가 분명해야 합니다.",
    "es": "Completar exige un artefacto con nombre y un resultado claro: aprobado, bloqueado o siguiente acción."
  },
  "Bounded task loops": {
    "de": "Begrenzte Task-Loops",
    "ko": "범위가 정해진 작업 루프",
    "es": "Loops de tarea acotados"
  },
  "Evidence that survives the chat": {
    "de": "Belege, die den Chat überleben",
    "ko": "채팅이 끝나도 남는 증거",
    "es": "Evidencia que sobrevive al chat"
  },
  "A final report with blockers named": {
    "de": "Ein Abschlussbericht, der Blocker benennt",
    "ko": "블로커까지 명시한 최종 보고서",
    "es": "Un informe final con los bloqueos nombrados"
  },
  "One prompt becomes a bounded loop": {
    "de": "Aus einem Prompt wird ein begrenzter Loop",
    "ko": "하나의 프롬프트가 정해진 루프가 됩니다",
    "es": "Un prompt se convierte en un loop acotado"
  },
  "Built for Codex and Claude Code workflows that need receipts": {
    "de": "Für Codex- und Claude-Code-Workflows, die Belege brauchen",
    "ko": "증빙이 필요한 Codex·Claude Code 워크플로를 위해 만들어졌습니다",
    "es": "Hecho para flujos de Codex y Claude Code que necesitan comprobantes"
  },
  "Focus on the task. Let the loop demand proof.": {
    "de": "Konzentrier dich auf die Aufgabe. Der Loop verlangt den Beweis.",
    "ko": "작업에만 집중하세요. 증거는 루프가 요구합니다.",
    "es": "Céntrate en la tarea. Deja que el loop exija la prueba."
  },
  "Set the goal": {
    "de": "Ziel setzen",
    "ko": "목표 설정",
    "es": "Define la meta"
  },
  "Act in loops": {
    "de": "In Loops arbeiten",
    "ko": "루프로 실행",
    "es": "Actúa en loops"
  },
  "Capture evidence": {
    "de": "Belege sichern",
    "ko": "증거 저장",
    "es": "Captura evidencia"
  },
  "Pass the gate": {
    "de": "Gate bestehen",
    "ko": "게이트 통과",
    "es": "Supera el gate"
  },
  "Define the objective, success criteria, and evidence folder before the agent starts moving.": {
    "de": "Definiere Ziel, Erfolgskriterien und Evidenzordner, bevor der Agent loslegt.",
    "ko": "에이전트가 움직이기 전에 목표, 성공 기준, 증거 폴더를 정합니다.",
    "es": "Define el objetivo, los criterios de éxito y la carpeta de evidencia antes de que el agente empiece."
  },
  "The agent keeps taking the next visible action, with each pass tied back to the goal.": {
    "de": "Der Agent geht immer den nächsten sichtbaren Schritt, und jeder Durchlauf bleibt ans Ziel gebunden.",
    "ko": "에이전트는 눈에 보이는 다음 행동을 이어가고, 매 회차는 목표와 다시 연결됩니다.",
    "es": "El agente sigue dando el siguiente paso visible, y cada pasada queda ligada a la meta."
  },
  "Commands, screenshots, reports, and audit files land where they can be opened and rerun.": {
    "de": "Befehle, Screenshots, Berichte und Audit-Dateien landen dort, wo man sie öffnen und erneut ausführen kann.",
    "ko": "명령, 스크린샷, 보고서, 감사 파일은 다시 열고 실행할 수 있는 곳에 남습니다.",
    "es": "Comandos, capturas, informes y archivos de auditoría quedan donde se pueden abrir y volver a ejecutar."
  },
  "The final report separates finished work from blockers, with artifacts named in the open.": {
    "de": "Der Abschlussbericht trennt Erledigtes von Blockern und benennt die Artefakte offen.",
    "ko": "최종 보고서는 끝난 일과 블로커를 구분하고, 산출물을 그대로 명시합니다.",
    "es": "El informe final separa el trabajo terminado de los bloqueos y nombra los artefactos abiertamente."
  },
  "Agents move fast. Superloopy makes done mean proven.": {
    "de": "Agenten sind schnell. Superloopy sorgt dafür, dass fertig auch bewiesen heißt.",
    "ko": "에이전트는 빠르게 움직입니다. Superloopy는 '완료'가 '증명됨'이 되게 합니다.",
    "es": "Los agentes van rápido. Con Superloopy, terminado significa probado."
  },
  "Install once. Then type loopy.": {
    "de": "Einmal installieren. Dann loopy tippen.",
    "ko": "한 번 설치하고 loopy만 입력하세요.",
    "es": "Instala una vez. Luego escribe loopy."
  },
  "Run in a terminal, then restart Codex and approve the hooks.": {
    "de": "Im Terminal ausführen, dann Codex neu starten und die Hooks bestätigen.",
    "ko": "터미널에서 실행한 뒤 Codex를 재시작하고 훅을 승인하세요.",
    "es": "Ejecútalo en una terminal, reinicia Codex y aprueba los hooks."
  },
  "Run inside Claude Code, then approve the plugin hooks.": {
    "de": "In Claude Code ausführen und die Plugin-Hooks bestätigen.",
    "ko": "Claude Code 안에서 실행하고 플러그인 훅을 승인하세요.",
    "es": "Ejecútalo dentro de Claude Code y aprueba los hooks del plugin."
  },
  "Copy": {
    "de": "Kopieren",
    "ko": "복사",
    "es": "Copiar"
  },
  "What makes Superloopy different from a prompt?": {
    "de": "Was unterscheidet Superloopy von einem Prompt?",
    "ko": "Superloopy는 프롬프트와 무엇이 다른가요?",
    "es": "¿En qué se diferencia Superloopy de un prompt?"
  },
  "Where does the evidence live?": {
    "de": "Wo liegen die Belege?",
    "ko": "증거는 어디에 저장되나요?",
    "es": "¿Dónde vive la evidencia?"
  },
  "Does it work with Codex and Claude Code?": {
    "de": "Funktioniert es mit Codex und Claude Code?",
    "ko": "Codex와 Claude Code 모두에서 쓸 수 있나요?",
    "es": "¿Funciona con Codex y Claude Code?"
  },
  "What happens when the loop cannot finish?": {
    "de": "Was passiert, wenn der Loop nicht fertig wird?",
    "ko": "루프가 끝나지 못하면 어떻게 되나요?",
    "es": "¿Qué pasa cuando el loop no puede terminar?"
  },
  "Codex and Claude Code workflows": {
    "de": "Workflows für Codex und Claude Code",
    "ko": "Codex와 Claude Code 워크플로",
    "es": "Flujos de trabajo para Codex y Claude Code"
  },
  "Done means proven.": {
    "de": "Fertig heißt bewiesen.",
    "ko": "완료는 곧 증명입니다.",
    "es": "Terminado significa probado."
  },
  "Scroll down": {
    "de": "Nach unten scrollen",
    "ko": "아래로 스크롤",
    "es": "Desplázate hacia abajo"
  },
  "Agents move fast. Superloopy makes done mean proven. Plans, commands, screenshots, and reports stay linked to the goal instead of disappearing into chat.": {
    "de": "Agenten sind schnell. Superloopy sorgt dafür, dass fertig auch bewiesen heißt. Pläne, Befehle, Screenshots und Berichte bleiben mit dem Ziel verknüpft, statt im Chat zu verschwinden.",
    "ko": "에이전트는 빠르게 움직입니다. Superloopy는 '완료'가 '증명됨'이 되게 합니다. 계획, 명령, 스크린샷, 보고서는 채팅 속으로 사라지지 않고 목표와 연결된 채 남습니다.",
    "es": "Los agentes van rápido. Con Superloopy, terminado significa probado. Los planes, comandos, capturas e informes quedan ligados a la meta en vez de perderse en el chat."
  },
  "Looped work": {
    "de": "Arbeit im Loop",
    "ko": "루프로 도는 작업",
    "es": "Trabajo en loop"
  },
  "Agent rhythm": {
    "de": "Agenten-Rhythmus",
    "ko": "에이전트 리듬",
    "es": "Ritmo del agente"
  },
  "Proof gate": {
    "de": "Beleg-Gate",
    "ko": "증거 게이트",
    "es": "Gate de prueba"
  },
  "Evidence": {
    "de": "Evidenz",
    "ko": "증거",
    "es": "Evidencia"
  },
  "Skill lanes": {
    "de": "Skill-Lanes",
    "ko": "스킬 레인",
    "es": "Carriles de skills"
  },
  "Visible progress": {
    "de": "Sichtbarer Fortschritt",
    "ko": "보이는 진행 상황",
    "es": "Progreso visible"
  },
  "Final gate": {
    "de": "Finales Gate",
    "ko": "최종 게이트",
    "es": "Gate final"
  },
  "01 / Evidence": {
    "de": "01 / Evidenz",
    "ko": "01 / 증거",
    "es": "01 / Evidencia"
  },
  "02 / Skill lanes": {
    "de": "02 / Skill-Lanes",
    "ko": "02 / 스킬 레인",
    "es": "02 / Carriles de skills"
  },
  "03 / Visible progress": {
    "de": "03 / Sichtbarer Fortschritt",
    "ko": "03 / 보이는 진행 상황",
    "es": "03 / Progreso visible"
  },
  "04 / Final gate": {
    "de": "04 / Finales Gate",
    "ko": "04 / 최종 게이트",
    "es": "04 / Gate final"
  },
  "Agent work ✢ Loops ✢": {
    "de": "Agentenarbeit ✢ Loops ✢",
    "ko": "에이전트 작업 ✢ 루프 ✢",
    "es": "Trabajo de agentes ✢ Loops ✢"
  },
  "Are all about proof": {
    "de": "Drehen sich um Beweise",
    "ko": "핵심은 증거입니다",
    "es": "Van de pruebas"
  },
  "Read proof ⊕": {
    "de": "Beleg lesen ⊕",
    "ko": "증거 보기 ⊕",
    "es": "Ver la prueba ⊕"
  },
  "Running agent work has never been clearer": {
    "de": "Agentenarbeit auszuführen war nie klarer",
    "ko": "에이전트 작업 실행이 이렇게 명확했던 적은 없습니다",
    "es": "Ejecutar trabajo de agentes nunca fue tan claro"
  },
  "4 steps": {
    "de": "4 Schritte",
    "ko": "4단계",
    "es": "4 pasos"
  },
  "Running agent work": {
    "de": "Agentenarbeit ausführen",
    "ko": "에이전트 작업 실행",
    "es": "Ejecutar trabajo de agentes"
  },
  "Has never been clearer": {
    "de": "War nie klarer",
    "ko": "이렇게 명확한 적은 없습니다",
    "es": "Nunca fue tan claro"
  },
  "Install": {
    "de": "Installieren",
    "ko": "설치",
    "es": "Instalar"
  },
  "Use the same evidence loop from Codex or Claude Code. The commands stay copyable without loading an app runtime.": {
    "de": "Nutze denselben Evidenz-Loop aus Codex oder Claude Code. Die Befehle bleiben kopierbar, ohne eine App-Runtime zu laden.",
    "ko": "Codex나 Claude Code에서 같은 증거 루프를 사용하세요. 명령은 앱 런타임 없이 그대로 복사할 수 있습니다.",
    "es": "Usa el mismo loop de evidencia desde Codex o Claude Code. Los comandos siguen siendo copiables sin cargar un runtime de app."
  },
  "Copied": {
    "de": "Kopiert",
    "ko": "복사됨",
    "es": "Copiado"
  },
  "Superloopy keeps quality tied to evidence. Goal criteria: the loop starts with a concrete objective and the artifacts needed to prove it. Evidence capture: commands, screenshots, reports, and changed files are written where they can be opened later. Gate check: Superloopy does not call work done unless the proof is named or the blocker is explicit.": {
    "de": "Superloopy koppelt Qualität an Belege. Zielkriterien: Der Loop startet mit einem konkreten Ziel und den Artefakten, die es beweisen. Evidenzerfassung: Befehle, Screenshots, Berichte und geänderte Dateien werden dort abgelegt, wo man sie später öffnen kann. Gate-Check: Superloopy erklärt Arbeit erst für fertig, wenn der Beweis benannt oder der Blocker explizit ist.",
    "ko": "Superloopy는 품질을 증거에 묶어 둡니다. 목표 기준: 루프는 구체적인 목표와 이를 증명할 산출물로 시작합니다. 증거 수집: 명령, 스크린샷, 보고서, 변경 파일이 나중에 열어볼 수 있는 곳에 기록됩니다. 게이트 검사: 증거가 명시되거나 블로커가 분명하지 않으면 Superloopy는 작업을 완료로 부르지 않습니다.",
    "es": "Superloopy mantiene la calidad atada a la evidencia. Criterios de meta: el loop empieza con un objetivo concreto y los artefactos necesarios para probarlo. Captura de evidencia: comandos, capturas, informes y archivos modificados se escriben donde se pueden abrir después. Chequeo de gate: Superloopy no da el trabajo por terminado a menos que la prueba esté nombrada o el bloqueo sea explícito."
  },
  "Artifacts live in the project under .superloopy/evidence. That keeps the proof beside the work, not buried in chat history. The final report points back to the files, commands, screenshots, and notes that matter.": {
    "de": "Artefakte liegen im Projekt unter .superloopy/evidence. So bleibt der Beweis neben der Arbeit statt im Chatverlauf begraben. Der Abschlussbericht verweist zurück auf die Dateien, Befehle, Screenshots und Notizen, die zählen.",
    "ko": "산출물은 프로젝트의 .superloopy/evidence 아래에 남습니다. 증거가 채팅 기록에 묻히지 않고 작업 옆에 함께 있게 됩니다. 최종 보고서는 중요한 파일, 명령, 스크린샷, 메모를 다시 가리킵니다.",
    "es": "Los artefactos viven en el proyecto bajo .superloopy/evidence. Así la prueba queda junto al trabajo, no enterrada en el historial del chat. El informe final apunta de vuelta a los archivos, comandos, capturas y notas que importan."
  },
  "Yes. Superloopy is a command layer for Codex work and supports Claude Code workflows too. The same evidence rule applies across lanes.": {
    "de": "Ja. Superloopy ist eine Befehlsebene für Codex-Arbeit und unterstützt auch Claude-Code-Workflows. Dieselbe Evidenzregel gilt über alle Lanes.",
    "ko": "네. Superloopy는 Codex 작업을 위한 커맨드 레이어이며 Claude Code 워크플로도 지원합니다. 모든 레인에 같은 증거 규칙이 적용됩니다.",
    "es": "Sí. Superloopy es una capa de comandos para el trabajo con Codex y también soporta flujos de Claude Code. La misma regla de evidencia aplica en todos los carriles."
  },
  "Then the report says so. A loop can finish as passed, blocked, or incomplete, but it must leave a reason and the evidence it found. That is the point: no confident ending without proof. You get the next action instead of a tidy guess.": {
    "de": "Dann sagt es der Bericht. Ein Loop kann als bestanden, blockiert oder unvollständig enden, muss aber einen Grund und die gefundenen Belege hinterlassen. Genau darum geht es: kein selbstsicheres Ende ohne Beweis. Du bekommst die nächste Aktion statt einer glatten Vermutung.",
    "ko": "그럴 땐 보고서가 그렇게 말합니다. 루프는 통과, 차단, 미완료로 끝날 수 있지만 반드시 이유와 찾은 증거를 남겨야 합니다. 그것이 핵심입니다. 증거 없는 자신만만한 마무리는 없습니다. 그럴듯한 추측 대신 다음 행동을 받게 됩니다.",
    "es": "Entonces el informe lo dice. Un loop puede terminar como aprobado, bloqueado o incompleto, pero debe dejar una razón y la evidencia encontrada. Ese es el punto: ningún final confiado sin prueba. Recibes la siguiente acción en vez de una suposición prolija."
  },
  "Get Superloopy": {
    "de": "Hol dir Superloopy",
    "ko": "Superloopy 받기",
    "es": "Consigue Superloopy"
  },
  "Overview": {
    "de": "Überblick",
    "ko": "개요",
    "es": "Resumen"
  },
  "Crew": {
    "de": "Crew",
    "ko": "크루",
    "es": "Tripulación"
  },
  "Close proof ⊖": {
    "de": "Beleg schließen ⊖",
    "ko": "증거 닫기 ⊖",
    "es": "Cerrar prueba ⊖"
  },
  "Superloopy keeps the loop tied to the task: goal, command, artifact, and final report all point to the same proof.": {
    "de": "Superloopy hält den Loop an der Aufgabe: Ziel, Befehl, Artefakt und Abschlussbericht zeigen auf denselben Beweis.",
    "ko": "Superloopy는 루프를 작업에 묶어 둡니다. 목표, 명령, 산출물, 최종 보고서가 모두 같은 증거를 가리킵니다.",
    "es": "Superloopy mantiene el loop atado a la tarea: meta, comando, artefacto e informe final apuntan a la misma prueba."
  },
  "Each pass records what changed, what command proved it, and where the receipt lives inside the project.": {
    "de": "Jeder Durchlauf hält fest, was sich geändert hat, welcher Befehl es belegt und wo der Nachweis im Projekt liegt.",
    "ko": "매 회차마다 무엇이 바뀌었는지, 어떤 명령으로 확인했는지, 증빙이 프로젝트 어디에 있는지 기록합니다.",
    "es": "Cada pasada registra qué cambió, qué comando lo probó y dónde queda el comprobante dentro del proyecto."
  },
  "When the gate cannot pass, the report says why, names the blocker, and leaves the evidence already found.": {
    "de": "Wenn das Gate nicht besteht, sagt der Bericht warum, benennt den Blocker und lässt die gefundenen Belege da.",
    "ko": "게이트를 통과하지 못하면 보고서는 그 이유와 블로커를 밝히고, 이미 찾은 증거를 남깁니다.",
    "es": "Cuando el gate no pasa, el informe dice por qué, nombra el bloqueo y deja la evidencia ya encontrada."
  }
};
