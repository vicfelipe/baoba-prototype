# Curupira — produção e integração

26/10/2026. Nova produção a partir das oito referências atuais de `SourceArt/Curupira/references` e `SourceArt/CurupiraCorrompido/references`. As imagens originais foram preservadas. Nenhuma malha, textura, medição, captura ou ação de outro personagem foi usada como entrada. `build/source-manifest.json` registra o SHA-256 das referências lidas nesta execução. As funções comuns de ferramentas do pipeline são reutilizadas como código; todos os dados do personagem foram calculados novamente.

## Análise do projeto atual

- O Capoeirista jogável usa o modelo adotado do usuário, com rig Lunia e clipes de capoeira. Não é a malha gerada do piloto.
- O Fragmento do Silêncio é procedural: lascas animadas em torno de um núcleo. Não precisa do rig humanoide.
- O Curupira anterior (`web/src/curupira.js`) era procedural, com uma única forma, acessórios e cores alteradas por shader. Esse arquivo permanece como histórico, sem importação na build atual.
- A ficha visual vigente (`SourceArt/Curupira/PROMPT.md`) define **corrompido de 3 m** e **liberto de 2,1 m**, com pés invertidos e vegetação que nasce do corpo, sem pulseiras, cordões ou colares. Ela prevalece sobre o prompt inicial em `output/imagegen` e os documentos antigos de Unity.

## Produção

1. Fichas independentes em `SourceArt/<Forma>/character.json`, criadas por `tools/charpipe/curupira_config.py`.
2. `segment.py` lê as quatro vistas de cada forma, produz máscaras e calibrações novas. A direção das laterais está explícita na ficha: juba e galhos invalidavam a heurística que procura o nariz.
3. `curupira_build.py` gera corpo e rosto com perfis medidos, mãos com dedos, pernas, pés com cinco dedos para trás, folhas volumétricas, juba sólida e galhos do corrompido. Não há cartões transparentes. Cada forma tem seis slots: Head, Body, Hand, Leg, Foot, Support.
4. O bake comum do pipeline cria UVs e projeta as quatro referências sobre texturas próprias: 1024² por Head/Body/Leg/Support e 512² por Hand/Foot. Não foi necessário gerar novas imagens nem usar ComfyUI para executar esta produção.
5. Rig com 32 ossos de nomes Lunia, cabeça rígida, máximo de duas influências. Pés rígidos e pernas com pesos anatômicos evitam a influência cruzada do heat weighting em membros separados. Folhas da cintura seguem a pelve; vegetação dos braços segue o membro correspondente.
6. `curupira_motion.py` constrói **um esqueleto Mixamo novo com as proporções do próprio Curupira**, gera controles com o add-on Mixamo Rig instalado e autora movimentos específicos do chefe. Pés são controlados por IK. O resultado editável fica em `mocap/authored-rig.blend`; as ações são amostradas para o rig Lunia exportável.
7. Material toon 0,62/1,0 e contorno com skinning no navegador, reutilizando a implementação de material já validada no Capoeirista. GLBs com texturas e animações embutidas; fontes Blender e relatórios em cada pasta.

| Forma | Triângulos | Ossos | Clipes |
|---|---:|---:|---:|
| Liberto | 24.424 | 50 | 11 |
| Corrompido | 25.520 | 50 | 11 |

Os clipes são `idle`, `walk`, `sweepWarn`, `sweepHit`, `rootsWarn`, `rootsHit`, `cast`, `stagger`, `recover`, `freed`, `apose`. Os 13 clipes do piloto pertencem ao **herói**; não fazem parte do contrato do chefe. Os tempos dos avisos são lidos de `config.js`. Os impactos de varredura e raízes acontecem no início dos respectivos clipes, como no controlador existente. Não foram alterados dano, vida, alcance ou tempo das mecânicas.

## Revisão de movimento e juba (26/10/2026)

O usuário apontou problemas visuais e movimento "robotizado". Diagnóstico da versão anterior: `idle` com menos de 1° de variação (quadros idênticos), braços travados numa direção fixa, joelhos quase estendidos, tronco/cabeça/braços em sincronia exata, juba e saia rígidas, troca seca entre estados no navegador. Na malha, a juba tinha um anel de espinhos no topo ("coroa"), que não existe nas referências.

- **Juba:** mechas sólidas que sobem da linha do cabelo e varrem para trás até y = 0,17 H (medido na lateral). As laterais seguem a assimetria da frente (o cabelo termina em x ≈ 0,07 à esquerda e ≈ 0,12 à direita); se forem mais largas, recebem a pintura das folhas do ombro. O corrompido usa a mesma forma 15% maior. A mecha da crista fica rígida na cabeça.
- **Rig (50 ossos):** `Hair01–02` atrás da cabeça e oito cadeias `Skirt<F|FL|L|BL|B|BR|R|FR>01–02` na pelve. Cada folha da saia pertence inteira a uma cadeia (não rasga), e os pesos continuam com no máximo 2 influências. Folhas do ombro e casca copiam os pesos da pele sob elas. Joelho com transição de 0,09 H.
- **Movimento (`curupira_motion.py`):** poses-chave com curvas cúbicas monótonas (antecipação, pausa, golpe, acompanhamento) e camadas periódicas nos loops (respiração, troca de peso, olhar). Há defasagem por cadeia: pelve → coluna → pescoço → cabeça, clavícula → braço → antebraço → mão → dedos, 35% maior no corrompido. Pés IK com pivô no calcanhar (à frente) e nos dedos (atrás). A caminhada no lugar desliza o pé de apoio exatamente à velocidade `CURUPIRA.speed`, com ciclo de 0,7 s no liberto e 1,0 s no corrompido. Aviso e impacto são uma só tomada dividida em dois clipes, então o quadro de impacto não salta. Os controles do add-on ficam chaveados em `mocap/authored-rig.blend` para ajuste manual.
- **Secundário:** juba e saia são molas amortecidas guiadas pelo corpo já assado. A saia não entra nas coxas e a juba não entra nas costas. Os loops são simulados até ficarem periódicos.
- **Navegador:** crossfade visual de 0,18 s entre estados (`boss.js` passa `dt`), exceto aviso → impacto. O visualizador e os testes, que não passam `dt`, continuam com corte seco.

Os testes passam: `check_glb` nas duas formas, `check-curupira.mjs`, `check-capoeirista.mjs`, build e `shot-curupira.mjs` (`errors []`). Silhueta após a revisão (`review/motion.json`): liberto frente 0,860, costas 0,844, laterais 0,624/0,730 (antes 0,859/0,849/0,632/0,732); corrompido frente 0,747, costas 0,754, laterais 0,667/0,633 (antes 0,739/0,747/0,628/0,609). **As metas de 0,96 continuam não atingidas.** Ainda há áreas de projeção lateral na juba. Os GLBs anteriores estão em `export/*-backup.glb`.

## Cinemáticas (encontro e libertação)

Os tempos ficam em `CINEMATIC` (`web/src/config.js`). Os clipes `dormant`, `awaken`, `release` e `rise` são gerados com essas durações por `curupira_motion.py`, que lê o arquivo. O módulo `web/src/cinematic.js` controla a câmera por pontos-chave no tempo, mistura a entrada e a saída com a câmera de jogo, mostra as faixas de cinema, a cartela do chefe, o clarão e o tremor, e esconde o HUD de combate. `boss-cinematics.js` monta os planos na linha herói → chefe no instante do disparo. Enter, Esc ou Espaço pulam; ao pular, os eventos que faltam aplicam só o estado de jogo.

- **Encontro (7,2 s):** ao entrar na clareira, o portão fecha e a câmera mostra o gigante adormecido (`dormant`). Aos 1,4 s ele desperta (`awaken`): fecha as garras, ergue a cabeça, levanta-se e ruge (som `roar`, tremor, pulso violeta). Em seguida aparece a cartela "Curupira corrompido · Guardião da mata, tomado pelo Silêncio". Ao fim, `boss.begin()`: o chefe vira alvo e o ciclo começa com a espera normal de `startWait`.
- **Libertação (8,4 s):** com a corrupção zerada, a corrupção é arrancada (`release`, 2,2 s). Vem o clarão, a troca para o liberto e `world.restoreAll()` (a cor volta em onda), com música de vitória. O liberto se ergue (`rise`), olha a própria mão em close com o título "O Curupira foi libertado!", e um plano aberto mostra a clareira restaurada e a memória final. O herói fica na pose de vitória durante toda a cinemática.
- **Testes:** `shot-curupira.mjs` congela o relógio real (`__baoba.hold`) e avança as cinemáticas quadro a quadro. Ele verifica o início, a entrega ao jogo, a troca de forma, a memória final e o pulo (`Evidence/curupira-cine-*.png`). `shot-capoeirista.mjs` pula o encontro para testar o enquadramento de luta.

## No jogo

`curupira-asset.js` carrega as duas formas antes de habilitar Iniciar. `boss.js` usa os clipes do GLB e mantém os efeitos de cipó/raízes. Após zerar a corrupção, toca a reação e troca para o liberto aos 1,2 s; a altura usada pela câmera acompanha a forma. Reiniciar restaura o modelo corrompido, altura, nome, vida e estado.

O visualizador da tela inicial agora permite escolher Capoeirista, Curupira corrompido ou Curupira liberto. Inclui seleção de clipes, pausa, câmera lenta, giro e inspeção quadro a quadro.

## Reprodução

Na raiz, PowerShell (`$B = 'D:/Tools/blender-5.2.3-windows-x64/blender.exe'`):

```powershell
$env:PYTHONDONTWRITEBYTECODE='1'
& $B -b --python tools/charpipe/curupira_config.py
foreach ($nome in @('Curupira','CurupiraCorrompido')) {
  & $B -b --python tools/charpipe/segment.py -- "SourceArt/$nome/character.json"
  & $B -b --python tools/charpipe/curupira_build.py -- "SourceArt/$nome/character.json"
}
Copy-Item SourceArt/Curupira/export/Curupira.glb web/assets/curupira.glb
Copy-Item SourceArt/CurupiraCorrompido/export/CurupiraCorrompido.glb web/assets/curupira-corrompido.glb
node tools/check-curupira.mjs
node tools/check-capoeirista.mjs
npm --prefix web run build
node tools/shot-curupira.mjs
```

`--from rig` ou `--from anim` serve apenas para revisar um estágio **desta produção**. Uma reconstrução sem dados intermediários deve começar sem `--from` e executar a segmentação novamente.

## Validação e limites

Os registros atuais ficam em `Evidence/curupira-*-check.log`, `curupira-checks.json`, `curupira-browser-checks.json`, capturas `curupira-*.png` e `SourceArt/<Forma>/build/review/final.json`. Os testes de geometria não decodificam imagens; a verificação de materiais é feita pelo navegador real em perfil temporário novo, com cache desativado. Não houve playtest humano nem medição em GPU real.

**A integração funcional não equivale a aprovação artística.** A juba e as folhas ainda têm aparência segmentada e regiões laterais com distorção de projeção; mãos têm simplificação de volume. O orçamento está acima do Lunia original. As metas visuais do pipeline (IoU 0,96 e até 5% de cor divergente) ainda não foram atingidas em todas as vistas; os relatórios não devem ser apresentados como aprovação dessas metas.

As próprias referências divergem: concordância frente/costas de 0,8791 no liberto e 0,8736 no corrompido; laterais de 0,7923 e 0,8145. Isso limita uma coincidência simultânea entre vistas, mas não explica todos os erros da modelagem. Refinamento de silhueta, UVs, pintura lateral e animação secundária da vegetação continuam necessários para acabamento final.

## Ataque básico (27/10/2026)

O usuário pediu um ataque básico: antes, o herói só levava dano das habilidades.

- **Golpe:** a **garrada** com a mão esquerda (a direita é o braço do cipó), clipes `basicWarn` + `basicHit` em `curupira_motion.py`, nas duas formas.
- **Aviso:** cone vermelho curto à frente (90°, 2,6 m além do raio).
- **Números** (`CURUPIRA.basic`, proposta a validar): preparo de 0,6 s (`windup`), 12 de dano e recarga de 2,6 s. Golpe comum como os dos heróis: **sem marcação no chão nem som de aviso** (pedido do usuário, 27/10/2026); acerta no impacto dentro de alcance e arco.
- **Quando ataca:** com o herói perto, enquanto se aproxima e na 2ª metade da recuperação. A 1ª metade continua sendo a janela de punição.
- **Ciclo:** o golpe não estica o ciclo; o chefe volta ao estado anterior com o tempo já corrido.
- **Teste:** `tools/shot-boss-basic.mjs` cobre ausência de marcação, dano exato, esquiva, volta ao ciclo e janela de punição.
- **Backups:** `export/*-before-basic.glb`.
