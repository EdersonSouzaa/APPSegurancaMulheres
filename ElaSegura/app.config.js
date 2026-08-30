// A configuração do backend agora vem do Firebase, via variáveis EXPO_PUBLIC_*
// no arquivo .env (lidas direto por process.env). Este arquivo antes lia
// ../server/.env para descobrir a porta do Express, que não existe mais.
module.exports = ({ config }) => config;
