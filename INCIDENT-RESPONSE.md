# 🛡️ Playbook de Resposta a Incidentes — hideaki-bell-portfolio

> Site estático no GitHub Pages + Creator Studio com token GitHub.
> Este documento é o manual de "quando deu ruim". Leia antes de precisar dele.

## Princípios
- **O repositório é a fonte da verdade.** Tudo que o visitante vê vem de `content/*.json` no repo. Rollback = voltar o repo no tempo.
- **O token é a chave do reino.** 95% dos incidentes envolvem o token (vazado, expirado ou em dispositivo perdido).
- **A CSP já está no site** (`script-src 'self'`). Mesmo conteúdo malicioso publicado não consegue executar JS de domínios externos — isso é sua rede de proteção enquanto você reage.

---

## Incidente 1 — Token GitHub exposto/vazado
**Sintomas:** token colado em print, commitado por engano, dispositivo perdido/roubado.

1. **Revogue imediatamente**: GitHub → Settings → Developer settings → Fine-grained tokens → delete o token.
2. Gere um novo (só este repo, `Contents: Read and write`, expiração ≤ 90 dias).
3. Nos dispositivos de confiança, atualize o token em `admin.html` → Publish.
4. Confira no **audit log** da conta (GitHub → Settings → Audit log) commits ou ações estranhas nas últimas semanas.
5. Se o token vazou **publicamente** (ex.: colado no próprio site), considere o vazamento como comprometimento total: siga também o Incidente 3.

## Incidente 2 — Conteúdo malicioso/indevido publicado (defacement)
**Sintomas:** textos estranhos, imagens erradas, links suspeitos no site público.

1. **Não edite por cima com calma — reverta**: no GitHub, abra o histórico de `content/<arquivo>.json` (botão History), identifique o commit legítimo anterior e use "Revert" (ou `git revert`).
2. O Pages republica em ~1 minuto. Confira o site público.
3. Investigue a origem: foi você (token em máquina infectada?), ou a conta GitHub foi comprometida (→ Incidente 3)?
4. Rode o scan local: `node tools/validate.js` — a seção [4] aponta padrões de injeção nos JSONs.
5. No Creator Studio, o **Content Guard** registra detectações recentes no painel de publicação; revise antes de republicar.

## Incidente 3 — Conta GitHub comprometida
**Sintomas:** commits que você não fez, e-mails de "novo login", senha alterada sem sua ação.

1. GitHub → Settings → **Password**: troque já.
2. Revogue **todas** as sessões (Settings → Sessions) e todos os PATs (classic e fine-grained).
3. Ative/reforce o **2FA** (app autenticador + códigos de recuperação offline).
4. Verifique deploy keys, webhooks e GitHub Actions do repositório (Settings → … ) — atacantes adicionam chaves de persistência.
5. Reverta commits desconhecidos (Incidente 2) e verifique se o `admin.html`, os renderers e a CSP não foram alterados (`git log --boundary core/ assets/styles/index.css`).

## Incidente 4 — Suspeita de XSS no site (apesar das defesas)
1. Abra o console do navegador na página afetada: erros e requisições bloqueadas pela CSP aparecem lá (a CSP **bloqueia e registra** tentativas — isso é sua telemetria gratuita).
2. Identifique o campo do JSON que renderiza o payload: os renders escapam contexto completo, então só haveria XSS se um renderer novo foi adicionado sem escape.
3. Corrija o renderer, reverta o conteúdo (Incidente 2) e valide com `node tools/smoke.js`.

---

## Rotinas preventivas (blue team contínuo)
| Frequência | Ação |
|---|---|
| Antes de cada publicação | Conferir o log do Content Guard no painel Publish |
| A cada publicação | `node tools/validate.js` (gate inclui checagens de segurança) |
| Mensal | Revisar audit log do GitHub; conferir expiração do token |
| A cada 90 dias | Rotacionar o token (expiração curta força isso naturalmente) |
| Sempre | 2FA ativo; token só em dispositivos seus; `.tmp-check/` nunca commitado |

## O que já protege você hoje (defesas em profundidade)
1. CSP `script-src 'self'` em todas as páginas — XSS não carrega script externo nem exfiltra via fetch para outros domínios.
2. Escape de contexto completo em todos os renderers.
3. Content Guard: detecção de injeção/pollution/**segredos** (bloqueia publicação com token no conteúdo).
4. deepMerge blindado contra prototype pollution.
5. Gate de senha local no admin (trava de convenção; a segurança real é o token).
6. Validação automática (`tools/validate.js`) com seção de postura de segurança.
