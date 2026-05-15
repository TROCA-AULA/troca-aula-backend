# Documentação do Sistema Troca Aula

Esta pasta contém toda a documentação do projeto, organizada de forma lógica para facilitar a compreensão do sistema por diferentes públicos, desde novos membros da equipe até gestores escolares e stakeholders.

---

## Estrutura da Documentação

A documentação está organizada em seções que abordam diferentes aspectos do sistema, progressing de conceitos mais amplos para detalhes mais técnicos.

### Seção 1: Visão Geral e Produto

**documentacao-produto.md** — Este é o documento principal para quem deseja compreender o sistema de forma completa. Ele inclui a visão geral do produto, definições de negócio (o que é, o que faz, como funciona), personas dos usuários principais, glossário de termos técnicos e de negócio, regras de negócio principais, diferenciais e benefícios, tecnologias utilizadas e visão de futuro. Este documento foi desenvolvido para que pessoas leigas consigam entender o sistema sem necessidade de conhecimentos técnicos prévios. É o ponto de partida recomendado para qualquer pessoa nova no projeto.

**01-visao-geral.md** — Apresenta uma visão geral resumida do projeto, incluindo o propósito, os problemas que resolve, objetivos, escopo do MVP e roadmap futuro. Também contém a arquitetura geral do sistema e a stack tecnológica utilizada.

### Seção 2: Arquitetura Técnica

**02-arquitetura-backend.md** — Documenta a estrutura técnica do backend desenvolvido em NestJS, incluindo a organização dos módulos, padrões de arquitetura utilizados, princípios de design adotados e decisões técnicas importantes.

**03-endpoints.md** — Lista todos os endpoints da API RESTful, com detalhes sobre os métodos HTTP, parâmetros de entrada, respostas esperadas e códigos de erro. Útil para desenvolvedores que precisam integrar ou consumir a API.

### Seção 3: Regras e Fluxos de Negócio

**04-regras-negocio.md** — Detalha todas as regras de negócio implementadas no sistema, incluindo regras de autenticação, swap request (troca de aulas), enrollment (inscrição), classes (aulas) e usuários. Contém também a matriz de permissões que define o que cada perfil de usuário pode fazer.

**05-user-stories.md** — Apresenta as user stories do projeto, descrevendo funcionalidades do ponto de vista do usuário final. Cada user story inclui critérios de aceitação e, em alguns casos, diagramas de fluxo.

**06-modelo-dados.md** — Documenta o modelo de dados do sistema, incluindo a modelagem relacional do banco de dados PostgreSQL. Apresenta as entidades, seus atributos, relacionamentos e restrições.

**07-fluxos-negocio.md** — Desenha os fluxos de negócio principais do sistema, mostrando como as informações fluem entre os diferentes componentes e atores do processo de substituição de professores.

**08-fluxo-banco.md** — Explica detalhadamente como os dados são manipulados no banco de dados, incluindo transações, queries principais e operações de persistência.

### Seção 4: Setup e Configuração

**09-setup-config.md** — Guia completo para configuração do ambiente de desenvolvimento, instalação de dependências, execução de testes, pipeline CI/CD, Docker e containerização, e troubleshooting. Este documento é essencial para novos desenvolvedores que precisam configurar o projeto em sua máquina local.

### Seção 5: Integração Frontend

**10-contratos-api.md** — Contratos completos da API para integração com o frontend. Contém exemplos de curl, payloads de request, responses esperadas, códigos de erro e tabela resumida de todos os endpoints. Este documento é essencial para os desenvolvedores do frontend conseguirem integrar corretamente com o backend.

### Análise e Pendências

**11-pendencias.md** — Documento de pendências de desenvolvimento, identificado durante análise do código. Lista funcionalidades que ainda não foram implementadas, como controle de limite de substituições e integração com Conta Gov.br. Inclui recomendações de implementação e status geral do projeto.

---

## Como Utilizar Esta Documentação

Para novos membros da equipe ou pessoas interessadas em compreender o sistema, a recomendação é seguir a ordem abaixo:

Primeiro, leia o documento **documentacao-produto.md**, que apresenta o sistema de forma completa e acessível para qualquer pessoa, incluindo aqueles sem conhecimento técnico. Este documento contém as definições de negócio, personas e explicações sobre como o sistema funciona.

Em seguida, se houver interesse em detalhes técnicos, pode-se avançar para os documentos de arquitetura e regras de negócio. O documento **04-regras-negocio.md** é especialmente útil para compreender o que o sistema permite e quais restrições existem.

Para desenvolvedores que precisam trabalhar diretamente com o código, os documentos de arquitetura backend, endpoints e modelo de dados fornecem todas as informações necessárias para entender a implementação técnica.

---

## Público-Alvo da Documentação

A documentação foi organizada para atender diferentes perfis de leitores. Gestores escolares e diretores encontrarão em **documentacao-produto.md** todas as informações necessárias para compreender os benefícios e regras do sistema sem precisar entrar em detalhes técnicos.

Professores e usuários finais podem utilizar a documentação do produto para entender como utilizar o sistema no seu dia a dia, compreendendo quais ações podem realizar e quais restrições existem.

Novos membros da equipe técnica encontrarão uma visão completa do projeto, desde a compreensão do produto até os detalhes de implementação, permitindo uma curva de aprendizado mais rápida.

Stakeholders e interessados no projeto podem utilizar a documentação do produto para entender o valor entregue pelo sistema e seu impacto na gestão educacional.

---

## Contribuindo com a Documentação

Esta documentação deve ser mantida atualizada conforme o sistema evolui. Ao adicionar novas funcionalidades ou modificar comportamentos existentes, verifique se a documentação correspondente precisa ser atualizada.

Para dúvidas sobre o sistema ou sugestões de melhoria na documentação, entre em contato com a equipe responsável pelo projeto.

---

## Contato e Informações Adicionais

O Sistema Troca Aula foi desenvolvido como parte do Projeto Integrador da Universidade Virtual do Estado de São Paulo (UNIVESP), polo Jaboticabal. O projeto utiliza tecnologias modernas como NestJS, TypeScript, PostgreSQL e está hospedado em ambiente de nuvem para garantir alta disponibilidade.

Para mais informações sobre o projeto, consulte o repositório no GitHub ou entre em contato com a equipe desenvolvedora.