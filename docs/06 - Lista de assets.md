# Lista de assets — inventário fechado do P0

v0.2 · 24/10/2026. Todos os itens estão **a produzir ou localizar**. Nenhum asset foi encontrado/validado nesta revisão. Contagem de arquivos exportados não equivale a quantidade de designs novos.

## 1. Modelos e composição

| ID | Asset | Quantidade de designs | Reuso / entrega mínima | Marco |
| --- | --- | --- | --- | --- |
| A01 | Guardião com roupa e cabelo fixos | 1 | Fonte editável, malha, rig, material e prefab; sem sistema modular | M1 provisório / M4 acabado |
| A02 | Lança curta e escudo oval | 2 | Modelos estáticos com encaixes de mão | M2 |
| A03 | Fragmento do Silêncio | 1 | Mesmo prefab em 3 posições; animação por transformação | M2 |
| A04 | Curupira | 1 | Um modelo e rig, estados corrompido/curado por material | M3 provisório / M4 acabado |
| A05 | Árvores comuns | 2 | Variar escala e rotação, sem novo desenho por instância | M1/M4 |
| A06 | Sumaúma-marco | 1 | Reusar tronco e copa, adicionar raízes em aletas | M4 |
| A07 | Pedras | 2 | Repetidas na trilha e limite da arena | M1/M4 |
| A08 | Vegetação baixa | 2 | Samambaia e tufo, volumes/cartões com recorte simples | M4 |
| A09 | Passarela modular | 1 | Um segmento repetível | M1/M4 |
| A10 | Raiz/cipó modular | 1 | Cenário e barreira de entrada, sem física | M3/M4 |
| A11 | Objeto de memória | 1 | Mesmo modelo no vestígio e final; materiais diferentes | M3 |
| A12 | Chão/terreno local | 1 | Malha pequena com caminho e clareira | M1/M3 |

Total: **16 designs 3D**, contando as quantidades da tabela. No máximo dois personagens com rig (Guardião e Curupira). Não inclui cada instância, textura, clip ou arquivo técnico. Céu é fundo simples; água decorativa, se usada, reaproveita plano/material e não acrescenta sistema.

## 2. Animação mínima

Guardião: parado, correr, pulo (impulso/no ar/queda), estocada, golpe de escudo, defesa sustentada, esquiva, reação e derrota — **11 clips/estados visuais de referência**. O mesmo ciclo de corrida pode servir em velocidade reduzida no P0; conferir deslizamento. Uma esquiva é reorientada ao movimento; quatro animações direcionais ficam adiadas.

Curupira: parado, deslocar, preparar cipó, atingir cipó, conjurar, recuperação e libertação — **7 clips/estados**. Raiz usa conjuração reutilizada; durações da máquina de estados comandam esperas. O rig precisa acomodar seus pés invertidos.

Fragmento: flutuar, preparar, atacar e dissolver por curvas de transformação, sem biblioteca esquelética própria. Não contar estados procedurais como clips já produzidos.

## 3. Materiais e texturas

| Grupo | Entrega |
| --- | --- |
| Herói | Até 3 materiais; atlas de cor/pintura de até 1024²; linhas e rosto podem estar no mesmo atlas |
| Curupira | Até 3 materiais; atlas até 1024² e parâmetro de corrupção |
| Ambiente | Um atlas de até 2048² para o kit; folhagem separada quando necessário |
| Fragmento e memória | Materiais simples, compartilháveis |
| Contorno | Uma solução comum validada, com parâmetros de espessura |

Limites detalhados e política de importação no 07. Não criar três paletas gigantes ou materiais separados só para cada linha de roupa.

## 4. Interface, efeitos e som

| Grupo | Mínimo do P0 |
| --- | --- |
| UI | HUD com vida/alvo/objetivo, 4 símbolos de ação, seleção de alvo, pausa, derrota e vitória |
| VFX | Cone e círculo de aviso, pulso de conjuração, impacto, interrupção, dissolução e restauração; reusar cores e formas |
| SFX | Passo, estocada, impacto, defesa, preparação, interrupção, derrota e restauração: 8 funções, com reuso permitido |
| Ambiente sonoro | Um loop de mata; música opcional se já houver material adequado com origem registrada |
| Texto | Introdução curta, dicas, objetivo, memória e conclusão em PT-BR |

A lista não exige dublagem, trilha original completa, retratos, mapa, ícones de inventário ou logotipo final. UI desenhada não precisa de ilustração distinta em cada painel.

## 5. Ficha e conclusão de asset

Para cada ID registrar: responsável, fonte/referência, origem/licença, arquivo fonte, exportação, triângulos, materiais, dependências e estado. Estados: **provisório → modelado → integrado → revisado → validado**; personagens também registram rig e animação. Só marcar etapas com evidência.

Definition of done: escala/eixos corretos, visual consistente com 05, orçamento do 07, integração na câmera do 08, ausência de erros de importação e captura/vídeo do uso real. Arquivos fonte acompanham exports. Uma imagem gerada não conclui um asset 3D.

## 6. Corte de escopo se houver atraso

Cortar primeiro: música, água decorativa, vegetação secundária e variação de árvores. Manter: herói, silhueta do Curupira, sinais de combate, interação de memória e transformação de cor. Nenhum corte deve remover os testes de estilo ou de combate que justificam o protótipo.

Personagens, regiões, montarias e centenas de itens do plano anterior estão preservados no histórico; não são fila de produção automática.

## 7. Biblioteca de animação prioritária para avaliação

Antes de animar do zero, mapear as ações deste inventário para os clips reais do **RPG Character Mecanim Animation Pack FREE**, conforme [documento 13](<13 - Avaliacao do pacote de animacoes.md>). Os 11 estados visuais do Guardião são necessidades, não encomenda de 11 animações inéditas. Registrar cada ação como coberta, adaptável ou ausente. Não presumir que estocada e escudo estejam incluídos; os 16 designs 3D e a identidade dos personagens permanecem iguais.


## Atualização da implementação — Lutador × Curupira

O recorte executado usa Lutador e Curupira, sem lança/escudo e sem a trilha. Fontes em SourceArt, FBX e animações em BaobaPrototype/Assets/Baoba. A lista acima permanece como planejamento anterior; o documento 14 descreve a entrega atual.
