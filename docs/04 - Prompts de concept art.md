# Prompts de concept art — apenas o P0

v0.2 · 24/10/2026. Direção: Tarisland/WoW para intenção de câmera e combate; Grand Chase para expressividade e acabamento desenhado, aplicados em 3D. Não reproduzir designs dessas franquias.

## 1. Como usar

Estes prompts descrevem intenção; não comprovam a existência de modelo, textura ou cena. Gerar um assunto por imagem e comparar com o documento 05. A seleção da referência visual específica (D01) e as imagens originais do Guardião (D03) ainda estão abertas. Não inventar uma imagem aprovada.

Primeiro escolher uma imagem-alvo de aparência em câmera de jogo; depois uma folha do personagem; depois o kit. No máximo duas rodadas de variação antes de avaliar no motor. Se houver divergência, corrigir a imagem/briefing antes de ampliar produção. Limite de rodadas é orçamento de exploração, não obrigação de aceitar arte inadequada.

Anexar apenas referências disponíveis e autorizadas para esse uso. Registrar ferramenta, data, prompt e alterações feitas. Sem imagens obrigatórias do personagem, usar o prompt para exploração identificada como provisória, nunca como reconstrução fiel.

## 2. Bloco de estilo comum

Adicionar ao início de cada pedido:

```text
Original Brazilian fantasy RPG art direction for a fully 3D game with a hand-drawn illustrated finish. Expressive illustrated character design, strong readable silhouettes, heroic rather than chibi proportions. Sculpted 3D volumes with dark warm ink contours, two broad shading tones and sparse painted accents. Subtle brush variation follows the surfaces, no photographic texture, no plastic specular highlights. Quiet backgrounds around gameplay hazards. Readable from a third-person gameplay camera. Do not copy existing franchise characters, costumes, weapons, environments or UI.
```

## 3. Imagem-alvo da experiência

```text
Single 16:9 gameplay composition, not a collage or a cinematic poster. A compact Amazon-inspired forest trail opens into a clearing. Third-person perspective with the camera approximately 7 meters behind a 1.8 meter tall Black adult hero, looking slightly downward. The hero carries a short spear and an oval shield; keep his full body visible. A stylized kapok tree with buttress roots forms the background landmark. Use a small reusable kit of trees, rocks, plank walkways and broad foliage masses. Warm greens, river teal, ochre light and warm brown ink. A cold grey corruption occupies only a small part of the environment. Show empty readable ground for an encounter and depth between foreground, characters and background. No crowd, no elaborate village, no UI text, no cinematic depth of field, no dense fog hiding the ground.
```

## 4. Guardião — folha de construção

```text
One original playable hero, neutral warm background, front, side and back construction views at matching scale, plus a face detail. Adult Black man with a strong physique, angular face, cornrow braids continuing into locs tied behind the head, light shirt and shorts, bare feet. Preserve the attached approved references when provided. Height 1.8 meters, approximately 6.5 to 7 heads tall. Expressive face without caricature; warm readable dark skin. Solid sculpted hair masses with a few drawn internal lines. Simple clothing suitable for shoulder, hip and knee deformation. Show a short spear and oval shield separately, without covering the torso. No extra armor, cape, jewelry, sacred symbols or invented identity changes. Avoid painted highlights that imply anatomy absent from the model. Construction views are design guides, not guaranteed orthographic blueprints.
```

## 5. Curupira — desenho original para o encontro

```text
One original forest protector character in three-quarter, front and side views, with a 1.8 meter human silhouette only for scale. Proposed creature height 3 meters. Backward-facing feet remain clearly visible; stylized fiery hair formed from solid flame shapes, alert expressive face, organic forest silhouette. Show the same character in two material states: cold silver-grey corruption and restored warm color. The restored version is a living ally, not a defeated corpse. Few large forms, no intricate chains, no cinematic particles. Keep the pose and anatomy consistent between states. No demonic redesign, no ritual masks, no franchise imitation. Indicate how the torso and arm prepare a wide slow strike; this is visual research, not final rig guidance.
```

## 6. Kit de cenário

```text
A production-oriented sheet of separate static 3D prop concepts, neutral background: one modular plank walkway, two rocks, two simple forest trees, one root segment, one fern clump, one tuft of ground vegetation and one small memory object shaped as an original abstract seed. Consistent hand-painted ink style and scale. Broad painted color areas, sparse directional brush marks, warm dark contours. Every prop should work from several camera angles and be reproducible with simple editable geometry. No architecture pack, no additional creatures, no labels, no sacred ornament, no photographic textures. Leave clear gaps between objects.
```

## 7. Aprovação

Conferir silhueta, pele, cabelo, pintura, profundidade e legibilidade com 05 e 11. As cores numéricas são aplicadas no material, não confiadas ao gerador. Vistas inconsistentes precisam de ajuste antes da modelagem. Uma folha com várias vistas não deve ser enviada como foto única a um conversor imagem→3D sem verificar como ele interpreta a entrada.

O aceite final acontece em captura e vídeo da Sala de Estilo no Unity. Os antigos prompts de onze regiões estão no histórico e não devem gerar trabalho no P0.

## 8. Curupira — referências de modelagem para o pipeline Lunia (v2, 26/10/2026)

Substitui a seção 5 na produção. O Curupira é o chefe e tem duas formas: **corrompido**, um monstro de 3 m, e **liberto**, humanizado, de 2,1 m. Nenhuma das duas tem acessórios no estilo do Capoeirista.

Cada forma tem 4 vistas em T-pose (`front`, `back`, `side-left`, `side-right`):
- **Liberto:** `SourceArt/Curupira/references/`.
- **Corrompido:** `SourceArt/CurupiraCorrompido/references/`.

Ordem: frente do liberto → demais vistas do liberto → frente do corrompido (a partir do liberto) → demais vistas do corrompido. Prompt de estilo, blocos de forma e de vista, negativos e checklist: `SourceArt/Curupira/PROMPT.md`.

## 9. Cangaceiro — referências de modelagem para o pipeline Lunia (v1, 26/10/2026)

Classe DPS Ranged do documento 19. Personagem original de 1,80 m em estilo Lunia, com chapéu de couro em meia-lua, cartucheiras cruzadas, coldres fechados, peixeira embainhada, perneiras e alpercatas. As vistas de corpo não têm arma na mão; bacamarte, pistola e peixeira ficam numa folha separada (slot `Weapon`). Sem retrato de pessoa real e sem símbolo religioso nos ornamentos.

Quatro vistas em T-pose em `SourceArt/Cangaceiro/references/` e folha de armas em `weapons.png`. Ordem: frente → demais vistas → armas. Prompt de estilo, sujeito, vistas, armas, negativos, checklist e notas de produção: `SourceArt/Cangaceiro/PROMPT.md`.

As imagens geradas pelo usuário (26/10) prevalecem sobre o prompt: colete de couro com ombreiras, saiote em abas, botas de cano alto e chapéu de bicos. Produção no documento 21.
