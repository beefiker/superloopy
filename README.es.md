<div align="center">

# 🌀 Superloopy

**Ingeniería de bucles para Codex y Claude Code.** Escribe `loopy <task>`: un agente hace el trabajo, prueba cada parte con evidencia real y solo entonces dice que terminó.

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

Después de instalarlo, escribe tu tarea en Codex o Claude Code con `loopy` al inicio:

```
loopy agrega el módulo de pagos
```

El agente la planifica, prueba cada parte con un archivo real y responde con el resultado. No tienes que ejecutar comandos manualmente. El Stop hook incluido se queda inactivo salvo que `SUPERLOOPY_STOP_HOOK=on`.

## ¿Por qué Superloopy?

Superloopy es para trabajo en Codex y Claude Code donde "terminado" tiene que significar algo más que una frase de estado dicha con confianza.

- Evidencia primero: cada pasada apunta a un artefacto real en `.superloopy/evidence/`.
- Ligero por defecto: un CLI pequeño, estado local al repo, cero dependencias de runtime.
- Amigable con agentes: skills, hooks y crew lanes opcionales guían al agente sin ocultar el gate final.

**Alcance de la garantía.** Los criterios respaldados por un comando son la garantía fuerte: al finalizar, Superloopy vuelve a ejecutar cada comando en proceso y exige que se reproduzca, de modo que un pass obsoleto o fabricado no puede llegar a "hecho". Los criterios manuales (sin comando) se verifican como la existencia de un artefacto de evidencia no vacío más el juicio del auditor/humano: su corrección depende de la revisión, no de la reejecución determinista.

## Skills

Superloopy mantiene pequeña la capa de comandos. Las skills guardan el flujo especializado: cuándo usarlas, qué debe revisar el agente y qué prueba debe quedar en `.superloopy/evidence/`.

| Skill | Cuándo usarla | Qué produce |
| --- | --- | --- |
| `superloopy-loop` | Escribes `loopy <task>` o `loopy team <task>` para un loop completo; usa `loopywork`, `lpy` o `$lpy` para contexto solo de guidance. | Los loops completos producen un plan ligero, siguientes acciones guiadas, prueba respaldada por comandos, un quality gate y un evidence report final. Los alias de guidance no mutan estado. |
| `superloopy-doctor` | Diagnosticas instalación, wrapper, plugin cache, hook/bootstrap, agentes, wiring de Codex/Claude Code o versiones stale. | Health report de solo lectura: evidencia de wrapper/cache/version, checks fallidos y el comando exacto de reparación que solo se ejecuta si lo apruebas. |
| `superloopy-research` | Pides `loopy research`, deep research, exhaustive investigation o un informe con citas. | Ejes de investigación, expansion waves, un claim ledger, notas de verificación y un synthesis artifact citado. |
| `superloopy-clone` | Pides `loopy clone`, clonación autorizada de un sitio, reconstrucción, migración o recuperación visual precisa de páginas. | Capturas de navegador, topología de página, design tokens, inventario de assets, notas de implementación, salida de build y evidencia de visual QA. |
| `superloopy-frontend` | Construyes, aplicas estilos o rediseñas cualquier UI/página/componente, o pides que algo luzca diseñado (se activa automáticamente en trabajo visual). | Un contrato de tokens DESIGN.md, un resultado anti-slop de pre-flight y un artefacto de evidencia de visual QA en navegador real. |
| `humanize-korean` | Úsala cuando usuarios coreanos piden quitar el tono AI, corregir 번역투 o hacer que el texto coreano suene humano sin cambiar hechos. | Escribe `final.md`, `summary.md` y `audit.json`; en loops de Superloopy registra evidencia en `.superloopy/evidence/humanize-korean/`. |

La skill de loop es la barandilla por defecto. `loopy` inicia o reanuda el evidence loop; `loopy team` sube a crew mode. `loopywork`, `lpy` y `$lpy` solo inyectan guidance inicial. Research y clone son modos especializados opt-in, y ambos terminan igualmente registrando Superloopy evidence en lugar de confiar en una frase de estado.

## Demo de clonación

[![Referencia de clonación de Transferloom.com](.github/assets/transferloom-clone-reference.png)](https://transferloom.com/)

`superloopy-clone` reprodujo Transferloom.com en local y pasó validación de navegador desktop/mobile. La ejecución de referencia conservó el sticky nav, el animated hero, las app preview sections, la comparison table, el security panel, el sister app banner, el footer, los local assets y el Superloopy evidence trail.

## Crew

Para trabajos grandes, Superloopy incluye seis subagentes opcionales, cada uno con una única línea de trabajo (`.codex/agents/*.toml` en Codex, `agents/*.md` incluidos en Claude Code). Vienen con el plugin (no hace falta ningún comando); en Codex, `superloopy agents install` solo vuelve a copiarlos si alguna vez lo necesitas. Sus valores de modelo recomendados están documentados en `docs/superloopy-model-policy.md` (Codex) y `docs/superloopy-model-policy-claude.md` (Claude Code), y los verifica `superloopy doctor`.

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

**Invoca la crew** con `loopy team <task>`, o `loopy crew`, la forma de una palabra `loopycrew`, o simplemente `ultrawork <task>`. Superloopy reparte el trabajo en las líneas en paralelo y aun así prueba cada parte antes de darlo por terminado. Un `loopy <task>` normal se queda en modo solo y solo delega cuando las partes son claramente independientes.

En ejecuciones con la crew completa, el padre registra cada línea con `superloopy loop handoff`, revisa `superloopy loop fleet --json` y mantiene separado el informe final humano del gate JSON de máquina. Un informe de gate puede ser evidencia Markdown; `superloopy loop finish --artifact` es para la salida `.json` del quality gate.

Cuando un handoff de crew registrado termina, Superloopy puede imprimir una línea original de crew antes del estado normal de `handoff` o `fleet`. Sigue el idioma del usuario detectado en la asignación o el brief del scope cuando coincide con el catálogo soportado, con el inglés como fallback seguro. La línea solo da personalidad; el verdict, el evidence artifact, la lista outstanding y la lista attention siguen siendo la autoridad.

## Funciona con Superpowers

Superloopy encaja bien junto al plugin [Superpowers](https://github.com/obra/superpowers). Cada uno cubre una mitad distinta del mismo trabajo, así que no tienes que elegir.

- Superpowers lleva la primera parte del loop: lluvia de ideas, planificación y su metodología de TDD y revisión de código.
- Superloopy lleva el cierre: criterios respaldados por comandos que se vuelven a ejecutar al terminar, para que "hecho" quede probado y no solo dicho.

Si Superpowers está instalado (en Codex o en Claude Code), Superloopy lo detecta y ajusta su propia guía. Deja el diseño, la planificación y el TDD a Superpowers y se queda como el evidence gate exterior. La detección es de mejor esfuerzo y solo afecta a los consejos; nunca debilita un gate. Usa `SUPERLOOPY_SUPERPOWERS=off` para desactivarlo o `on` para forzarlo, y ejecuta `superloopy doctor` para ver qué se encontró. Más detalles en [docs/superloopy-interop-superpowers.md](docs/superloopy-interop-superpowers.md).

### Q&A

- **¿Necesito los dos?** No. Superloopy funciona por su cuenta. Si Superpowers también está, los dos se coordinan en vez de solaparse.
- **¿Qué etapa lleva cada uno?** Superpowers lleva la lluvia de ideas, la planificación y la implementación; Superloopy lleva la prueba final. Deja un solo conductor por tarea: no ejecutes `loopy team` y el flujo de subagentes de Superpowers sobre las mismas partes a la vez.
- **¿Quién decide que una tarea está hecha?** Superloopy. Vuelve a ejecutar el comando real al final y bloquea un falso aprobado.
- **¿Cómo se detecta Superpowers?** Mirando en tus carpetas de plugins de Codex y Claude Code. Puedes anularlo cuando quieras con `SUPERLOOPY_SUPERPOWERS=on|off`.

## Instalación

Superloopy se instala tanto en **Codex** como en **Claude Code** desde un mismo repo. El núcleo (loop state, evidence gates, doctor) es agnóstico del host; cada host recibe su propio manifest de plugin liviano, su cableado de hooks y su formato de agents.

### Codex

Requiere Node.js ≥ 20 y Codex CLI ≥ 0.131.0 para `codex plugin add`. Superloopy no tiene dependencias: cero dependencias de runtime, solo Node.

```
codex plugin marketplace add https://github.com/beefiker/superloopy
codex plugin add superloopy@beefiker
```

Reinicia Codex después de instalar el plugin. Si Codex te pide revisar hooks, apruébalos; la siguiente sesión aprobada ejecuta un hook `SessionStart` que hace un bootstrap único una sola vez: instala el comando `superloopy` y los agents. Si `superloopy` no aparece, su carpeta no está en tu `PATH`; el bootstrap imprime la línea exacta que debes agregar. Revisa todo con `superloopy doctor`.

¿Instalas desde un checkout? Ejecuta `node src/cli.js install --json`.

### Claude Code

Requiere Node.js ≥ 20. Desde el mismo repo:

```
/plugin marketplace add beefiker/superloopy
/plugin install superloopy@beefiker
```

Recarga los plugins (o reinicia Claude Code) y aprueba los hooks cuando te lo pida. En Claude Code las skills, los subagentes (`agents/*.md`) y los hooks (`hooks/hooks.json`) van **incluidos en el plugin** (plugin-bundled): no hay paso de instalación en `~/.codex` ni wrapper `superloopy`; los hooks invocan el CLI directamente vía `${CLAUDE_PLUGIN_ROOT}`, y `SessionStart` es un no-op limpio (no hay nada que hacer bootstrap). Para desarrollo local, apunta Claude Code a un checkout con `claude --plugin-dir <checkout>`. Verifica con `node "${CLAUDE_PLUGIN_ROOT}/src/cli.js" doctor --json`. Los valores de modelo recomendados de los subagentes para Claude están documentados en `docs/superloopy-model-policy-claude.md`.

## Actualización

### Codex

Si instalaste desde el Codex marketplace, actualiza el marketplace snapshot:

```
codex plugin marketplace upgrade beefiker
```

Superloopy revisa actualizaciones en `SessionStart`. Las instalaciones desde marketplace las gestiona Codex, así que Superloopy nunca inicia un self-update con `npx` para ellas; cuando detecta una versión nueva, te indica ejecutar el marketplace upgrade y volver a aprobar los hooks modificados.

Reinicia Codex después de actualizar. Si los hooks aparecen como Modified, apruébalos; la siguiente sesión aprobada vuelve a ejecutar el bootstrap `SessionStart` en la versión nueva. Después ejecuta `superloopy doctor`.

Si el plugin todavía parece viejo o sigue degradado, haz un repair reinstall desde el marketplace actualizado:

```
codex plugin add superloopy@beefiker
```

Si instalaste desde un checkout, actualiza el checkout y vuelve a ejecutar el installer:

```
git pull --ff-only
node src/cli.js install --json
superloopy doctor
```

Las instalaciones desde checkout no están gestionadas por `npx`. El self-update con `npx` queda reservado para un instalador futuro que escriba un snapshot `superloopy-install.json` en una raíz de instalación estable.

### Claude Code

Actualiza el marketplace, reinstala para resolver la versión nueva y luego recarga; no hace falta reiniciar:

```
/plugin marketplace update beefiker
/plugin install superloopy@beefiker
/reload-plugins
```

No hay un comando `/plugin update` aparte: reinstalar desde el marketplace actualizado resuelve la versión nueva, y `/reload-plugins` la aplica en la sesión actual (sin reiniciar Claude Code, y los hooks no necesitan volver a aprobarse). Verifica con `node "${CLAUDE_PLUGIN_ROOT}/src/cli.js" doctor --json`. Si cargaste un checkout con `--plugin-dir`, basta con `git pull --ff-only` y ejecutar `/reload-plugins`.

## Solución de problemas

Si fallan los comandos de instalación o actualización del plugin, actualiza primero el Codex CLI. `codex plugin add` está disponible desde Codex CLI 0.131.0 en adelante; las versiones antiguas pueden tener problemas con los comandos actuales de plugin marketplace y los flujos de aprobación de hooks.

Después de actualizar el CLI, reinicia Codex, vuelve a ejecutar el comando de instalación o actualización del marketplace, aprueba cualquier hook Modified y revisa con `superloopy doctor`.

En Claude Code, si los comandos `/plugin` fallan o el plugin parece viejo, ejecuta `/reload-plugins` (o reinicia Claude Code) y verifica con `node "${CLAUDE_PLUGIN_ROOT}/src/cli.js" doctor --json`.

## Desinstalación

### Codex

Elimina el plugin instalado de Codex:

```
codex plugin remove superloopy@beefiker
```

Si ya no necesitas el marketplace source, elimínalo también:

```
codex plugin marketplace remove beefiker
```

Reinicia Codex después de desinstalar. Limpieza opcional del bootstrap local: eliminar el plugin cubre la config y cache de plugins de Codex, pero el wrapper `superloopy` y los agents personales copiados pueden quedar. Revísalos antes de borrarlos, sobre todo si personalizaste algún archivo de agent.

```
rm -f ~/.local/bin/superloopy
rm -f ~/.codex/agents/franky.toml ~/.codex/agents/zoro.toml ~/.codex/agents/usopp.toml ~/.codex/agents/jinbe.toml ~/.codex/agents/robin.toml ~/.codex/agents/nami.toml
```

Si instalaste con `CODEX_HOME`, `SUPERLOOPY_BIN_DIR` o `CODEX_LOCAL_BIN_DIR`, limpia esas rutas configuradas.

### Claude Code

```
/plugin uninstall superloopy@beefiker
/plugin marketplace remove beefiker
```

Luego ejecuta `/reload-plugins`. No hay nada más que limpiar: las instalaciones en Claude Code van completamente incluidas en el plugin (sin wrapper `superloopy`, sin escrituras en `~/.codex`). Eliminar el marketplace de su último scope restante también desinstala el plugin.

<sub>Licencia MIT.</sub>
