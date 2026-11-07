#!/usr/bin/env bash
# =============================================================================
#  Troca Aula — roteiro AUTOMÁTICO de teste da API (sem precisar do frontend)
# =============================================================================
#
#  O que este roteiro faz:
#    Simula um dia inteiro de uso do sistema, chamando a API do backend do
#    mesmo jeito que as telas chamariam, e confere se cada resposta é a
#    esperada. No fim, mostra quantos testes passaram e quantos falharam.
#
#  Pré-requisitos (ver docs/guias-de-teste/01-como-iniciar-a-aplicacao.md):
#    1. Banco de dados ligado e com as migrations aplicadas.
#    2. SQL base aplicado (sql/01-base-producao.sql) — cria o usuário MASTER.
#    3. Backend rodando (por padrão em http://localhost:5000).
#    4. Programas: curl e jq instalados.
#
#  Como rodar (de dentro da pasta "troca aula"):
#    bash docs/guias-de-teste/api/testar-api.sh
#  ou, dentro do troca-aula-backend:
#    bash test/api/testar-api.sh
#
#  Este arquivo (troca-aula-backend/test/api/testar-api.sh) é a versão
#  oficial: o CI do backend roda ele contra um Postgres de verdade. O da
#  pasta docs/ da raiz só chama este.
#
#  Variáveis opcionais:
#    API=http://localhost:5000                  endereço do backend
#    MASTER_EMAIL=master@trocaaula.local        login do MASTER do SQL base
#    MASTER_PASSWORD='Trocar@123'               senha do MASTER do SQL base
#
#  Pode rodar quantas vezes quiser: cada execução cria dados novos com um
#  sufixo único (ex.: "Município A 1729630000"), sem conflitar com as
#  execuções anteriores.
# =============================================================================

set -u

API="${API:-http://localhost:5000}"
MASTER_EMAIL="${MASTER_EMAIL:-master@trocaaula.local}"
MASTER_PASSWORD="${MASTER_PASSWORD:-Trocar@123}"
RUN="$(date +%s)"
SENHA="Senha@123"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

PASS=0
FAIL=0
FALHAS=()

for bin in curl jq; do
  command -v "$bin" >/dev/null || { echo "Falta o programa '$bin'. Instale e rode de novo."; exit 1; }
done

# --- funções auxiliares -------------------------------------------------------

# req MÉTODO CAMINHO TOKEN [JSON]  → preenche $STATUS e $BODY
req() {
  local metodo=$1 caminho=$2 token=$3 dados=${4:-}
  local args=(-s -o "$TMP" -w "%{http_code}" -X "$metodo" "$API$caminho")
  [ -n "$token" ] && args+=(-H "Authorization: Bearer $token")
  # Só manda Content-Type quando há corpo: o servidor (Fastify) recusa
  # "application/json" com corpo vazio.
  [ -n "$dados" ] && args+=(-H "Content-Type: application/json" -d "$dados")
  STATUS=$(curl "${args[@]}")
  BODY=$(cat "$TMP")
}

ok()   { PASS=$((PASS + 1)); echo "   ✅ $1"; }
erro() { FAIL=$((FAIL + 1)); FALHAS+=("$1"); echo "   ❌ $1"; echo "      ↳ resposta: $(echo "$BODY" | head -c 300)"; }

# confere o código HTTP
espera() { # "descrição" código_esperado
  if [ "$STATUS" = "$2" ]; then ok "$1 (HTTP $STATUS)"; else erro "$1 — esperado HTTP $2, veio HTTP $STATUS"; fi
}

# confere uma condição jq sobre o corpo da resposta
confere() { # "descrição" 'expressão jq que deve dar true'
  if echo "$BODY" | jq -e "$2" >/dev/null 2>&1; then ok "$1"; else erro "$1"; fi
}

login() { # email senha → imprime o token
  req POST /auth/login "" "{\"email\":\"$1\",\"password\":\"$2\"}"
  echo "$BODY" | jq -r '.access_token // empty'
}

criar_usuario() { # nome email [subjectId] → imprime o id
  local extra=""
  [ -n "${3:-}" ] && extra=",\"subjectId\":$3"
  req POST /users "" "{\"name\":\"$1\",\"email\":\"$2\",\"phone\":\"11999990000\",\"password\":\"$SENHA\"$extra}"
  echo "$BODY" | jq -r '.id // empty'
}

secao() { echo; echo "━━━ $1"; }

# conteúdo (payload) de um token de login, em JSON
payload() { # token
  local p
  p=$(echo "$1" | cut -d. -f2 | tr '_-' '/+')
  while [ $(( ${#p} % 4 )) -ne 0 ]; do p="$p="; done
  echo "$p" | base64 -d 2>/dev/null
}

# =============================================================================
secao "0. O backend está no ar?"
# Por quê: se a API não responde, nenhum outro teste faz sentido.
req GET /health ""
espera "GET /health responde" 200
[ "$STATUS" = "200" ] || { echo "Backend fora do ar em $API — suba o backend e rode de novo."; exit 1; }

# =============================================================================
secao "1. Login (autenticação)"
# Por quê: tudo no sistema depende de saber QUEM está fazendo a ação.
MASTER=$(login "$MASTER_EMAIL" "$MASTER_PASSWORD")
[ -n "$MASTER" ] && ok "Login do MASTER do SQL base retorna token" || { erro "Login do MASTER ($MASTER_EMAIL) — aplicou o sql/01-base-producao.sql?"; exit 1; }

req POST /auth/login "" "{\"email\":\"$MASTER_EMAIL\",\"password\":\"senha-errada\"}"
espera "Login com senha errada é recusado" 401

req GET /networks ""
espera "Rota protegida sem token é recusada" 401

# D19: o token de login tem validade (antes valia para sempre)
if payload "$MASTER" | jq -e '(.exp - .iat) > 0 and (.exp - .iat) <= 86400' >/dev/null 2>&1; then
  ok "O token de login expira (validade de até 24h)"
else
  BODY=$(payload "$MASTER"); erro "O token de login deveria ter validade (exp)"
fi
req POST /auth/refresh "$MASTER"
espera "Renovar o token de quem está logado" 200
[ -n "$(echo "$BODY" | jq -r '.access_token // empty')" ] && ok "A renovação devolve um token novo" || erro "A renovação devolve um token novo"
req POST /auth/refresh ""
espera "Renovar sem estar logado é recusado" 401

# =============================================================================
secao "2. Redes de ensino (municípios) — só o MASTER cria"
req POST /networks "$MASTER" "{\"name\":\"Município A $RUN\"}"
espera "MASTER cria a rede 'Município A'" 201
REDE_A=$(echo "$BODY" | jq -r .id)
req POST /networks "$MASTER" "{\"name\":\"Município B $RUN\"}"
espera "MASTER cria a rede 'Município B'" 201
REDE_B=$(echo "$BODY" | jq -r .id)

req POST /networks "$MASTER" '{}'
espera "Criar rede sem nome é recusado (validação)" 400

# =============================================================================
secao "3. Política municipal de carga horária"
# Regra: no Município A, carga SUPLEMENTAR (tipo 4) tem teto de 10h por semana.
req POST /workload-policies "$MASTER" "{\"networkId\":$REDE_A,\"workloadTypeId\":4,\"maxHoursPerWeek\":10,\"ataOficialRequired\":false}"
espera "MASTER cria política: SUPLEMENTAR até 10h/semana no Município A" 201

req POST /workload-policies "$MASTER" "{\"networkId\":$REDE_A,\"workloadTypeId\":4,\"maxHoursPerWeek\":20}"
if [ "$STATUS" = "201" ]; then erro "Política duplicada (mesma rede + mesmo tipo) deveria ser recusada"; else ok "Política duplicada (mesma rede + mesmo tipo) é recusada (HTTP $STATUS)"; fi

# =============================================================================
secao "4. Escolas"
req POST /schools "$MASTER" "{\"name\":\"EMEF Alfa $RUN\",\"networkId\":$REDE_A}"
espera "MASTER cria a escola 'EMEF Alfa' no Município A" 201
ESC_A1=$(echo "$BODY" | jq -r .id)
req POST /schools "$MASTER" "{\"name\":\"EMEF Beta $RUN\",\"networkId\":$REDE_B}"
espera "MASTER cria a escola 'EMEF Beta' no Município B" 201
ESC_B1=$(echo "$BODY" | jq -r .id)

req POST /schools "$MASTER" "{\"name\":\"Escola sem rede $RUN\"}"
espera "Criar escola sem informar a rede é recusado" 400

# =============================================================================
secao "5. Disciplinas (catálogo global — só o MASTER escreve)"
req POST /subjects "$MASTER" "{\"name\":\"Matemática $RUN\"}"
espera "MASTER cria a disciplina Matemática" 201
MAT=$(echo "$BODY" | jq -r .id)
req POST /subjects "$MASTER" "{\"name\":\"Português $RUN\"}"
espera "MASTER cria a disciplina Português" 201
POR=$(echo "$BODY" | jq -r .id)

req GET /subjects ""
espera "Lista de disciplinas é pública (usada no cadastro)" 200

# Catálogo de disciplinas (tela /master/disciplinas)
req POST /subjects "$MASTER" "{\"name\":\"Quimica $RUN\"}"
espera "MASTER cria uma disciplina de teste" 201
QUI=$(echo "$BODY" | jq -r .id)
req PATCH "/subjects/$QUI" "$MASTER" "{\"name\":\"Química $RUN\"}"
espera "MASTER renomeia a disciplina" 200
confere "O nome novo foi gravado" ".name == \"Química $RUN\""
req DELETE "/subjects/$QUI" "$MASTER"
espera "MASTER remove a disciplina" 200
req GET /subjects ""
confere "A disciplina removida some da lista" "[.[] | .id] | index($QUI) == null"

# =============================================================================
secao "6. Cadastro de pessoas (auto-cadastro público)"
DIR_A=$(criar_usuario "Diretora Ana $RUN" "diretora.a.$RUN@teste.local")
AUX_A=$(criar_usuario "Secretário Beto $RUN" "aux.a.$RUN@teste.local")
PROF1=$(criar_usuario "Prof. Carla (Mat) $RUN" "prof1.$RUN@teste.local" "$MAT")
PROF2=$(criar_usuario "Prof. Davi (Mat) $RUN" "prof2.$RUN@teste.local" "$MAT")
PROF3=$(criar_usuario "Prof. Eva (Port) $RUN" "prof3.$RUN@teste.local" "$POR")
PROF4=$(criar_usuario "Prof. Íris (Mat) $RUN" "prof4.$RUN@teste.local" "$MAT")
PROFB=$(criar_usuario "Prof. Fábio (Mat, Mun. B) $RUN" "profb.$RUN@teste.local" "$MAT")
PROFX=$(criar_usuario "Prof. Gil (sem vínculo) $RUN" "profx.$RUN@teste.local" "$MAT")
PROFN=$(criar_usuario "Prof. Nina (sem disciplina) $RUN" "profn.$RUN@teste.local")
DIR_B=$(criar_usuario "Diretor Hugo $RUN" "diretor.b.$RUN@teste.local")
for v in DIR_A AUX_A PROF1 PROF2 PROF3 PROF4 PROFB PROFX PROFN DIR_B; do
  [ -n "${!v}" ] && ok "Usuário $v criado (id ${!v})" || erro "Criar usuário $v"
done

req POST /users "" "{\"name\":\"Duplicado\",\"email\":\"prof1.$RUN@teste.local\",\"phone\":\"1\",\"password\":\"$SENHA\"}"
espera "Cadastro com e-mail repetido é recusado com mensagem clara" 409
confere "A mensagem diz 'E-mail já cadastrado'" '.message == "E-mail já cadastrado"'
req POST /users "" "{\"name\":\"Senha curta\",\"email\":\"curta.$RUN@teste.local\",\"phone\":\"1\",\"password\":\"123\"}"
espera "Cadastro com senha de menos de 8 caracteres é recusado" 400

# =============================================================================
secao "7. Vínculos (quem trabalha onde, e com qual perfil)"
# Perfis: 1=DIRETOR, 2=AUXILIAR_ADMIN, 3=PROFESSOR, 4=MASTER, 5=COORDENADOR_MUNICIPAL
vincular() { # token usuario perfil escola
  req POST "/users/$2/assign-profile" "$1" "{\"profileId\":$3,\"schoolId\":$4}"
}
vincular "$MASTER" "$DIR_A" 1 "$ESC_A1"; espera "MASTER vincula Diretora Ana como DIRETOR da EMEF Alfa" 201
vincular "$MASTER" "$DIR_B" 1 "$ESC_B1"; espera "MASTER vincula Diretor Hugo como DIRETOR da EMEF Beta" 201

T_DIR_A=$(login "diretora.a.$RUN@teste.local" "$SENHA")
T_DIR_B=$(login "diretor.b.$RUN@teste.local" "$SENHA")

vincular "$T_DIR_A" "$AUX_A" 2 "$ESC_A1";  espera "Diretora vincula o Secretário como AUXILIAR_ADMIN da própria escola" 201
vincular "$T_DIR_A" "$PROF1" 3 "$ESC_A1";  espera "Diretora vincula a Prof. Carla na própria escola" 201
vincular "$T_DIR_A" "$PROF2" 3 "$ESC_A1";  espera "Diretora vincula o Prof. Davi na própria escola" 201
vincular "$T_DIR_A" "$PROF3" 3 "$ESC_A1";  espera "Diretora vincula a Prof. Eva na própria escola" 201
vincular "$T_DIR_A" "$PROF4" 3 "$ESC_A1";  espera "Diretora vincula a Prof. Íris na própria escola" 201
vincular "$T_DIR_A" "$PROFN" 3 "$ESC_A1";  espera "Diretora vincula a Prof. Nina na própria escola" 201
vincular "$T_DIR_B" "$PROFB" 3 "$ESC_B1";  espera "Diretor Hugo vincula o Prof. Fábio na EMEF Beta" 201

vincular "$T_DIR_B" "$PROFX" 3 "$ESC_A1"
espera "Diretor de OUTRA escola NÃO consegue vincular gente na EMEF Alfa" 403

# Ninguém concede perfil igual ou acima do seu (antes: defeito D22)
vincular "$T_DIR_A" "$DIR_A" 4 "$ESC_A1"
espera "Diretora NÃO consegue se dar o perfil MASTER" 403
vincular "$T_DIR_A" "$PROFX" 1 "$ESC_A1"
espera "Diretora NÃO nomeia outro DIRETOR (perfil igual ao dela)" 403
vincular "$MASTER" "$PROFX" 5 "$ESC_A1"
espera "Coordenador municipal NÃO é vinculado por escola (é por rede, seção 17)" 400

T_PROF1=$(login "prof1.$RUN@teste.local" "$SENHA")
T_PROF2=$(login "prof2.$RUN@teste.local" "$SENHA")
T_PROF3=$(login "prof3.$RUN@teste.local" "$SENHA")
T_PROF4=$(login "prof4.$RUN@teste.local" "$SENHA")
T_PROFB=$(login "profb.$RUN@teste.local" "$SENHA")
T_PROFX=$(login "profx.$RUN@teste.local" "$SENHA")
T_PROFN=$(login "profn.$RUN@teste.local" "$SENHA")
T_AUX_A=$(login "aux.a.$RUN@teste.local" "$SENHA")

req GET "/users?schoolId=$ESC_A1&profileId=3" "$T_DIR_A"
espera "Diretora lista os professores da EMEF Alfa" 200
confere "A lista traz os 5 professores vinculados" "length == 5"
req GET "/users?schoolId=$ESC_A1&profileId=3" "$T_DIR_B"
espera "Diretor de outra escola NÃO lista os professores da EMEF Alfa" 403
req GET /users "$T_DIR_A"
espera "Diretora NÃO lista TODOS os usuários do sistema (precisa dizer a escola)" 403
req GET /users "$T_PROF1"
espera "Professor NÃO lista usuários" 403
req GET "/users?email=profx.$RUN@teste.local" "$T_DIR_A"
espera "Diretora acha um professor recém-cadastrado pelo e-mail" 200
confere "A busca devolve só id, nome, e-mail e disciplina" "length == 1 and (.[0] | keys == [\"email\",\"id\",\"name\",\"subjectId\"])"

# =============================================================================
secao "8. Dados do professor: disciplina e limite de substituições"
# Por quê: sem disciplina o professor não vê nem pega aula nenhuma; o limite
# por semestre é uma regra da escola (antes só dava para mudar no banco).
req PATCH "/users/$PROFN" "$T_PROFN" "{\"subjectId\":$MAT}"
espera "Prof. Nina escolhe a própria disciplina (ela ainda não tinha)" 200
req PATCH "/users/$PROFN" "$T_PROFN" "{\"subjectId\":$POR}"
espera "Depois de escolhida, ela NÃO troca a disciplina sozinha" 403
req PATCH "/users/$PROFN" "$T_DIR_A" "{\"subjectId\":$POR}"
espera "A diretora da escola dela troca a disciplina" 200
# D23: a disciplina vai dentro do token; renovar o token traz a nova
req POST /auth/refresh "$T_PROFN"
T_PROFN_NOVO=$(echo "$BODY" | jq -r '.access_token // empty')
if payload "$T_PROFN_NOVO" | jq -e ".sub.subjectId == $POR" >/dev/null 2>&1; then
  ok "Depois de renovar o token, a Prof. Nina já aparece com a disciplina nova (D23)"
else
  erro "Depois de renovar o token, a disciplina nova deveria vir no token (D23)"
fi
req PATCH "/users/$PROFN" "$T_PROFN" '{"substitutionLimitPerSemester":50}'
espera "Professora NÃO define o próprio limite de substituições" 403
req PATCH "/users/$PROF2" "$T_DIR_A" '{"substitutionLimitPerSemester":1}'
espera "Diretora define limite de 1 substituição por semestre para o Prof. Davi" 200
req PATCH "/users/$PROF2" "$T_DIR_B" '{"substitutionLimitPerSemester":99}'
espera "Diretor de outra escola NÃO mexe no limite do Prof. Davi" 403
req PATCH "/users/$PROF1" "$T_PROF1" '{"phone":"16988887777"}'
espera "Professora atualiza o próprio telefone" 200

# =============================================================================
secao "9. Aula vaga — criação"
# Cada aula ganha um dia diferente (amanhã + N dias), para não dar conflito
# de horário sem querer. Horário: 10h às 11h (UTC).
dia() { date -u -d "+$1 day" +%Y-%m-%dT$2:00:00.000Z; }
criar_aula() { # token escola disciplina criador [dias à frente] [hora início]
  local d=${5:-1} h=${6:-10}
  local hf=$(printf '%02d' $((10#$h + 1)))
  req POST /classes "$1" "{\"schoolId\":$2,\"subjectId\":$3,\"createdByd\":$4,\"statededAt\":\"$(dia "$d" "$h")\",\"finishedAt\":\"$(dia "$d" "$hf")\"}"
}
criar_aula "$T_DIR_A" "$ESC_A1" "$MAT" "$DIR_A" 1
espera "Diretora cria aula vaga de Matemática na EMEF Alfa (aula 1)" 201
AULA1=$(echo "$BODY" | jq -r .id)
confere "O servidor preencheu dia da semana e horário sozinho" ".dayOfWeek != null and .startTime != null and .endTime != null"

criar_aula "$T_PROF1" "$ESC_A1" "$MAT" "$PROF1" 1
espera "Professor NÃO pode criar aula vaga" 403

criar_aula "$T_DIR_B" "$ESC_A1" "$MAT" "$DIR_B" 1
espera "Diretor de outra escola NÃO pode criar aula na EMEF Alfa" 403

# =============================================================================
secao "10. Candidatura, aprovação e rejeição"
req GET "/classes?available=true" "$T_PROF1"
espera "Prof. Carla lista as aulas disponíveis" 200
confere "A aula de Matemática aparece para ela" "[.[] | .id] | index($AULA1) != null"
req GET "/classes?available=true" "$T_PROF3"
confere "Prof. Eva (Português) NÃO vê a aula de Matemática" "[.[] | .id] | index($AULA1) == null"

req POST "/enrollment-requests/request/$AULA1" "$T_PROF3"
espera "Prof. Eva (Português) NÃO pode se candidatar a aula de Matemática" 403

req POST "/enrollment-requests/request/$AULA1" "$T_PROF1"
espera "Prof. Carla se candidata à aula" 201
CAND1=$(echo "$BODY" | jq -r .id)

req POST "/enrollment-requests/request/$AULA1" "$T_PROF1"
espera "Candidatar-se duas vezes na mesma aula é recusado" 400

req POST "/enrollment-requests/request/$AULA1" "$T_PROF2"
espera "Prof. Davi também se candidata (concorrência)" 201
CAND2=$(echo "$BODY" | jq -r .id)

req PATCH "/enrollment-requests/$CAND1/approve" "$T_PROF2"
espera "Professor NÃO pode aprovar candidatura" 403

req PATCH "/enrollment-requests/$CAND1/approve" "$T_DIR_B"
espera "Diretor de outra escola NÃO pode aprovar" 403

req PATCH "/enrollment-requests/$CAND1/approve" "$T_DIR_A"
espera "Diretora aprova a candidatura da Prof. Carla" 200

req GET "/classes/$AULA1" "$T_DIR_A"
confere "A aula deixou de estar disponível depois da aprovação" ".available == false and .enrolledById == $PROF1"

req PATCH "/enrollment-requests/$CAND2/approve" "$T_DIR_A"
espera "Aprovar uma 2ª pessoa para a MESMA aula é recusado (antes: defeito D3)" 400
confere "A mensagem explica que a aula já foi preenchida" '.message | test("já foi preenchida")'
req GET "/classes/$AULA1" "$T_DIR_A"
confere "A aula continua com a Prof. Carla" ".enrolledById == $PROF1"

criar_aula "$T_AUX_A" "$ESC_A1" "$MAT" "$AUX_A" 2
espera "Secretário (AUXILIAR_ADMIN) também cria aula vaga (aula 2)" 201
AULA2=$(echo "$BODY" | jq -r .id)
req POST "/enrollment-requests/request/$AULA2" "$T_PROF2"
espera "Prof. Davi se candidata à aula 2" 201
CAND3=$(echo "$BODY" | jq -r .id)
req GET "/enrollment-requests?classId=$AULA2" "$T_DIR_A"
confere "A lista de candidaturas traz nome do professor, disciplina, escola e data da aula (D15)" \
  '.[0].user.name != null and .[0].class.subjectName != null and .[0].class.schoolName != null and .[0].class.statededAt != null'
req PATCH "/enrollment-requests/$CAND3/reject" "$T_AUX_A" '{"rejectionReason":"Já temos substituto para este dia"}'
espera "Secretário rejeita a candidatura, informando o motivo" 200
req GET "/enrollment-requests/$CAND3" "$T_PROF2"
confere "Status da candidatura ficou REJECTED" ".status == \"REJECTED\""
confere "O motivo da rejeição foi guardado e o professor vê (D20)" '.rejectionReason == "Já temos substituto para este dia"'

req POST "/enrollment-requests/request/$AULA2" "$T_PROF1"
espera "Prof. Carla se candidata à aula 2" 201
CAND4=$(echo "$BODY" | jq -r .id)
req DELETE "/enrollment-requests/$CAND4" "$T_PROF2"
espera "Um professor NÃO pode cancelar a candidatura de outro" 403
req DELETE "/enrollment-requests/$CAND4" "$T_PROF1"
espera "Prof. Carla cancela a própria candidatura" 200

# Conflito de horário: aula no MESMO dia e hora da aula 1, que a Carla já ganhou
criar_aula "$T_DIR_A" "$ESC_A1" "$MAT" "$DIR_A" 1
espera "Diretora cria uma aula no mesmo horário da aula 1" 201
AULA_CONF=$(echo "$BODY" | jq -r .id)
req POST "/enrollment-requests/request/$AULA_CONF" "$T_PROF1"
espera "Prof. Carla é barrada: ela já tem aula nesse horário (conflito)" 400
confere "A mensagem fala em conflito de horário" '.message | test("Conflito")'
req POST "/enrollment-requests/request/$AULA_CONF" "$T_PROF4"
espera "Prof. Íris (livre nesse horário) se candidata normalmente" 201

# Aula que já aconteceu
req POST /classes "$T_DIR_A" "{\"schoolId\":$ESC_A1,\"subjectId\":$MAT,\"createdByd\":$DIR_A,\"statededAt\":\"$(date -u -d '-1 day' +%Y-%m-%dT10:00:00.000Z)\",\"finishedAt\":\"$(date -u -d '-1 day' +%Y-%m-%dT11:00:00.000Z)\"}"
AULA_PASSADA=$(echo "$BODY" | jq -r .id)
req GET "/classes?available=true" "$T_PROF4"
confere "Aula de ontem NÃO aparece na lista do professor" "[.[] | .id] | index($AULA_PASSADA) == null"
req POST "/enrollment-requests/request/$AULA_PASSADA" "$T_PROF4"
espera "Candidatar-se a aula que já aconteceu é recusado" 400

# Limite de substituições (Prof. Davi tem limite 1, definido na seção 8)
criar_aula "$T_DIR_A" "$ESC_A1" "$MAT" "$DIR_A" 3
AULA_L1=$(echo "$BODY" | jq -r .id)
req POST "/enrollment-requests/request/$AULA_L1" "$T_PROF2"; CAND_L1=$(echo "$BODY" | jq -r .id)
req PATCH "/enrollment-requests/$CAND_L1/approve" "$T_DIR_A"
espera "Prof. Davi ganha a 1ª substituição do semestre" 200
criar_aula "$T_DIR_A" "$ESC_A1" "$MAT" "$DIR_A" 4
AULA_L2=$(echo "$BODY" | jq -r .id)
req POST "/enrollment-requests/request/$AULA_L2" "$T_PROF2"
espera "A 2ª candidatura passa do limite (1) e é recusada" 400
req GET "/enrollment-requests/substitution-limit/$PROF2" "$T_PROF2"
espera "Professor consulta o próprio limite de substituições" 200
confere "Mostra 1 de 1 e que não pode mais se candidatar" ".current == 1 and .limit == 1 and .canApply == false"
req GET "/enrollment-requests/substitution-limit/$PROF2" "$T_PROF1"
espera "Professor NÃO vê o limite de outro professor" 403

# =============================================================================
secao "11. Prioridade de vagas por grupos"
# A regra (definida com a escola):
#  - escola SEM grupos: todo professor (que passou na regra de município) vê na hora;
#  - grupo de prioridade 0 recebe primeiro; o de prioridade 1 depois, e assim por diante,
#    cada um quando passa o SEU tempo de espera;
#  - escola COM grupos: quem não está em grupo nenhum é o ÚLTIMO a receber.
criar_aula "$T_DIR_A" "$ESC_A1" "$MAT" "$DIR_A" 5
espera "Aula 3 criada ANTES de a escola ter grupos" 201
AULA3=$(echo "$BODY" | jq -r .id)
req GET "/classes?available=true" "$T_PROF4"
confere "Escola sem grupos: Prof. Íris (sem grupo) vê a aula 3 na hora" "[.[] | .id] | index($AULA3) != null"

req POST "/schools/$ESC_A1/teacher-groups" "$T_DIR_A" '{"name":"Professores da casa","priority":0,"delayMinutes":0}'
espera "Diretora cria o grupo de prioridade 0 'Professores da casa' (recebe na hora)" 201
GRUPO0=$(echo "$BODY" | jq -r '.groups[] | select(.name=="Professores da casa") | .id')
req POST "/schools/$ESC_A1/teacher-groups" "$T_DIR_A" '{"name":"Substitutos frequentes","priority":1,"delayMinutes":60}'
espera "Diretora cria o grupo de prioridade 1 'Substitutos frequentes' (60 min)" 201
GRUPO1=$(echo "$BODY" | jq -r '.groups[] | select(.name=="Substitutos frequentes") | .id')
req POST "/schools/$ESC_A1/teacher-groups" "$T_DIR_A" '{"name":"Errado","priority":2,"delayMinutes":30}'
espera "Prioridade 2 abrindo ANTES da prioridade 1 (30 < 60 min) é recusado" 400
req PUT "/schools/$ESC_A1/teacher-groups/$GRUPO0/members" "$T_DIR_A" "{\"professorIds\":[$PROF1]}"
espera "Prof. Carla vai para o grupo de prioridade 0" 200
req PUT "/schools/$ESC_A1/teacher-groups/$GRUPO1/members" "$T_DIR_A" "{\"professorIds\":[$PROFN]}"
espera "Prof. Nina vai para o grupo de prioridade 1" 200
req GET "/schools/$ESC_A1/teacher-groups" "$T_DIR_A"
confere "Quem está sem grupo recebe depois de 60 min (o grupo mais demorado)" ".ungroupedEffectiveDelayMinutes == 60"

req POST "/schools/$ESC_A1/teacher-groups" "$T_DIR_B" '{"name":"Invasores","delayMinutes":0}'
espera "Diretor de outra escola NÃO mexe nos grupos da EMEF Alfa" 403

req PATCH "/users/$PROFN" "$T_DIR_A" "{\"subjectId\":$MAT}"
criar_aula "$T_DIR_A" "$ESC_A1" "$MAT" "$DIR_A" 6
espera "Diretora cria a aula 4 (agora a escola tem grupos)" 201
AULA4=$(echo "$BODY" | jq -r .id)

req GET "/classes?available=true" "$T_PROF1"
confere "Prof. Carla (prioridade 0, espera 0) VÊ a aula 4 na hora" "[.[] | .id] | index($AULA4) != null"
req GET "/classes?available=true" "$T_PROFN"
confere "Prof. Nina (prioridade 1, espera 60 min) NÃO vê a aula 4 ainda" "[.[] | .id] | index($AULA4) == null"
req POST "/enrollment-requests/request/$AULA4" "$T_PROFN"
espera "Prof. Nina tentando direto pelo número da aula também é barrada" 403
confere "A mensagem diz o grupo e a prioridade dela" '.message | test("prioridade 1")'
req GET "/classes?available=true" "$T_PROF4"
confere "Prof. Íris (sem grupo) NÃO vê a aula 4: ela é a última" "[.[] | .id] | index($AULA4) == null"
req POST "/enrollment-requests/request/$AULA4" "$T_PROF4"
espera "Prof. Íris tentando direto é barrada" 403
confere "A mensagem explica que quem está sem grupo recebe depois de todos" '.message | test("sem grupo")'

req PATCH "/schools/$ESC_A1/teacher-groups/$GRUPO1" "$T_DIR_A" '{"delayMinutes":0}'
espera "Diretora muda o grupo de prioridade 1 para receber na hora" 200
req GET "/classes?available=true" "$T_PROFN"
confere "Agora a Prof. Nina (prioridade 1) vê a aula 4" "[.[] | .id] | index($AULA4) != null"
req GET "/classes?available=true" "$T_PROF4"
confere "E a Prof. Íris (sem grupo) também (nenhum grupo espera mais)" "[.[] | .id] | index($AULA4) != null"
req PATCH "/schools/$ESC_A1/priority-settings" "$T_DIR_A" '{"ungroupedDelayMinutes":120}'
espera "Diretora define espera extra de 120 min para quem está sem grupo" 200
req GET "/classes?available=true" "$T_PROF4"
confere "Prof. Íris (sem grupo) volta a NÃO ver a aula 4" "[.[] | .id] | index($AULA4) == null"

# Outro município / sem vínculo (antes: defeito D4 — viam tudo na hora)
req GET "/classes?available=true" "$T_PROFB"
confere "Prof. Fábio (Município B, sem interconexão) NÃO vê a aula 4" "[.[] | .id] | index($AULA4) == null"
req POST "/enrollment-requests/request/$AULA4" "$T_PROFB"
espera "Prof. Fábio (Município B) é barrado ao tentar direto" 403
req GET "/classes?available=true" "$T_PROFX"
confere "Prof. Gil (sem vínculo nenhum) NÃO vê a aula 4" "[.[] | .id] | index($AULA4) == null"
req POST "/enrollment-requests/request/$AULA4" "$T_PROFX"
espera "Prof. Gil (sem vínculo) é barrado ao tentar direto" 403

# Exclusão pelo próprio professor vence tudo
req POST /professor-preferences/school-exclusions "$T_PROF1" "{\"schoolId\":$ESC_A1}"
espera "Prof. Carla exclui a EMEF Alfa das suas vagas" 201
req POST "/enrollment-requests/request/$AULA4" "$T_PROF1"
espera "Com a escola excluída, ela é barrada mesmo estando no grupo de prioridade 0" 403
req DELETE "/professor-preferences/school-exclusions/$ESC_A1" "$T_PROF1"
espera "Prof. Carla desfaz a exclusão" 200

# Interconexão entre municípios (direcional)
req PATCH "/schools/$ESC_A1/priority-settings" "$T_DIR_A" "{\"acceptedNetworkIds\":[$REDE_B]}"
espera "Escola NÃO pode aceitar um município que a própria rede não liberou" 400
req PUT "/networks/$REDE_A/interconnections" "$T_DIR_A" "{\"allowedNetworkIds\":[$REDE_B]}"
espera "Diretor NÃO configura interconexão entre municípios" 403
req PUT "/networks/$REDE_A/interconnections" "$MASTER" "{\"allowedNetworkIds\":[$REDE_B]}"
espera "MASTER libera: vagas do Município A visíveis para professores do Município B" 200
req GET "/networks/$REDE_A/interconnections" "$MASTER"
confere "A interconexão traz o nome do Município B" "[.interconnections[] | .networkId] | index($REDE_B) != null"
req POST "/enrollment-requests/request/$AULA4" "$T_PROFB"
espera "Prof. Fábio passou na regra de município, mas está sem grupo: ainda espera" 403
req PATCH "/schools/$ESC_A1/priority-settings" "$T_DIR_A" '{"ungroupedDelayMinutes":0}'
req GET "/classes?available=true" "$T_PROFB"
confere "Sem espera extra, o Prof. Fábio (Município B) vê a aula 4" "[.[] | .id] | index($AULA4) != null"
confere "E vê o NOME da escola do outro município (antes vinha em branco)" "[.[] | select(.id == $AULA4) | .school.name] | .[0] != null"

# Preferências do professor enxergam outros municípios (antes: defeito D5)
req GET /professor-preferences/options "$T_PROFB"
espera "Professor lista redes e escolas para escolher preferências" 200
confere "A lista inclui o Município A (outro município)" "[.networks[] | .id] | index($REDE_A) != null"
req POST /professor-preferences/network-interests "$T_PROFB" "{\"networkId\":$REDE_A}"
espera "Prof. Fábio declara interesse no Município A" 201
req GET /professor-preferences "$T_PROFB"
confere "O interesse aparece com o nome do município" "[.networkInterests[] | .networkName] | index(\"Município A $RUN\") != null"

# =============================================================================
secao "12. Jornada docente e teto municipal de carga horária"
HOJE=$(date -u +%Y-%m-01)
MES=$(date -u +%Y-%m)
req POST /teacher-workload-records "$T_DIR_A" "{\"userId\":$PROF1,\"schoolId\":$ESC_A1,\"workloadTypeId\":4,\"hours\":6,\"validFrom\":\"$HOJE\"}"
espera "Diretora lança 6h de carga SUPLEMENTAR para a Prof. Carla (teto 10h)" 201
req POST /teacher-workload-records "$T_DIR_A" "{\"userId\":$PROF1,\"schoolId\":$ESC_A1,\"workloadTypeId\":4,\"hours\":6,\"validFrom\":\"$HOJE\"}"
espera "Mais 6h (total 12h > 10h) é RECUSADO pelo teto do município" 400
req POST /teacher-workload-records "$T_DIR_A" "{\"userId\":$PROF1,\"schoolId\":$ESC_A1,\"workloadTypeId\":1,\"hours\":20,\"validFrom\":\"$HOJE\"}"
espera "20h de AULA (tipo sem teto definido) é aceito" 201
req POST /teacher-workload-records "$T_PROF1" "{\"userId\":$PROF1,\"schoolId\":$ESC_A1,\"workloadTypeId\":1,\"hours\":5,\"validFrom\":\"$HOJE\"}"
espera "Professor NÃO lança a própria jornada" 403
req GET /teacher-workload-records/me "$T_PROF1"
espera "Professor vê a própria jornada" 200
confere "Ela tem 2 lançamentos" "length == 2"

# =============================================================================
secao "13. Fechamento mensal de ponto"
req POST /monthly-closing-reports/generate "$T_DIR_A" "{\"userId\":$PROF1,\"schoolId\":$ESC_A1,\"referenceMonth\":\"$MES\"}"
espera "Diretora gera o relatório do mês da Prof. Carla" 201
REL=$(echo "$BODY" | jq -r .id)
confere "Relatório nasce como DRAFT (rascunho)" ".status == \"DRAFT\""
req PATCH "/monthly-closing-reports/$REL/close" "$T_DIR_A"
espera "Não dá para FECHAR sem REVISAR antes" 400
req PATCH "/monthly-closing-reports/$REL/review" "$T_DIR_A"
espera "Diretora revisa o relatório" 200
req PATCH "/monthly-closing-reports/$REL/close" "$T_DIR_A"
espera "Diretora fecha o relatório" 200
req POST /monthly-closing-reports/generate "$T_DIR_A" "{\"userId\":$PROF1,\"schoolId\":$ESC_A1,\"referenceMonth\":\"$MES\"}"
espera "Gerar de novo um relatório FECHADO é recusado" 400
req PATCH "/monthly-closing-reports/$REL/reopen" "$T_DIR_A" '{"justification":"curta"}'
espera "Reabrir com justificativa curta (< 10 letras) é recusado" 400
req PATCH "/monthly-closing-reports/$REL/reopen" "$T_DIR_A" '{"justification":"Horas lançadas em duplicidade no dia 12"}'
espera "Reabrir com justificativa válida volta para DRAFT" 200
req GET "/monthly-closing-reports/$REL" "$T_PROF1"
espera "A própria professora consegue ver o relatório dela" 200
req GET "/monthly-closing-reports/$REL" "$T_PROF2"
if [ "$STATUS" = "200" ]; then erro "Outro professor NÃO deveria ver o relatório da Prof. Carla"; else ok "Outro professor não vê o relatório da colega (HTTP $STATUS)"; fi

# =============================================================================
secao "14. Indicadores e auditoria"
req GET "/classes/coverage-stats?schoolId=$ESC_A1" "$T_DIR_A"
espera "Diretora vê o indicador de cobertura da escola" 200
confere "Indicador traz totalVagas, cobertas, taxaCobertura e nivel" "has(\"totalVagas\") and has(\"cobertas\") and has(\"taxaCobertura\") and has(\"nivel\")"
DOW=$(date -u -d "+1 day" +%w)
req GET "/classes/coverage-stats?schoolId=$ESC_A1&dayOfWeek=$DOW" "$T_DIR_A"
confere "O filtro por dia da semana encontra as aulas criadas pela API" ".totalVagas > 0"
req GET "/classes/coverage-stats?schoolId=$ESC_A1" "$T_DIR_B"
espera "Diretor de outra escola NÃO vê o indicador da EMEF Alfa" 403

req GET "/audit-log/network/$REDE_A" "$MASTER"
espera "MASTER lê a auditoria do Município A" 200
confere "A auditoria registrou ações (jornada/fechamento/reabertura)" "length > 0"
req GET "/audit-log/network/$REDE_A" "$T_DIR_A"
espera "Diretor NÃO lê a auditoria" 403

# =============================================================================
secao "15. Isolamento entre municípios (RLS)"
req GET /schools "$T_DIR_B"
confere "Diretor do Município B NÃO enxerga escolas do Município A" "[.[] | .id] | index($ESC_A1) == null"
req GET "/teacher-workload-records?schoolId=$ESC_A1" "$T_DIR_B"
espera "Diretor do Município B NÃO lê a jornada da EMEF Alfa" 403
req GET /networks "$T_DIR_B"
confere "Diretor do Município B NÃO enxerga a rede do Município A" "[.[] | .id] | index($REDE_A) == null"

# =============================================================================
secao "16. Senhas"
req PATCH /auth/change-password "$T_PROF3" "{\"currentPassword\":\"$SENHA\",\"newPassword\":\"123\"}"
espera "Senha nova curta demais (< 8) é recusada" 400
req PATCH /auth/change-password "$T_PROF3" "{\"currentPassword\":\"errada\",\"newPassword\":\"NovaSenha@2026\"}"
if [ "$STATUS" = "200" ]; then erro "Trocar senha com a senha ATUAL errada deveria ser recusado"; else ok "Senha atual errada é recusada (HTTP $STATUS)"; fi
req PATCH /auth/change-password "$T_PROF3" "{\"currentPassword\":\"$SENHA\",\"newPassword\":\"NovaSenha@2026\"}"
espera "Prof. Eva troca a própria senha" 200
[ -n "$(login "prof3.$RUN@teste.local" "NovaSenha@2026")" ] && ok "Login com a senha nova funciona" || erro "Login com a senha nova"

req POST "/users/$PROF2/reset-password" "$T_DIR_A"
espera "Diretora redefine a senha do Prof. Davi" 201
confere "Sem servidor de e-mail configurado, a resposta avisa que o e-mail não saiu" ".emailSent == false"
TEMP=$(echo "$BODY" | jq -r .tempPassword)
confere "A senha temporária tem pelo menos 8 caracteres" ".tempPassword | length >= 8"
[ -n "$(login "prof2.$RUN@teste.local" "$TEMP")" ] && ok "Login com a senha temporária funciona" || erro "Login com a senha temporária"
req POST "/users/$PROF2/reset-password" "$T_DIR_B"
espera "Diretor de outra escola NÃO redefine a senha do Prof. Davi" 403
MASTER_ID=$(curl -s "$API/users?email=$MASTER_EMAIL" -H "Authorization: Bearer $MASTER" | jq -r '.[0].id')
req POST "/users/$MASTER_ID/reset-password" "$T_DIR_A"
espera "Diretora NÃO redefine a senha do MASTER" 403
req POST "/users/$DIR_A/reset-password" "$T_AUX_A"
espera "Secretário NÃO redefine a senha da própria diretora (só de perfis abaixo do seu)" 403
req PATCH "/users/$DIR_A" "$T_AUX_A" '{"email":"tomada@teste.local"}'
espera "Secretário NÃO altera a conta da diretora" 403

# =============================================================================
secao "17. Coordenador municipal (gerencia todas as escolas de um município)"
COORD=$(criar_usuario "Coordenadora Lia $RUN" "coord.$RUN@teste.local")
req POST /network-coordinators "$MASTER" "{\"userId\":$COORD,\"networkId\":$REDE_A}"
espera "MASTER nomeia a Lia coordenadora do Município A" 201
req POST /network-coordinators "$MASTER" "{\"userId\":$COORD,\"networkId\":$REDE_A}"
espera "Nomear de novo para a mesma rede é recusado" 400
req POST /network-coordinators "$T_DIR_A" "{\"userId\":$PROFX,\"networkId\":$REDE_A}"
espera "Diretor NÃO nomeia coordenador" 403
req GET /network-coordinators "$MASTER"
confere "A lista de coordenadores traz a Lia no Município A" "[.[] | select(.userId == $COORD and .networkId == $REDE_A)] | length == 1"

T_COORD=$(login "coord.$RUN@teste.local" "$SENHA")
req GET /networks "$T_COORD"
confere "Ela enxerga o Município A e NÃO o B" "([.[] | .id] | index($REDE_A) != null) and ([.[] | .id] | index($REDE_B) == null)"
req POST /schools "$T_COORD" "{\"name\":\"EMEF Gama $RUN\",\"networkId\":$REDE_A}"
espera "Coordenadora cria uma escola nova no Município A" 201
ESC_A2=$(echo "$BODY" | jq -r .id)
req POST /schools "$T_COORD" "{\"name\":\"Invasora $RUN\",\"networkId\":$REDE_B}"
espera "Coordenadora NÃO cria escola no Município B" 403

T_COORD=$(login "coord.$RUN@teste.local" "$SENHA")
criar_aula "$T_COORD" "$ESC_A1" "$MAT" "$COORD" 8
espera "Coordenadora cria aula vaga na EMEF Alfa" 201
AULA5=$(echo "$BODY" | jq -r .id)
criar_aula "$T_COORD" "$ESC_A2" "$MAT" "$COORD" 9
espera "Coordenadora cria aula vaga também na escola nova (EMEF Gama)" 201
AULA_GAMA=$(echo "$BODY" | jq -r .id)

# Cidade de residência: sem contrato em escola nenhuma, o município onde o
# professor mora conta como o dele ("contrato prevalece sobre residência").
RESID=$(criar_usuario "Prof. Rui (sem contrato) $RUN" "rui.$RUN@teste.local" "$MAT")
T_RESID=$(login "rui.$RUN@teste.local" "$SENHA")
req GET "/classes?available=true" "$T_RESID"
confere "Sem contrato e sem cidade, o Prof. Rui NÃO vê a vaga da EMEF Gama" "[.[] | .id] | index($AULA_GAMA) == null"
req PATCH "/users/$RESID" "$T_RESID" "{\"residenceNetworkId\":$REDE_A}"
espera "Prof. Rui informa que mora no Município A" 200
req GET "/classes?available=true" "$T_RESID"
confere "Morando no Município A, ele passa a ver a vaga da EMEF Gama" "[.[] | .id] | index($AULA_GAMA) != null"
req GET /professor-preferences "$T_RESID"
confere "As preferências mostram a cidade e que ele não tem contrato" ".residenceNetworkId == $REDE_A and .hasContract == false"
req PATCH "/users/$RESID" "$T_RESID" '{"residenceNetworkId":999999}'
espera "Município inexistente é recusado" 400
req PATCH "/users/$RESID" "$T_RESID" '{"residenceNetworkId":null}'
espera "Prof. Rui apaga a cidade de residência" 200
criar_aula "$T_COORD" "$ESC_B1" "$MAT" "$COORD" 9
espera "Coordenadora NÃO cria aula no Município B" 403

req POST "/enrollment-requests/request/$AULA5" "$T_PROF4"
CAND5=$(echo "$BODY" | jq -r .id)
req GET "/enrollment-requests?status=PENDING" "$T_COORD"
espera "Coordenadora lista candidaturas pendentes do município" 200
confere "Ela vê a candidatura da Prof. Íris" "[.[] | .id] | index($CAND5) != null"
req PATCH "/enrollment-requests/$CAND5/approve" "$T_COORD"
espera "Coordenadora aprova a candidatura" 200

vincular "$T_COORD" "$PROFX" 1 "$ESC_A2"
espera "Coordenadora nomeia um DIRETOR para a EMEF Gama" 201
vincular "$T_COORD" "$PROFX" 4 "$ESC_A2"
espera "Coordenadora NÃO concede o perfil MASTER" 403

req POST /workload-policies "$T_COORD" "{\"networkId\":$REDE_A,\"workloadTypeId\":5,\"maxHoursPerWeek\":8}"
espera "Coordenadora cria política de carga do Município A" 201
req POST /workload-policies "$T_COORD" "{\"networkId\":$REDE_B,\"workloadTypeId\":5,\"maxHoursPerWeek\":8}"
espera "Coordenadora NÃO cria política no Município B" 403
req PUT "/networks/$REDE_A/interconnections" "$T_COORD" "{\"allowedNetworkIds\":[$REDE_B]}"
espera "Coordenadora configura as interconexões do Município A" 200
req PUT "/networks/$REDE_B/interconnections" "$T_COORD" "{\"allowedNetworkIds\":[$REDE_A]}"
espera "Coordenadora NÃO configura as interconexões do Município B" 403
req GET "/audit-log/network/$REDE_A" "$T_COORD"
espera "Coordenadora lê a auditoria do Município A" 200
req GET "/audit-log/network/$REDE_B" "$T_COORD"
espera "Coordenadora NÃO lê a auditoria do Município B" 403
req GET "/schools/$ESC_A1/teacher-groups" "$T_COORD"
espera "Coordenadora vê os grupos de prioridade da EMEF Alfa" 200

req DELETE "/network-coordinators/$COORD/$REDE_A" "$MASTER"
espera "MASTER remove a coordenação da Lia" 200
criar_aula "$T_COORD" "$ESC_A1" "$MAT" "$COORD" 10
espera "Sem coordenação, ela não cria mais aula na EMEF Alfa" 403

# =============================================================================
secao "18. Segurança (defeitos D1, D2, D21 e D22 — corrigidos)"
req PATCH "/users/$DIR_A" "$T_PROFX" '{"phone":"00000000"}'
espera "Um usuário qualquer NÃO altera os dados de outro (D1)" 403
req PATCH "/users/$DIR_A" "$T_DIR_A" '{"password":"tomada123"}'
espera "Senha NÃO é trocada pelo PATCH /users (só pela troca de senha)" 400
req DELETE "/users/$PROF1" "$T_DIR_A"
espera "Diretora NÃO apaga a conta de ninguém (só o MASTER) (D1)" 403
req POST /profile "$T_PROFX" "{\"name\":\"PERFIL-INDEVIDO-$RUN\"}"
espera "Um usuário qualquer NÃO cria perfis (D2)" 403
req PATCH /profile/4 "$T_DIR_A" '{"name":"HACK"}'
espera "Diretora NÃO renomeia o perfil MASTER (D2)" 403
req GET /profile "$T_PROF1"
espera "Ler a lista de perfis continua liberado" 200
criar_aula "$T_DIR_A" "$ESC_A1" "$MAT" "$DIR_A" 11; AULA_X=$(echo "$BODY" | jq -r .id)
req POST "/classes/$AULA_X/enroll" "$T_PROF3"
espera "A rota antiga de inscrição direta não existe mais (D21)" 404
req GET "/classes/$AULA_X" "$T_DIR_A"
confere "A aula continua livre" ".available == true and .enrolledById == null"

# =============================================================================
secao "19. Desvincular professor"
req POST "/users/$PROF3/unassign-profile" "$T_DIR_A" "{\"profileId\":3,\"schoolId\":$ESC_A1}"
espera "Diretora desvincula a Prof. Eva da escola" 201
req GET "/users?schoolId=$ESC_A1&profileId=3" "$T_DIR_A"
confere "A lista de professores da escola caiu para 4" "length == 4"

# =============================================================================
secao "20. Gov.br (ainda não implementado — deve responder 'em desenvolvimento')"
req GET /auth/govbr-auth-url ""
espera "Gov.br responde 501 (não implementado)" 501

# =============================================================================
echo
echo "════════════════════════════════════════════════════════"
echo "  Resultado: $PASS passaram, $FAIL falharam"
echo "  Dados desta execução usam o sufixo $RUN"
echo "════════════════════════════════════════════════════════"
if [ "$FAIL" -gt 0 ]; then
  echo "  Falhas:"
  for f in "${FALHAS[@]}"; do echo "   - $f"; done
  exit 1
fi
