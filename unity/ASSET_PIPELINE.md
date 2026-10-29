# BAOBA — ASSET_PIPELINE.md

**Status:** política técnica de produção de assets • **Owner:** Tech Art / 3D Lead.  
**Destino:** Unity 6.3 LTS URP • **Fontes abertas preferidas:** Blender (Rigify), Python, Krita, Inkscape, FFmpeg. Mixamo é opcional, proprietário e sujeito a termos próprios.

## 1. Contrato de assets

Todo asset exportável deve possuir um arquivo de metadata (JSON/YAML) com: `assetId`, `assetType`, `regionId`, `sourceFile`, `generatorVersion`, `seed`, `license`, `rightsStatus`, `culturalStatus`, `unitScale`, `dimensions`, `polyCount`, `materials`, `textureSets`, `lods`, `colliderPolicy`, `sockets`, `unityPrefab`, `revision`.

Categorias: environment modular, prop, foliage, character, creature, animation, VFX, UI, audio. IDs estáveis por região; `REG_ARUA` e assim por diante. `assetId` não nasce do nome do arquivo/texto de exibição.

## 2. Unidades e orientação

- 1 Unity unit = 1 metro; Blender em escala métrica.
- Presets de export definem conversão de eixos; não compensar eixo incorreto com rotação aleatória no prefab.
- Escala de objeto aplicada e raiz consistente; pivô modular em base/canto/ponto de snap conforme classe.
- Conectores/sockets têm nomes fixos: `socket_weapon_r`, `socket_weapon_l`, `socket_back`, `socket_head`, `socket_vfx_root`.
- Teste de referência: cubo de 1m e humanoide de ~1,75m importados sem ajuste manual de escala.

## 3. Blender e modelagem

Blender `.blend` é fonte de verdade da geometria; export preferencial **FBX para rigs/animação humanoide Unity**, **glTF/GLB para props estáticos quando o import pipeline adotado suportar de forma validada** (Unity não deve assumir importador glTF nativo sem pacote/teste); FBX é fallback para geometria estática. Cada formato tem teste de importação e material. Não usar export OBJ para personagens animados.

Checklist: normals/tangents, UV sem overlap não intencional, non-manifold crítico ausente, transforms aplicados, materiais nomeados, triangulação consistente onde necessária, mesh/collider separados. Para assets procedurais gerar a partir de script + seed, registrar versão e checksums.

## 4. Polígonos e LODs — orçamento inicial

| Asset | LOD0 alvo | LOD1 | LOD2 |
|---|---:|---:|---:|
| Humanoide jogável | 25–45k tri | 50% LOD0 | 20–30% |
| NPC comum | 12–25k tri | 50% | 20–30% |
| Criatura comum | 10–30k tri | 50% | 20–30% |
| Prop hero | 3–12k tri | 50% | 20–30% |
| Prop comum | 300–3k tri | conforme distância | simplificado |
| Vegetação | definido por silhouette e overdraw | impostor/card quando justificável | culling |

**Não são limites universais.** Serão calibrados por profiler URP, distância de câmera, instancing e densidade de cena. LOD nunca destrói uma silhueta de landmark em distância de navegação.

## 5. Texturas e materiais

URP/Lit ou shader estilizado aprovado. PBR quando útil, reduzindo complexidade para o visual pintado. Baseline: 2K para hero/protagonista, 1K para NPC/prop destacado, 512–1K para prop comum; atlas e trim sheets para arquitetura repetida. Mapas: BaseColor(sRGB), Normal(linear), Mask/Metallic/AO e Emission controlada. Texturas devem indicar canal, compressão e variantes plataforma. Usar naming `T_<assetId>_<Map>_<Resolution>`.

**Atenção:** paletas e ornamentos das concept arts são referência de estilo, não texturas prontas nem representação historicamente validada. Não copiar padrões sagrados sem revisão de origem/direitos. Textos gerados dentro de concept art não são especificação verificável.

## 6. Rigging e animação

Humanoides: Blender **Rigify** gera rig de controle a partir de meta-rig; weights e skin QA; bake de animações no **skeleton de deformação** exportável; Unity Humanoid Avatar/retarget via Mecanim. Rig do autor não é requisito de runtime. Constraints runtime usam **Unity Animation Rigging** para foot IK, aim/look-at e hand placement, com custo medido. Criaturas quadrúpedes/serpentinas/voadoras usam Generic/custom rigs; nunca forçar humanoide.

Pipeline: `concept → blockout → model → retopo → UV → skin/rig → animation → bake → export → Unity import → Avatar validation → prefab → LOD/collider → test scene`.

Biblioteca mínima Guardião: Idle; Walk/Run/Sprint; JumpStart/Air/Land; Dodge 4 direções; Light01-03; Heavy; Block enter/loop/hit/exit; RootBash/BarkGuard/BindingRoots; HitReact; Stagger; Death; Pickup; Interact. Definir clip IDs e animation events; gameplay state não depende do Animator como autoridade.

Mixamo pode acelerar testes humanoides; registrar proveniência/licença, não depender de API inexistente nem prometer auto-rig de criaturas.

## 7. Regras físicas e prefab

Collider por função (capsule player, boxes complexas simplificadas, mesh collider estática somente quando apropriado); colisão não deve reproduzir detalhe decorativo de alta frequência. Folhagem física simplificada. Prefabs por **Editor Scripts** (`PrefabUtility`, `AssetDatabase`), **não editar `.meta`** e evitar alterar YAML de scene/prefab manualmente. `AssetPostprocessor` valida escala, materiais, Animator/Avatar, LOD e sockets.

## 8. Automação IA-friendly

```text
Prompt/Spec + referência visual validada
→ JSON de parâmetros + seed
→ Blender Python batch (model/UV/material/rig/bake)
→ export FBX
→ Unity -batchmode import + validate
→ Editor builder gera Prefab
→ PlayMode import sandbox + screenshot/report
→ aprovação humana de forma/qualidade/cultura
```

A IA pode gerar **placeholders procedurais simples**, não se deve afirmar que automaticamente gera hero assets/rig/expressões finais sem revisão humana.

## 9. Portões de validação

A0 nomenclatura/metadata; A1 escala/pivot/geometria; A2 UV/material; A3 rig/animation/avatar; A4 import/mapeamento prefab; A5 gameplay collider; A6 performance no cenário; A7 direitos/cultura. Falha em A0/A1/A3 bloqueia entrega do asset; A7 bloqueia publicação de conteúdo com dependência cultural não resolvida.

## 10. Exemplo de manifesto

```json
{
  "assetId": "PROP_ARU_DOCK_POST_001",
  "assetType": "prop",
  "regionId": "REG_ARUA",
  "sourceFile": "Art/Blender/aru_dock_post.blend",
  "generatorVersion": "procedural-0.1.0",
  "seed": 1442,
  "unitScale": 1.0,
  "dimensionsMeters": [0.35, 1.6, 0.35],
  "exportFormat": "fbx",
  "license": "original-project",
  "rightsStatus": "APPROVED",
  "culturalStatus": "FICTION_ORIGINAL",
  "colliderPolicy": "box",
  "lods": ["LOD0", "LOD1", "LOD2"]
}
```
