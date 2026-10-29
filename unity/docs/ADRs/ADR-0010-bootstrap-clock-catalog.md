# ADR-0010 — Bootstrap, relógio e catálogo de M0

Data: 2026-10-29. Task: TASK-010.
Status: implementação para validação; sem ratificação formal registrada.

Aplica as decisões normativas ADR-002/003/004. Sem novos pacotes.

- `ContentId` é valor imutável, ASCII imprimível sem whitespace, comparação
  ordinal sensível a maiúsculas. Não normaliza IDs nem usa nomes de exibição.
  O valor default é inválido e falha na resolução. ID inicial da configuração
  de sessão: `SESSION_ARU_MVP_001`; não renomear após uso persistente.
- `IClock.Tick` mede milissegundos monotônicos de simulação. `SimulationClock`
  acumula ticks de TimeSpan para preservar frações de milissegundo, rejeita
  tempo negativo/overflow e descarta tempo recebido durante pausa. O adapter
  `UnityGameplayClock` é avançado pelo Bootstrap com delta não escalado;
  pausa é explícita por `SetPaused`, sem recuperação do tempo pausado.
- `ContentIndex` puro valida IDs, duplicatas e referências antes de publicar
  uma instância utilizável. `GetRequired<T>` falha com ID inválido, ausente ou
  tipo incorreto. Referências são por IDs; ciclos não são proibidos, pois
  representam lookup, não construção recursiva de serviços.
- ScriptableObjects guardam authoring, referências de assets e configuração;
  não constituem save. `ScriptableObjectCatalog` cria o índice e detecta
  referências Unity ausentes. `SessionDefinition` guarda a seed; RNG ainda
  não é implementado. `BootstrapDefinition` escolhe catálogo, sessão e cena.
- `GameBootstrap` compõe `GameServices` explicitamente, sem container DI e
  sem registro universal. Publica os serviços apenas após validar configuração
  e destino. Persiste na troca de cena. Duplicatas são descartadas. Falhas
  limpam o estado publicado e geram log; não carregam uma cena como fallback.
- `00_Bootstrap` antecede a cena técnica existente; não há menu ou conteúdo
  jogável. Setup usa Editor APIs e preserva assets/cenas já criados. Seu uso
  explícito coloca Bootstrap como primeira cena de build. CI não chama Setup.
- Smoke aguarda inicialização e troca de cena, confirma serviços/câmera e
  encerra via flag explícita. Não mede rendering, gameplay ou performance.

APIs foram exercitadas no Editor fixado, sem alteração de versões. Ver
TASK-010 para evidências e SPEC_CONFLICT-M0-sequencing para a correção da
restrição de sequência registrada pelo agente na etapa anterior.
