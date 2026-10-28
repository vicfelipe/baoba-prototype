# Avaliação — RPG Character Mecanim Animation Pack FREE

24/10/2026 · Indicado pelo usuário · Estado: **candidato prioritário para teste**, sem download, importação ou validação local.

## 1. Decisão de produção

Testar este pacote antes de criar animações genéricas ou controlador equivalente do zero. Reaproveitar o que funcionar para acelerar o P0; manter identidade do Guardião, direção hand-drawn e regras de combate do documento 03.

O benefício esperado é reduzir trabalho em movimento, transições e apresentação de ações. Não reduzir a estimativa de prazo até medir integração e cobertura dos movimentos necessários.

## 2. O que as fontes confirmam

O fabricante anuncia **88 animações** na edição gratuita e avisa que os vídeos incluem material exclusivo da edição completa. O histórico menciona controlador, movimento relativo à câmera, navegação, strafing e integração de entrada; registra InputManager como padrão e Input System opcional na atualização 2.3. Isso requer conferir a configuração da versão importada. [Página oficial do pacote gratuito](https://www.explosive.ws/collections/asset-packs/products/rpg-character-mecanim-animation-pack-free).

Na consulta, a Unity Asset Store apresentava versão **2.5.2**, publicada em **6 de maio de 2025**, e compatibilidade declarada com Unity **6000.0.47f1**, incluindo URP. Essa declaração não comprova funcionamento em qualquer versão Unity 6 ou no nosso personagem. [Página na Unity Asset Store](https://assetstore.unity.com/packages/3d/animations/rpg-character-mecanim-animation-pack-free-65284).

Não foi inspecionado o conteúdo do pacote. A lista exata de clips, seus nomes, root motion, eventos e cobertura de lança/escudo continuam pendentes. Documentação geral e vídeos da família de produtos não comprovam a presença de uma funcionalidade na edição FREE.

## 3. Encaixe em Baobá

| Necessidade | Aproveitamento proposto | O que falta validar ou implementar |
| --- | --- | --- |
| Movimento de RPG em terceira pessoa | Avaliar clips e controlador existentes | Velocidade, giro, colisão, strafing e interação com câmera do 08 |
| Ataque, defesa, reação e esquiva | Mapear clips compatíveis do pacote | Lista exata, transições, tempos, alcance e janelas do 03 |
| Guardião com lança e escudo | Retargeting de locomoção se adequado | Estocada, pegada, defesa e golpe de escudo; não presumir cobertura FREE |
| Alvo assistido | Aproveitar estrutura de alvo se houver | Seleção por Tab, prioridades, alcance e linha de visão de Baobá |
| Chefe com mecânicas | Usar apresentação de ações quando aplicável | Estados, telegráficos, dano, interrupção e reset continuam requisitos próprios |
| Visual hand-drawn | Usar movimentos em nosso modelo pintado | Rosto, cabelo, silhueta, materiais, traço e efeitos não vêm resolvidos pelas animações |
| Curupira | Reaproveitamento somente após teste anatômico | Pés invertidos e poses próprias; não forçar rig humanoide incompatível |

“Tem controle de ataque” não significa “já calcula dano, ameaça, recargas e mecânicas como um RPG completo”. Só adotar capacidades demonstradas na build de teste.

## 4. Teste de integração — orçamento proposto de um dia útil

Inserir entre M0 e M2, aproveitando a Sala de Estilo de M1. Esse tempo é um limite inicial de investigação, não promessa de integração completa.

1. Importar em projeto de teste com a versão de Unity/URP escolhida. Registrar versão do pacote e alterações de Project Settings. Preservar arquivos do fornecedor separados do código Baobá.
2. Rodar a demonstração e uma build Windows; registrar erros e dependências reais. Não migrar scripts antes de verificar como foram planejados para funcionar.
3. Inventariar clips: nome real, ação, arma/postura, duração, loop, root motion e eventos. Preencher uma linha por necessidade do P0 como **coberto / adaptar / ausente**.
4. Retargetear parado, corrida e um ataque para o rig disponível. Se apenas manequim existir, validar integração técnica e manter fidelidade pendente.
5. Testar piso, rampa, giro, pulo, strafing e obstáculos. Verificar se há dois controladores movendo o mesmo objeto ou duas câmeras disputando posição.
6. Disparar uma ação a partir da lógica de Baobá; verificar impacto único, cancelamento, pausa e reset. Desabilitar eventos de demonstração que duplicariam dano.
7. Capturar vídeo e anotar horas de adaptação. Escolher uma das rotas abaixo.

## 5. Rotas de adoção

**A — clips e Animator:** usar animações e transições úteis com controle de movimento/combate de Baobá. Preferível se os scripts de demonstração conflitarem com nossa entrada, câmera ou regras.

**B — controlador adaptado:** reaproveitar movimento e apresentação do pacote através de um adaptador pequeno, se isso passar nos testes com menos trabalho. Não manter simultaneamente outro controlador autoritativo de movimento.

**C — reaproveitamento parcial:** conservar apenas clips aprovados e produzir/adquirir separadamente os movimentos que faltam. Qualquer compra é uma decisão futura; o plano atual não depende da versão paga.

A recomendação é avaliar B rapidamente e usar A se houver conflitos relevantes. Nenhuma rota autoriza mudar a classe para espadachim ou remover lança/escudo silenciosamente para caber na biblioteca.

## 6. Contrato de integração

A lógica do documento 03 continua definindo vida, impacto, recarga e interrupção. Animator representa o estado; eventos podem sincronizar áudio/VFX. Movimento usa um único responsável; tratar root motion explicitamente, evitando deslocamento duplicado. Entrada passa por um mapa único; não exigir InputManager e Input System ativos ao mesmo tempo por conveniência do demo.

Câmera segue o 08: avaliar a do pacote contra esse contrato, mantendo apenas uma solução ativa. Não herdar automaticamente atalhos, velocidade, invulnerabilidade ou combos da demonstração. Ajustes de timing precisam de revisão visual para não acelerar movimentos de forma artificial.

Para a direção Grand Chase/hand-drawn, avaliar poses e ritmo na câmera real. Reutilizar mocap ou animação esquelética não impede aparência desenhada, mas pode exigir ajustes de antecipação e impacto. Não baixar a taxa global de animação para simular desenho antes de comprovar leitura e responsividade.

## 7. Critério de aceite

- Build Windows funciona no editor/URP escolhidos.
- Cada ação do P0 tem clip identificado ou lacuna registrada com plano de adaptação.
- Não há dano nem deslocamento duplicado, conflitos de entrada ou câmeras concorrentes.
- Retargeting preserva ombros, joelhos, pés e pegada; lança/escudo são testados de verdade.
- Pausa, interrupção, derrota e reset passam nos casos do 03.
- Direção avalia o movimento junto do modelo hand-drawn; aparência não é considerada resolvida pelo pacote.

Entrega do teste: inventário de clips, vídeo, log de build, rota escolhida e esforço restante. Até isso acontecer, o pacote é uma oportunidade concreta de redução de trabalho, não dependência aprovada.


## Atualização da implementação — Lutador × Curupira

Pacote FREE localizado no cache local e inspecionado. A pasta Unarmed foi extraída com seus metadados e Avatar de origem, permitindo retargeting para os modelos próprios. Escolhida rota A: clips reutilizados, Animator e controlador próprios. Não houve compra ou dependência da versão paga; lança/escudo deixaram de fazer parte do pedido atual. Evidências da entrega no documento 14.
