# ElaSegura - Guia de Execução

Este projeto consiste em um aplicativo mobile (Frontend) e um servidor de API (Backend) com banco de dados PostgreSQL rodando localmente.

## 🚀 Como Executar o Projeto

### 1. Pré-requisitos
- **Node.js** instalado (versão 18 ou superior).
- **PostgreSQL** instalado e rodando no seu computador.
- **Banco de Dados:** Você deve criar um banco chamado `elasegura` manualmente (via pgAdmin ou psql).

---

### 2. Configuração do Backend (API)
Abra um terminal na pasta `server`:

1. **Instalar dependências:**
   ```bash
   npm install
   ```

2. **Configurar Variáveis de Ambiente:**
   - Renomeie o arquivo `.env.example` para `.env`.
   - Abra o `.env` e substitua `USUARIO` e `SENHA` pelas suas credenciais do PostgreSQL.
   - Certifique-se de que o nome do banco é `elasegura`.

3. **Iniciar o servidor:**
   ```bash
   npm run dev
   ```
   *O servidor estará rodando em http://localhost:3000. As tabelas serão criadas automaticamente no primeiro acesso.*

---

### 3. Configuração do Frontend (App)
Abra outro terminal na pasta `ElaSegura`:

1. **Instalar dependências:**
   ```bash
   npm install
   ```

2. **Configurar o IP da Máquina:**
   - No celular, o `localhost` não funciona. Você deve usar o IP do seu computador.
   - Abra o arquivo `services/api.ts`.
   - Atualize a constante `API_URL` com o seu IP atual (ex: `http://192.168.x.x:3000`).
   - *Dica: Use o comando `ipconfig` no terminal para descobrir seu endereço IPv4.*

3. **Iniciar o App:**
   ```bash
   npx expo start
   ```
   *Escaneie o QR Code com o app Expo Go no seu celular Android ou a Câmera no iOS.*

---

## 🛠️ Funcionalidades Implementadas
- ✅ Cadastro de usuários com validação.
- ✅ Login com autenticação JWT.
- ✅ Recuperação de senha (Reset Password).
- ✅ Feedback visual de erros (mensagens em vermelho).
- ✅ Popup de sucesso premium com desfoque (BlurView).
- ✅ Estrutura de tabelas para Ocorrências, Contatos e SOS.

## 📌 Regra de Ouro
Para que o aplicativo no celular consiga se conectar ao backend no computador:
1. Ambos **DEVEM** estar conectados na **mesma rede Wi-Fi**.
2. O **Firewall do Windows** deve permitir conexões na porta `3000`.
