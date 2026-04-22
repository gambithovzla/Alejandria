# Estrategia LLM

NovelEngine no trata al LLM como un bloque unico. El backend enruta cada pipeline a un proveedor y modelo pensados para esa tarea.

## Ruta recomendada por defecto

| Pipeline | Provider | Model | Motivo |
| --- | --- | --- | --- |
| `scene_planning` | OpenAI | `gpt-5.4-mini` | Buen cumplimiento estructurado y coste contenido para planning frecuente |
| `scene_writing` | Anthropic | `claude-sonnet-4-6` | Mejor equilibrio entre voz, ritmo y coste para escritura de escena |
| `technical_audit` | OpenAI | `gpt-5.4` | Auditoria fuerte en consistencia, causalidad y schemas |
| `literary_audit` | Anthropic | `claude-opus-4-7` | Revision literaria mas fina para tension, subtexto y prosa |
| `adversarial_audit` | OpenAI | `gpt-5.4` | Buen perfil de control, escepticismo y validacion estructurada |

## Kimi

`kimi-k2.6` queda integrado como proveedor opcional y experimental:

- sirve para comparar drafts
- sirve para abaratar iteraciones si aceptas mas supervision humana
- no queda como juez editorial por defecto

## Fallback

Si falta una clave o el proveedor configurado falla, el router puede caer a `mock` si `NOVEL_ENGINE_LLM_ALLOW_MOCK_FALLBACK=true`.

Esto permite:

- seguir desarrollando el producto sin bloquearte por credenciales
- mantener tests locales estables
- ver el enrutamiento real en `GET /api/v1/health/llm`

En produccion, puedes endurecerlo poniendo:

```bash
NOVEL_ENGINE_LLM_ALLOW_MOCK_FALLBACK=false
```

## Modos soportados

### Router recomendado

```bash
NOVEL_ENGINE_LLM_PROVIDER=router
```

Cada tarea usa su propio proveedor y modelo.

### Un solo proveedor para todo

```bash
NOVEL_ENGINE_LLM_PROVIDER=openai
NOVEL_ENGINE_LLM_MODEL=gpt-5.4
```

Tambien puedes usar `anthropic`, `kimi` o `mock`.
