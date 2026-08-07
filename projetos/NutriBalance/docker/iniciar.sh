#!/bin/sh
# Preparo do Apache antes de subir o servidor.
#
# Roda a cada partida do container, e nao so na build da imagem. A diferenca
# importa: mudar uma variavel de ambiente no painel reinicia o container a
# partir da imagem que ja existe, sem reconstruir. Um ajuste feito so no
# Dockerfile nao vale nessa hora.

set -e

# --- 1. Um unico MPM ---------------------------------------------------
# MPM e o modulo que decide como o Apache atende varias requisicoes ao mesmo
# tempo. Ele aceita um so: encontrando dois, aborta com
# "AH00534: Configuration error: More than one MPM loaded" e o container entra
# em loop de reinicio sem nunca responder.
#
# O mpm_prefork e o exigido pelo mod_php. Desligar os concorrentes aqui, a cada
# start, deixa o container imune a qualquer coisa que os tenha habilitado —
# seja uma imagem antiga em cache, seja o proprio ambiente da hospedagem.
a2dismod mpm_event mpm_worker >/dev/null 2>&1 || true
a2enmod mpm_prefork >/dev/null 2>&1 || true

# Deixa registrado no log qual MPM ficou. Se o AH00534 voltar, esta linha diz
# na hora se sobrou mais de um.
echo "[nutribalance] MPM carregado:$(find /etc/apache2/mods-enabled -name 'mpm_*.load' -exec basename {} .load \; | tr '\n' ' ')"

# --- 2. Porta ----------------------------------------------------------
# O Railway sorteia uma porta a cada deploy e a entrega na variavel $PORT; a
# imagem do Apache vem fixa na 80. Sem esta troca o container sobe, o log nao
# mostra erro nenhum, e mesmo assim nada responde — a hospedagem bate numa
# porta onde nao ha ninguem escutando.
PORTA="${PORT:-80}"

sed -i "s/^Listen 80$/Listen ${PORTA}/" /etc/apache2/ports.conf
sed -i "s/<VirtualHost \*:80>/<VirtualHost *:${PORTA}>/" /etc/apache2/sites-available/000-default.conf

echo "[nutribalance] Apache subindo na porta ${PORTA}"

# --- 3. Sobe -----------------------------------------------------------
# exec substitui o shell pelo Apache: assim o Apache vira o processo principal
# do container e recebe direto o sinal de parada na hora do deploy novo.
exec apache2-foreground
