<div align="center">

# 🌀 Superloopy

**Ingeniería de bucles para Codex.** Escribe `loopy <task>`: un agente hace el trabajo, prueba cada parte con evidencia real y solo entonces dice que terminó.

<p>
  <a href="README.md">English</a> ·
  <a href="README.ko.md">한국어</a> ·
  <a href="README.zh-CN.md">中文(简体)</a> ·
  <a href="README.ja.md">日本語</a> ·
  <a href="README.es.md">Español</a>
</p>

<img src=".github/assets/franky.png" width="92" alt="franky" />&nbsp;<img src=".github/assets/zoro.png" width="92" alt="zoro" />&nbsp;<img src=".github/assets/usopp.png" width="92" alt="usopp" />&nbsp;<img src=".github/assets/jinbe.png" width="92" alt="jinbe" />&nbsp;<img src=".github/assets/robin.png" width="92" alt="robin" />&nbsp;<img src=".github/assets/nami.png" width="92" alt="nami" />

<sub><b>the crew</b> — subagentes opcionales, un trabajo cada uno</sub>

</div>

## Uso

Después de instalarlo, escribe tu tarea en Codex con `loopy` al inicio:

```
loopy corrige la prueba de inicio de sesión que falla y verifícala con evidencia
```

El agente la planifica, prueba cada parte con un archivo real y responde con el resultado. No tienes que ejecutar comandos manualmente. El Stop hook incluido se queda inactivo salvo que `SUPERLOOPY_STOP_HOOK=on`.

## Skills

Superloopy mantiene pequeña la capa de comandos. Las skills guardan el flujo especializado: cuándo usarlas, qué revisar y qué prueba debe quedar en `.superloopy/evidence/`.

| Skill | Cuándo usarla | Qué produce |
| --- | --- | --- |
| `superloopy-loop` | Usa `loopy <task>` o `loopy team <task>` para un loop completo; usa `loopywork`, `lpy` o `$lpy` solo para guidance. | Un loop completo produce un plan ligero, siguientes acciones, prueba respaldada por comandos, un quality gate y un evidence report final. Los alias de guidance no mutan estado. |
| `superloopy-research` | Pides `loopy research`, deep research, exhaustive investigation o un informe con citas. | Ejes de investigación, expansion waves, claim ledger, notas de verificación y un synthesis artifact citado. |
| `superloopy-clone` | Pides `loopy clone`, clonación autorizada de un sitio, reconstrucción, migración o recuperación visual precisa. | Capturas de navegador, topología de página, design tokens, inventario de assets, notas de implementación, salida de build y evidencia de visual QA. |

La skill de loop es la barandilla por defecto. `loopy` inicia o reanuda el evidence loop; `loopy team` sube a crew mode. `loopywork`, `lpy` y `$lpy` solo inyectan guidance inicial. Research y clone son modos especializados opt-in, y ambos terminan registrando Superloopy evidence en lugar de confiar en una frase de estado.

## Crew

Para trabajos grandes, Superloopy incluye seis subagentes opcionales en `.codex/agents/`, cada uno con una línea de trabajo. Se instalan automáticamente con el plugin; `superloopy agents install` solo vuelve a copiarlos si lo necesitas. Los valores de modelo recomendados están en `docs/superloopy-model-policy.md` y `superloopy doctor` los verifica.

<table>
  <tr>
    <td align="center" width="33%"><img src=".github/assets/franky.png" width="190" alt="franky" /><br /><b>franky</b><br /><sub>construye</sub></td>
    <td align="center" width="33%"><img src=".github/assets/zoro.png" width="190" alt="zoro" /><br /><b>zoro</b><br /><sub>revisa</sub></td>
    <td align="center" width="33%"><img src=".github/assets/usopp.png" width="190" alt="usopp" /><br /><b>usopp</b><br /><sub>prueba</sub></td>
  </tr>
  <tr>
    <td align="center"><img src=".github/assets/jinbe.png" width="190" alt="jinbe" /><br /><b>jinbe</b><br /><sub>valida el gate</sub></td>
    <td align="center"><img src=".github/assets/robin.png" width="190" alt="robin" /><br /><b>robin</b><br /><sub>audita</sub></td>
    <td align="center"><img src=".github/assets/nami.png" width="190" alt="nami" /><br /><b>nami</b><br /><sub>encuentra</sub></td>
  </tr>
</table>

Invoca la crew con `loopy team <task>`. También puedes usar `loopy crew`, la forma de una palabra `loopycrew`, o `ultrawork <task>`. Superloopy reparte el trabajo en líneas paralelas y aun así exige prueba para cada parte antes de marcarlo como terminado. Un `loopy <task>` normal se queda en modo solo y delega únicamente cuando las partes son claramente independientes.

En ejecuciones con la crew completa, el padre registra cada línea con `superloopy loop handoff`, revisa `superloopy loop fleet --json` y mantiene separado el informe final humano del gate JSON de máquina. Un informe de gate puede ser evidencia Markdown; `superloopy loop finish --artifact` espera un gate de calidad `.json`.

Cuando un handoff de crew termina, Superloopy puede imprimir una línea original de crew antes del estado normal de `handoff` o `fleet`. Sigue el idioma detectado en la asignación o el brief del scope cuando está soportado, y vuelve al inglés si no. La línea solo da personalidad; el verdict, el evidence artifact, la lista outstanding y la lista attention siguen siendo la autoridad.

## Instalación

Requiere Node.js 20 o superior. Superloopy no tiene dependencias de runtime.

```
codex plugin marketplace add https://github.com/beefiker/superloopy
codex plugin add superloopy@beefiker
```

Reinicia Codex después de instalar el plugin. Si Codex te pide revisar hooks, apruébalos; la siguiente sesión aprobada ejecuta un hook `SessionStart` una sola vez para instalar el comando `superloopy` y los agents. Si `superloopy` no aparece, su carpeta no está en tu `PATH`; el bootstrap imprime la línea exacta que debes agregar. Revisa todo con `superloopy doctor`.

Si instalas desde un checkout, ejecuta `node src/cli.js install --json`.

<sub>Licencia MIT.</sub>
