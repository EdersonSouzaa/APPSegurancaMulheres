# ElaSegura — Aplicativo de Segurança para Mulheres

O **ElaSegura** é um aplicativo móvel desenvolvido para ajudar na proteção das mulheres. Ele permite que as usuárias enviem alertas de emergência (SOS) para contatos de confiança, registrem ocorrências de segurança e visualizem um mapa colaborativo em tempo real com áreas de risco em sua comunidade. O projeto é uma iniciativa de extensão universitária criada para promover a segurança pessoal por meio da tecnologia.

---

## Funcionalidades

* **Autenticação de Usuário** — Cadastre-se, faça login e redefina sua senha com segurança. As senhas são criptografadas e as sessões são gerenciadas por meio de tokens JWT.
* **Botão de Pânico (SOS)** — Envie um alerta de emergência instantâneo compartilhando sua localização em tempo real com seus contatos de confiança.
* **Contatos de Emergência** — Adicione, edite e gerencie uma lista personalizada de contatos que serão notificados em caso de emergência.
* **Mapa Interativo de Segurança** — Visualize um mapa em tempo real utilizando Leaflet. Registre ocorrências e acompanhe áreas de risco marcadas pela comunidade.
* **Registro de Ocorrências** — Cadastre incidentes de segurança com título, descrição, tipo (erro ou aviso) e coordenadas de geolocalização.
* **Feed de Alertas** — Acompanhe uma linha do tempo com os alertas e ocorrências recentes registrados por você ou por usuários próximos.
* **Caderno de Ocorrências** — Escreva e salve anotações pessoais ou evidências relacionadas à sua segurança dentro do aplicativo.
* **Perfil do Usuário** — Atualize seu nome, e-mail e foto de perfil.
* **Configurações** — Ative ou desative o compartilhamento de localização e as preferências de notificações. O aplicativo detecta automaticamente o endereço IP do servidor backend, sem necessidade de configuração manual.
* **Modo Claro e Escuro** — Suporte completo aos temas claro e escuro em todas as telas.

---

## Tecnologias

### Frontend (Aplicativo Mobile)

| Tecnologia            | Finalidade                                            |
| --------------------- | ----------------------------------------------------- |
| React Native          | Framework multiplataforma para desenvolvimento mobile |
| Expo (SDK 54)         | Ferramentas de desenvolvimento e módulos nativos      |
| Expo Router           | Navegação baseada em arquivos                         |
| TypeScript            | Tipagem estática                                      |
| Leaflet (via WebView) | Renderização do mapa interativo                       |
| TanStack React Query  | Gerenciamento do estado do servidor                   |
| Expo Location         | Acesso ao GPS e geolocalização                        |
| Expo Notifications    | Notificações locais                                   |
| AsyncStorage          | Armazenamento local persistente                       |
| Expo Blur             | Efeitos de desfoque para pop-ups da interface         |

### Backend (API REST)

| Tecnologia           | Finalidade                                           |
| -------------------- | ---------------------------------------------------- |
| Node.js              | Ambiente de execução                                 |
| Express.js           | Servidor HTTP e roteamento                           |
| TypeScript           | Tipagem estática                                     |
| PostgreSQL           | Banco de dados relacional                            |
| node-postgres (`pg`) | Cliente de conexão com PostgreSQL                    |
| bcryptjs             | Criptografia de senhas                               |
| JSON Web Token (JWT) | Autenticação sem estado (Stateless)                  |
| dotenv               | Gerenciamento de variáveis de ambiente               |
| nodemon              | Reinicialização automática durante o desenvolvimento |

---

## Como Executar

### Requisitos

* **Node.js** versão 18 ou superior
* **PostgreSQL** instalado e em execução localmente
* Aplicativo **Expo Go** instalado em seu dispositivo Android ou iOS
* O computador e o celular devem estar conectados à **mesma rede Wi-Fi**

---

### Passo 1 — Configurar o Backend

Abra um terminal dentro da pasta `server`:

```bash
cd server
npm install
```

Renomeie o arquivo de exemplo das variáveis de ambiente e configure suas credenciais:

```bash
cp .env.example .env
```

Abra o arquivo `.env` e configure a conexão com o PostgreSQL:

```env
DATABASE_URL=postgresql://SEU_USUARIO:SUA_SENHA@localhost:5432/elasegura
JWT_SECRET=sua_chave_secreta
PORT=3000
```

> **Observação:** É necessário criar previamente um banco de dados PostgreSQL chamado `elasegura`. As tabelas serão criadas automaticamente na primeira execução.

Inicie o servidor backend:

```bash
npm run dev
```

A API ficará disponível em:

```text
http://localhost:3000
```

---

### Passo 2 — Configurar o Frontend

Abra outro terminal dentro da pasta `ElaSegura`:

```bash
cd ElaSegura
npm install
```

Inicie o aplicativo:

```bash
npm start
```

O Expo Metro Bundler será aberto. Escaneie o QR Code utilizando o aplicativo **Expo Go** no seu celular ou pressione:

* `a` para abrir no emulador Android;
* `i` para abrir no simulador iOS.

> **Observação:** O aplicativo detecta automaticamente o endereço IP local do computador. Não é necessário criar ou editar nenhum arquivo `.env` no frontend.

---

