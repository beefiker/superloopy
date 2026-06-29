<div align="center">

# 🌀 Loopy

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

El agente la planifica, prueba cada parte con un archivo real y responde con el resultado. No tienes que ejecutar comandos manualmente. El Stop hook incluido se queda inactivo salvo que `LOOPY_STOP_HOOK=on`.

## Crew

Para trabajos grandes, Loopy incluye seis subagentes opcionales en `.codex/agents/`, cada uno con una línea de trabajo. Se instalan automáticamente con el plugin; `loopy agents install` solo vuelve a copiarlos si lo necesitas. Los valores de modelo recomendados están en `docs/loopy-model-policy.md` y `loopy doctor` los verifica.

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

Invoca la crew con `loopy team <task>`. También puedes usar `loopy crew`, la forma de una palabra `loopycrew`, o `ultrawork <task>`. Loopy reparte el trabajo en líneas paralelas y aun así exige prueba para cada parte antes de marcarlo como terminado. Un `loopy <task>` normal se queda en modo solo y delega únicamente cuando las partes son claramente independientes.

En ejecuciones con la crew completa, el padre registra cada línea con `loopy loop handoff`, revisa `loopy loop fleet --json` y mantiene separado el informe final humano del gate JSON de máquina. Un informe de gate puede ser evidencia Markdown; `loopy loop finish --artifact` espera un gate de calidad `.json`.

Cuando un handoff de crew termina, Loopy puede imprimir una línea original de crew antes del estado normal de `handoff` o `fleet`. Sigue el idioma detectado en la asignación o el brief del scope cuando está soportado, y vuelve al inglés si no. La línea solo da personalidad; el verdict, el evidence artifact, la lista outstanding y la lista attention siguen siendo la autoridad.

## Instalación

Requiere Node.js 20 o superior. Loopy no tiene dependencias de runtime.

```
codex plugin marketplace add https://github.com/beefiker/loopy
codex plugin add loopy@beefiker
```

Reinicia Codex dos veces: primero aprueba los hooks y luego recarga. La primera sesión aprobada ejecuta un hook `SessionStart` una sola vez para instalar el comando `loopy` y los agents. Si `loopy` no aparece, su carpeta no está en tu `PATH`; el bootstrap imprime la línea exacta que debes agregar. Revisa todo con `loopy doctor`.

Si instalas desde un checkout, ejecuta `node src/cli.js install --json`.

<sub>Licencia MIT.</sub>
