# Feature: Rede P2P para Compartilhamento de Adaptadores

A rede Peer-to-Peer (P2P) é a espinha dorsal da filosofia de IA Federada e Descentralizada do Orch-Mind. Ela permite que os usuários compartilhem e baixem adaptadores LoRA diretamente uns dos outros, sem a necessidade de um servidor central. Isso garante não apenas a privacidade, mas também a resiliência e a soberania da comunidade.

## 1. Por que uma Rede P2P?

-   **Privacidade Total**: Como nenhuma entidade central armazena os adaptadores, o controle permanece nas mãos dos usuários. Você decide o que compartilhar e com quem.
-   **Sem Censura ou Controle Central**: A rede é formada pelos próprios usuários, tornando-a resistente a qualquer tipo de controle ou ponto único de falha.
-   **Custo Zero**: Elimina a necessidade de uma infraestrutura de servidor cara para hospedar os adaptadores, o que nos ajuda a manter o Orch-Mind gratuito.
-   **Inteligência Coletiva**: Cria um "mercado" de conhecimento descentralizado, onde a comunidade pode colaborar para criar IAs cada vez mais poderosas e especializadas.

## 2. Tecnologia: Pears e Hyperswarm

Para construir nossa rede P2P, utilizamos a biblioteca **Pears**, que é uma implementação moderna e robusta baseada no protocolo **Hyperswarm**. 

-   **Hyperswarm**: É um protocolo que permite que peers (nós na rede) se encontrem e se conectem de forma confiável na internet, mesmo que estejam atrás de firewalls ou NATs. Os peers podem se encontrar ao se juntarem a um "tópico" comum (um identificador único, que no nosso caso representa um adaptador compartilhado).

## 3. Arquitetura da Rede no Orch-Mind

A funcionalidade P2P é gerenciada por uma arquitetura clara e modular, orquestrada pelo `P2PCoordinator` (`electron/handlers/p2p/P2PCoordinator.ts`), que atua como uma fachada (Facade Pattern).

-   **`p2pShareHandler.ts`**: É a ponte entre a interface do usuário (UI) e o sistema P2P. Ele escuta os eventos do `ipcMain` (ex: `p2p:initialize`, `p2p:shareAdapter`) e chama os métodos correspondentes no `P2PCoordinator`.

-   **`P2PCoordinator.ts`**: É o cérebro das operações. Ele não lida diretamente com a complexidade da rede, mas coordena três componentes principais:
    1.  **`P2PBackendManager`**: Gerencia a conexão de baixo nível com a rede Hyperswarm. É responsável por entrar e sair de "salas" (tópicos), descobrir outros peers e lidar com a troca de mensagens básicas.
    2.  **`AdapterRegistry`**: Atua como um banco de dados em memória dos adaptadores disponíveis, tanto os locais quanto os descobertos na rede. Ele mantém uma lista atualizada e notifica a UI sobre novos adaptadores encontrados.
    3.  **`FileTransferHandler`**: Gerencia a transferência de arquivos de adaptadores. Quando um download é solicitado, ele cuida de solicitar os pedaços (chunks) do arquivo ao outro peer e de remontá-lo localmente.

## 4. Fluxo de Compartilhamento e Download

**Quando um Usuário A decide compartilhar um adaptador:**

1.  O `P2PCoordinator` gera um tópico único para esse adaptador.
2.  Ele anuncia na rede que está disponível nesse tópico.
3.  Periodicamente, ele transmite uma lista dos adaptadores que possui para os peers conectados.

**Quando um Usuário B quer encontrar e baixar um adaptador:**

1.  O Usuário B entra em uma "sala" geral onde os peers anunciam seus adaptadores.
2.  Seu `AdapterRegistry` começa a receber listas de adaptadores dos outros peers, incluindo o Usuário A.
3.  A UI do Usuário B é atualizada com a lista de adaptadores disponíveis na rede.
4.  O Usuário B clica para baixar o adaptador do Usuário A. Uma requisição é enviada diretamente ao Usuário A.
5.  O `FileTransferHandler` do Usuário A começa a enviar o arquivo do adaptador, em pedaços, para o Usuário B.
6.  Ao final do download, o `P2PCoordinator` do Usuário B salva o adaptador no sistema de arquivos local e o registra, tornando-o disponível para fusão e implantação no Ollama.

Este sistema robusto e descentralizado é o que torna o Orch-Mind uma verdadeira plataforma de IA Federada.
