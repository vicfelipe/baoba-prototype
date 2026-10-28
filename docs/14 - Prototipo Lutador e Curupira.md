# Protótipo implementado — Lutador × Curupira

24/10/2026 · Esta entrega substitui o recorte anterior de Guardião para o combate atual, conforme pedido do usuário. Os documentos 01–13 registram decisões e planejamento anteriores; **este documento e o README da raiz descrevem a build entregue**. A implementação em `BaobaPrototype/Assets/Baoba/Scripts` é a fonte dos valores executados.

## Entrega

**Atualização de arte em 25/10:** os dois modelos foram reconstruídos com prioridade em fidelidade, conforme [15 — Revisão visual](<15 - Revisao visual dos personagens.md>). Os valores de combate abaixo permanecem válidos; as descrições da primeira adaptação artística são históricas.

Projeto Unity 6000.3.27f1 / URP 17.3.0 e executável Windows em `Builds/Baoba/Baoba.exe`. Abertura pela raiz: `Jogar.cmd`. O encontro começa por Enter ou pelo botão na tela. É uma arena de combate isolada; não inclui a trilha narrativa planejada anteriormente.

Referências usadas: `arts/lutador.jpg` e `arts/curupira.jpg`, preservadas. Dois modelos 3D com rig, fontes Blender e FBX, contorno e cores estilizadas. Lutador: pele escura, roupa clara, locs presos e pés descalços. Curupira: corpo verde, cabelo de fogo, saia de folhas e braceletes. A anatomia e os detalhes são adaptações para o protótipo, ainda passíveis de refinamento artístico.

## Kit do Lutador

Vida 100; movimento 5,1 m/s, câmera orbital com distância inicial 7,3 m e FOV vertical 48°.

| Ação | Entrada | Comportamento atual |
| --- | --- | --- |
| Sequência de golpes | Clique / 1 | Três ações encadeáveis: 34, 34 e 52 de dano; janela de continuidade 1,5 s |
| Rasteira | Q / 2 | 65 de dano, recarga de 5 s; interrompe Chamado do Silêncio |
| Meia-lua | E / 3 | 95 de dano, recarga de 7 s |
| Esquiva | Shift | Deslocamento direcional, recarga de 2,2 s; invulnerabilidade entre 0,03 e 0,35 s da ação |
| Pulo | Espaço | Pulo simples, sem proteção automática contra áreas |

Golpes exigem distância entre centros até 3,25 m. Comandos rejeitados por distância não gastam recarga. A esquiva pode cancelar uma ação básica; Q exige concluir a ação corrente. São regras próprias do protótipo, diferentes do contrato antigo de lança/escudo.

As animações desarmadas vêm do pacote FREE de Explosive já disponível no cache do usuário. A apresentação usa clips retargeteados; nem todo movimento corresponde a uma animação autoral de capoeira. Poses e transições devem continuar sendo refinadas, especialmente para dar mais identidade à Rasteira e à Meia-lua. O controlador e o combate não dependem dos scripts de demonstração do pacote.

## Curupira

Corrupção inicial 2.400. O guardião aproxima-se, anuncia uma ação e abre uma recuperação. As três mecânicas se alternam, sem sobreposição:

| Mecânica | Aviso | Resultado | Resposta |
| --- | --- | --- | --- |
| Varredura de cipó | 1,65 s; cone de 100°, raio 4,2 m | 24 de dano | Sair pelos lados ou esquivar no impacto |
| Raízes cinzentas | 2 s; círculo de raio 2,5 m na posição marcada | 28 de dano | Sair do círculo; a marca não acompanha o jogador |
| Chamado do Silêncio | 3,4 s; barra roxa e dica Q | Pulso de 20 de dano | Aproximar e interromper com Rasteira |

A interrupção abre 3 s de recuperação. Falha de mecânica não encerra automaticamente a luta. Vida zerada encerra ataques; Corrupção zerada cancela o encontro e liberta o guardião. R reinicia após vitória/derrota, restaurando posições, vida e recargas. Esc congela combate e animações.

## Reprodução e evidência

Ver `Evidence/build-result.json`, `Evidence/rule-checks.json` e os registros de execução disponíveis. Capturas são produzidas pelo próprio executável, preservando o resultado do render. Os arquivos `combat-live.png`, `combat-mechanic.png` e `combat-result.png` mostram estados de uma simulação automática quando presentes.

Modos de verificação:

```text
Baoba.exe --demo --smoke
Baoba.exe --verify
```

O primeiro joga uma sequência automática e registra o resultado; o segundo executa casos dirigidos de golpe, recarga, interrupção, esquiva, pausa, derrota, reinício e vitória. Nenhum desses modos substitui avaliação de sensação e dificuldade por uma pessoa.

## Limites desta entrega

Estética e identidade foram adaptadas a modelos 3D programáticos com rig; não são uma reprodução artística final das imagens. Cenário, áudio sintetizado e partículas são uma base de protótipo. Não há multiplayer, progressão, inventário, mobile, classe Guardião ou fidelidade de capoeira validada por especialista.

A captura externa de janela pelo controle de aplicativos apresentou timeout nesta sessão; a inspeção visual usa capturas nativas do jogo. Os testes de comportamento são os registros automáticos declarados, sem alegar playtest humano.
