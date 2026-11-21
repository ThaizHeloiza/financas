// Gera public/js/config.js a partir das variáveis de ambiente da Vercel.
// A chave "anon" do Supabase é pública por natureza: quem protege os dados são as
// regras de segurança (RLS) definidas em supabase/schema.sql.
const fs = require('fs');
const path = require('path');

const url = (process.env.SUPABASE_URL || '').trim();
const key = (process.env.SUPABASE_ANON_KEY || '').trim();
const destino = path.join(__dirname, '..', 'public', 'js', 'config.js');

if (!url || !key) {
  console.warn('[config] SUPABASE_URL ou SUPABASE_ANON_KEY não definidas: o site vai rodar em modo local, sem login.');
  process.exit(0);
}

const conteudo = `/* Gerado automaticamente no deploy por scripts/gerar-config.js */
window.FINANCAS_CONFIG = ${JSON.stringify({ supabaseUrl: url, supabaseAnonKey: key }, null, 2)};
`;
fs.writeFileSync(destino, conteudo);
console.log('[config] public/js/config.js gerado com o Supabase de', new URL(url).host);
