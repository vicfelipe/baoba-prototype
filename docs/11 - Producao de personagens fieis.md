# Produção de personagens fiéis — contrato P0

v0.2 · 24/10/2026. Preservar a identidade descrita no material anterior e traduzi-la para a direção hand-drawn indicada pelo usuário. Prototipar rápido reduz quantidade e acabamento secundário; não autoriza mudar rosto, tom de pele ou cabelo silenciosamente.

## 1. Referências: estado real

O documento anterior citava `Assets/Arte/Referencias/Guardiao/ref_guardiao_corpo.png` e `ref_guardiao_detalhes.png`. **Esses arquivos não estão neste workspace.** Também não foram encontrados `.blend`, FBX ou `tools/build_playable_heroes.py` mencionados no histórico. Não é possível verificar fidelidade nem confirmar os defeitos específicos atribuídos anteriormente ao script.

D03 acompanha a recuperação das referências. Manter os nomes antigos como pista de localização, não como links para material existente. Ao recuperar imagens, registrar origem e preservar originais; propor mudanças em comparação lado a lado.

Descrição textual preservada: homem adulto negro, físico forte, rosto angular, tranças nagô continuando em locs presos atrás, camiseta e bermuda claras e pés descalços. Lança curta e escudo oval comunicam Guardião. Tarisland/WoW orientam leitura em jogo; Grand Chase orienta o acabamento ilustrado, sem transformar identidade em personagem de outra franquia.

## 2. Dois níveis de entrega

**Provisório jogável:** manequim ou malha licenciada compatível, identificada como temporária. Serve para controlador, escala, hitboxes e combate. Não é demonstração de fidelidade visual.

**Personagem do P0:** identidade e silhueta reconhecíveis, cabelo e roupa coerentes, deformação funcional, material pintado e animações no motor. Não requer customização, anatomia invisível detalhada, dedos individuais completos, cabelo físico, facial complexo ou três LODs.

Duas etapas evitam bloquear o combate pela arte sem rebaixar o padrão artístico. A aprovação do protótipo visual exige a segunda.

## 3. Sequência de produção

1. **Referência e ficha:** reunir vistas, altura, silhueta, rosto, cabelo e peças ocultas. Sem referência, marcar interpretações como provisórias. Imagens em perspectiva não são plantas exatas.
2. **Silhueta:** modelar massas grandes e comparar em frente, lado, costas e três quartos. Primitivas são ferramenta inicial; não deixar membros rígidos separados como acabamento.
3. **Malha deformável:** priorizar ombros, cotovelos, quadril e joelhos. Roupa fixa pode ocultar/remover geometria interna desnecessária; não construir sistema de troca de equipamento.
4. **UV e pintura:** usar UVs que permitam linhas de roupa, rosto e cabelo. Cor base e pinceladas discretas no atlas, contorno coerente. Paleta não substitui mapeamento de superfície.
5. **Rig e pesos:** alinhar articulações à anatomia, verificar curvas de dobra e pegada. Auto-rig é ponto de partida. Limitar a quatro influências e normalizar; contagem de ossos depende do rig real.
6. **Animações:** começar parado, correr e estocada; depois completar os estados do 06. Ajustar retargeting, contato dos pés e posição da lança/escudo. Locomoção no lugar, sem root motion obrigatório.
7. **Integração:** importar FBX, validar Avatar se Humanoid, materiais, clips e prefab. Collider é independente da malha. Dano e janelas seguem lógica do 03.
8. **Revisão:** vídeo de corrida, pulo, ataque, defesa e esquiva; captura na câmera real e comparação com referências. Corrigir problemas visíveis antes de ampliar assets.

Inspeção e correções rotineiras fazem parte do trabalho. Pedir direção apenas quando faltar informação que afete identidade ou houver mudança relevante de escopo.

## 4. Contrato consolidado

| Item | P0 |
| --- | --- |
| Escala | 1,80 m; tolerância de exportação 2%; 1 unidade = 1 m |
| Proporção | 6,5–7 cabeças como ponto de partida; referência escolhida prevalece sobre exageros genéricos |
| Orçamento | Até 15.000 triângulos **incluindo lança e escudo**, até 3 materiais; fonte no 07 |
| Cabelo | Volumes sólidos com linhas pintadas, sem simulação |
| Roupa | Um traje fixo; sem tiers ou partes intercambiáveis |
| Rosto | Geometria preserva identidade; pintura simples, sem rig facial obrigatório |
| Rig | Humanoid se adequado ao herói, sem contagem de ossos inventada |
| Movimento e colisão | Valores do documento 08; não herdados das tabelas antigas |
| Animação | Autoria a 30 FPS; duração adaptada à ação, não lista rígida de quadros |
| LOD | Apenas um no P0; adicionar se a medição exigir |

## 5. Curupira

É o segundo e último personagem com rig do P0. Sua altura proposta de 3 m substitui os 6 m do chefe antigo para caber na câmera e arena reduzidas. Seus pés invertidos exigem deformação e locomoção próprias: não assumir que inverter a malha de pés num humanoide comum resolve.

Rig Generic é alternativa de trabalho; reutilizar poses somente após inspeção. Cabelo de fogo usa formas sólidas e efeito discreto. ~~Corrompido/curado compartilham malha, rig e texturas~~ — substituído em 26/10/2026: são **dois modelos** (monstro corrompido de 3 m e forma humanizada liberta de 2,1 m), ambos com esqueleto Lunia; a libertação troca o modelo com efeito. Não produzir morte sangrenta ou corpo abatido para a libertação.

## 6. Aceite e evidências

Entregar fonte editável, FBX, texturas, clips necessários, prefab e cena de teste. Evidências: imagens das quatro vistas, comparação com referências quando disponíveis, vídeo de ações e registro de contagem de triângulos/materiais. Não exigir LODs mobile ou multi-personagem para encerrar o P0 Windows.

Reprovações concretas: ombro colapsa ao defender; bermuda fica rígida ao correr; joelho visual dobra fora da articulação; arma escapa da mão; cabelo atravessa rosto; tom de pele perde leitura; contorno quebra na articulação; silhueta diverge da referência sem decisão registrada.

Estados: **provisório → modelado → rigado → animado → jogável → revisado visualmente → medido na build**. A documentação não comprova nenhuma dessas etapas.

Referência de integração: o mapeamento Humanoid/Avatar pode exigir ajuste manual, enquanto Generic usa sua hierarquia e raiz. [Manual oficial de rigs Unity](https://docs.unity3d.com/6000.0/Documentation/Manual/FBXImporter-Rig.html). A escolha específica para Curupira é uma decisão de produção a testar, não recomendação da Unity sobre esse personagem.

## 7. Reaproveitamento de movimento

Avaliar primeiro o **RPG Character Mecanim Animation Pack FREE** indicado pelo usuário; procedimento no [documento 13](<13 - Avaliacao do pacote de animacoes.md>). Retargetear um conjunto pequeno antes de concluir animação própria. Seu personagem de demonstração serve apenas de provisório, sem substituir a identidade do Guardião. Validar especialmente mão da lança, escudo, ombros e contato dos pés. Curupira mantém inspeção própria por sua anatomia. Cobertura das armas na edição gratuita ainda não foi confirmada.


## Atualização da implementação — Lutador × Curupira

Referências recuperadas no diretório arts, com nomes lutador.jpg e curupira.jpg. Dois modelos adaptados foram produzidos em Blender, exportados para FBX e importados com Avatar Humanoid válido. O usuário substituiu Guardião por Lutador; validar aparência como adaptação de protótipo, sem alegar reprodução final. Documento 14 registra os limites.
